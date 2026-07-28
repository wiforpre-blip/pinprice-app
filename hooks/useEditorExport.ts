import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { useTranslation } from '@/contexts/LanguageContext';
import { upsertEditorDraft } from '@/services/draft.service';
import { prepareNamedExportUri } from '@/services/export.service';
import { loadIsUnlocked } from '@/services/tier.service';
import type { EditorDraftSnapshot } from '@/types/draft';
import type { ExportAction, Size } from '@/types/editor';
import { getExportBasenameKey } from '@/utils/exportFilename';
import { shouldRenderWatermark } from '@/utils/watermark';

type UseEditorExportOptions = {
  imageUri: string | null;
  /** Source image pixel size — used to force captureRef output resolution. */
  imageSize?: Size | null;
  /** When reopening a Recent draft, reuse this id on the next save/share. */
  initialDraftId?: string | null;
  /** Latest editor session fields for local draft persistence after save/share. */
  getDraftSnapshot?: () => EditorDraftSnapshot | null;
  /** Called after a successful save or share (not on permission/share errors). */
  onExportSuccess?: () => void;
};

export function useEditorExport({
  imageUri,
  imageSize = null,
  getDraftSnapshot,
  initialDraftId = null,
  onExportSuccess,
}: UseEditorExportOptions) {
  const { t } = useTranslation();
  const exportRef = useRef<View>(null);
  const activeDraftIdRef = useRef<string | null>(initialDraftId);
  const draftHistoryWrittenRef = useRef(false);
  const gallerySaveCountByBaseRef = useRef<Record<string, number>>({});
  const [isPreviewing, setIsPreviewing] = useState(false);
  /** Available preview host size (tag export fits an aspect-matched capture view inside this). */
  const [previewSize, setPreviewSize] = useState<Size>({ width: 0, height: 0 });
  const [exportAction, setExportAction] = useState<ExportAction | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [hasSavedToGallery, setHasSavedToGallery] = useState(false);
  const [isCaptureImageLoaded, setIsCaptureImageLoaded] = useState(false);
  /** Local Pro unlock flag — free by default until a future monetization path sets it. */
  const [isUnlocked, setIsUnlocked] = useState(false);
  const exportMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExporting = exportAction !== null;
  const showWatermark = shouldRenderWatermark(isUnlocked);

  const clearExportMessageTimer = useCallback(() => {
    if (exportMessageTimerRef.current) {
      clearTimeout(exportMessageTimerRef.current);
      exportMessageTimerRef.current = null;
    }
  }, []);

  const showExportMessage = useCallback(
    (message: string, options?: { autoDismissMs?: number }) => {
      clearExportMessageTimer();
      setExportMessage(message);

      if (options?.autoDismissMs) {
        exportMessageTimerRef.current = setTimeout(() => {
          setExportMessage(null);
          exportMessageTimerRef.current = null;
        }, options.autoDismissMs);
      }
    },
    [clearExportMessageTimer],
  );

  useEffect(() => {
    if (initialDraftId) {
      activeDraftIdRef.current = initialDraftId;
    }
  }, [initialDraftId]);

  useEffect(() => {
    let isMounted = true;

    void loadIsUnlocked().then((unlocked) => {
      if (isMounted) {
        setIsUnlocked(unlocked);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      clearExportMessageTimer();
    };
  }, [clearExportMessageTimer]);

  const persistDraftAfterExport = useCallback(
    async (exportFilename: string) => {
      if (!imageUri) {
        return;
      }

      const snapshot = getDraftSnapshot?.() ?? null;

      if (!snapshot) {
        return;
      }

      const saved = await upsertEditorDraft({
        id: activeDraftIdRef.current ?? undefined,
        sourceImageUri: imageUri,
        filename: exportFilename || snapshot.filename,
        editorMode: snapshot.editorMode,
        tags: snapshot.tags,
        panelMarkers: snapshot.panelMarkers,
      });

      if (saved) {
        activeDraftIdRef.current = saved.id;
      }
    },
    [getDraftSnapshot, imageUri],
  );

  /** Home Recent history: write once per editor session (first successful save only). */
  const persistDraftHistoryOnce = useCallback(
    async (exportFilename: string) => {
      if (draftHistoryWrittenRef.current) {
        return;
      }

      await persistDraftAfterExport(exportFilename);
      draftHistoryWrittenRef.current = true;
    },
    [persistDraftAfterExport],
  );

  const openPreview = useCallback(() => {
    if (!imageUri) {
      return;
    }

    clearExportMessageTimer();
    setExportMessage(null);
    // Drop stale host size so the aspect-matched capture view remeasures before save/share.
    setPreviewSize({ width: 0, height: 0 });
    setIsCaptureImageLoaded(false);
    setIsPreviewing(true);

    // Re-check unlock so export watermark gating stays current when opening preview.
    void loadIsUnlocked().then(setIsUnlocked);
  }, [clearExportMessageTimer, imageUri]);

  const closePreview = useCallback(() => {
    if (exportAction !== null) {
      return;
    }

    clearExportMessageTimer();
    setExportMessage(null);
    setIsPreviewing(false);
    setPreviewSize({ width: 0, height: 0 });
    setIsCaptureImageLoaded(false);
  }, [clearExportMessageTimer, exportAction]);

  const handlePreviewLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setPreviewSize((current) =>
      current.width === width && current.height === height ? current : { width, height },
    );
  }, []);

  const handleCaptureImageLoad = useCallback((loaded: boolean) => {
    setIsCaptureImageLoaded(loaded);
  }, []);

  const captureExportView = useCallback(async () => {
    if (!exportRef.current) {
      throw new Error(t('errors.exportViewNotReady'));
    }

    if (!imageSize || imageSize.width <= 0 || imageSize.height <= 0) {
      throw new Error(t('errors.exportViewNotReady'));
    }
    if (!isCaptureImageLoaded) {
      throw new Error(t('errors.exportViewNotReady'));
    }

    // Force output to source pixel size. Capture view is laid out at imageSize/PixelRatio
    // so the photo renders near-native before this resize step.
    return captureRef(exportRef, {
      format: 'jpg',
      height: Math.round(imageSize.height),
      quality: 0.9,
      result: 'tmpfile',
      width: Math.round(imageSize.width),
    });
  }, [imageSize, isCaptureImageLoaded, t]);

  const captureNamedExport = useCallback(
    async (exportFilename: string, copyIndex: number = 0) => {
      const exportedUri = await captureExportView();
      return prepareNamedExportUri(exportedUri, exportFilename, copyIndex, 'jpg');
    },
    [captureExportView],
  );

  const takeNextGalleryCopyIndex = useCallback((exportFilename: string) => {
    const baseKey = getExportBasenameKey(exportFilename);
    const nextIndex = gallerySaveCountByBaseRef.current[baseKey] ?? 0;
    gallerySaveCountByBaseRef.current[baseKey] = nextIndex + 1;
    return nextIndex;
  }, []);

  const handleSaveImage = useCallback(
    async (exportFilename: string) => {
      if (exportAction !== null) {
        return;
      }

      setExportAction('save');
      clearExportMessageTimer();
      setExportMessage(null);

      try {
        const permission = await MediaLibrary.requestPermissionsAsync(true);

        if (!permission.granted) {
          showExportMessage(t('permissions.photoSaveRequired'));
          return;
        }

        const copyIndex = takeNextGalleryCopyIndex(exportFilename);
        const namedExportUri = await captureNamedExport(exportFilename, copyIndex);
        await MediaLibrary.saveToLibraryAsync(namedExportUri);
        setHasSavedToGallery(true);
        showExportMessage(t('export.saved'), { autoDismissMs: 2000 });
        await persistDraftHistoryOnce(exportFilename);
        onExportSuccess?.();
      } catch {
        showExportMessage(t('errors.saveFailed'));
      } finally {
        setExportAction(null);
      }
    },
    [
      captureNamedExport,
      clearExportMessageTimer,
      exportAction,
      onExportSuccess,
      persistDraftHistoryOnce,
      showExportMessage,
      t,
      takeNextGalleryCopyIndex,
    ],
  );

  const handleShareImage = useCallback(
    async (exportFilename: string) => {
      if (exportAction !== null) {
        return;
      }

      setExportAction('share');
      clearExportMessageTimer();
      setExportMessage(null);

      try {
        const canShare = await Sharing.isAvailableAsync();

        if (!canShare) {
          showExportMessage(t('errors.sharingUnavailable'));
          return;
        }

        // Share keeps a stable display name (no (n) suffix); gallery duplicates use save path.
        const namedExportUri = await captureNamedExport(exportFilename, 0);
        await Sharing.shareAsync(namedExportUri, {
          dialogTitle: t('export.shareDialogTitle'),
          mimeType: 'image/jpeg',
        });
        onExportSuccess?.();
      } catch {
        showExportMessage(t('errors.shareFailed'));
      } finally {
        setExportAction(null);
      }
    },
    [captureNamedExport, clearExportMessageTimer, exportAction, onExportSuccess, showExportMessage, t],
  );
  const applyUnlock = useCallback((unlocked: boolean) => {
    setIsUnlocked(unlocked);
  }, []);

  return {
    applyUnlock,
    captureExportView,
    closePreview,
    exportAction,
    exportMessage,
    exportRef,
    handlePreviewLayout,
    handleCaptureImageLoad,
    handleSaveImage,
    handleShareImage,
    hasSavedToGallery,
    isExporting,
    isPreviewing,
    openPreview,
    previewSize,
    showWatermark,
  };
}
