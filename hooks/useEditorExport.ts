import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { useTranslation } from '@/contexts/LanguageContext';
import { upsertEditorDraft } from '@/services/draft.service';
import { deleteExportTempFile, prepareNamedExportUri } from '@/services/export.service';
import {
  REVIEW_PROMPT_DELAY_AFTER_SAVE_MS,
  REVIEW_PROMPT_DELAY_AFTER_SHARE_MS,
  maybeRequestAutomaticReview,
  recordSuccessfulExport,
} from '@/services/review.service';
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
  /** RevenueCat-backed Pro entitlement; free by default when unavailable. */
  const [isUnlocked, setIsUnlocked] = useState(false);
  const exportMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Save+Share from the same Preview count as one successful export job. */
  const previewExportCountedRef = useRef(false);
  const isExporting = exportAction !== null;
  const showWatermark = shouldRenderWatermark(isUnlocked);

  const clearExportMessageTimer = useCallback(() => {
    if (exportMessageTimerRef.current) {
      clearTimeout(exportMessageTimerRef.current);
      exportMessageTimerRef.current = null;
    }
  }, []);

  const clearReviewPromptTimer = useCallback(() => {
    if (reviewPromptTimerRef.current) {
      clearTimeout(reviewPromptTimerRef.current);
      reviewPromptTimerRef.current = null;
    }
  }, []);

  /**
   * After a real Save/Share success: count once per Preview job immediately, then
   * (Android) maybe show the native review prompt once export UI has settled.
   */
  const handleExportSuccessForReview = useCallback(
    (action: ExportAction) => {
      const shouldCountJob = !previewExportCountedRef.current;

      if (shouldCountJob) {
        previewExportCountedRef.current = true;
      }

      onExportSuccess?.();

      const delayMs =
        action === 'save' ? REVIEW_PROMPT_DELAY_AFTER_SAVE_MS : REVIEW_PROMPT_DELAY_AFTER_SHARE_MS;

      clearReviewPromptTimer();

      void (async () => {
        try {
          if (shouldCountJob) {
            await recordSuccessfulExport();
          }

          reviewPromptTimerRef.current = setTimeout(() => {
            reviewPromptTimerRef.current = null;
            void maybeRequestAutomaticReview().catch(() => {
              // Native review failures must not affect export UX.
            });
          }, delayMs);
        } catch {
          // Review tracking must never surface as an export error.
        }
      })();
    },
    [clearReviewPromptTimer, onExportSuccess],
  );

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
      clearReviewPromptTimer();
    };
  }, [clearExportMessageTimer, clearReviewPromptTimer]);

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
    clearReviewPromptTimer();
    setExportMessage(null);
    // Drop stale host size so the aspect-matched capture view remeasures before save/share.
    setPreviewSize({ width: 0, height: 0 });
    setIsCaptureImageLoaded(false);
    // New preview session may save once; re-save on the same preview is blocked below.
    setHasSavedToGallery(false);
    previewExportCountedRef.current = false;
    setIsPreviewing(true);

    // Re-check unlock so export watermark gating stays current when opening preview.
    void loadIsUnlocked().then(setIsUnlocked);
  }, [clearExportMessageTimer, clearReviewPromptTimer, imageUri]);

  const closePreview = useCallback(() => {
    if (exportAction !== null) {
      return;
    }

    clearExportMessageTimer();
    setExportMessage(null);
    setIsPreviewing(false);
    setPreviewSize({ width: 0, height: 0 });
    setIsCaptureImageLoaded(false);
    setHasSavedToGallery(false);
    previewExportCountedRef.current = false;
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

      // Same preview session: do not create another gallery copy on repeat taps.
      if (hasSavedToGallery) {
        showExportMessage(t('export.alreadyInGallery'), { autoDismissMs: 2000 });
        return;
      }

      setExportAction('save');
      clearExportMessageTimer();
      setExportMessage(null);
      let namedExportUri: string | null = null;

      try {
        const permission = await MediaLibrary.requestPermissionsAsync(true);

        if (!permission.granted) {
          showExportMessage(t('permissions.photoSaveRequired'));
          return;
        }

        const copyIndex = takeNextGalleryCopyIndex(exportFilename);
        namedExportUri = await captureNamedExport(exportFilename, copyIndex);
        await MediaLibrary.saveToLibraryAsync(namedExportUri);
        setHasSavedToGallery(true);
        showExportMessage(t('export.saved'), { autoDismissMs: 2000 });
        await persistDraftHistoryOnce(exportFilename);
        handleExportSuccessForReview('save');
      } catch {
        showExportMessage(t('errors.saveFailed'));
      } finally {
        if (namedExportUri) {
          await deleteExportTempFile(namedExportUri);
        }
        setExportAction(null);
      }
    },
    [
      captureNamedExport,
      clearExportMessageTimer,
      exportAction,
      handleExportSuccessForReview,
      hasSavedToGallery,
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
      let namedExportUri: string | null = null;

      try {
        const canShare = await Sharing.isAvailableAsync();

        if (!canShare) {
          showExportMessage(t('errors.sharingUnavailable'));
          return;
        }

        // Share keeps a stable display name (no (n) suffix); gallery duplicates use save path.
        namedExportUri = await captureNamedExport(exportFilename, 0);
        await Sharing.shareAsync(namedExportUri, {
          dialogTitle: t('export.shareDialogTitle'),
          mimeType: 'image/jpeg',
        });
        handleExportSuccessForReview('share');
      } catch {
        showExportMessage(t('errors.shareFailed'));
      } finally {
        if (namedExportUri) {
          await deleteExportTempFile(namedExportUri);
        }
        setExportAction(null);
      }
    },
    [
      captureNamedExport,
      clearExportMessageTimer,
      exportAction,
      handleExportSuccessForReview,
      showExportMessage,
      t,
    ],
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
