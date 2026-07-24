import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { useTranslation } from '@/contexts/LanguageContext';
import { upsertEditorDraft } from '@/services/draft.service';
import { prepareNamedExportUri } from '@/services/export.service';
import type { EditorDraftSnapshot } from '@/types/draft';
import type { ExportAction, Size } from '@/types/editor';

type UseEditorExportOptions = {
  imageUri: string | null;
  /** When reopening a Recent draft, reuse this id on the next save/share. */
  initialDraftId?: string | null;
  /** Latest editor session fields for local draft persistence after save/share. */
  getDraftSnapshot?: () => EditorDraftSnapshot | null;
};

export function useEditorExport({ imageUri, getDraftSnapshot, initialDraftId = null }: UseEditorExportOptions) {
  const { t } = useTranslation();
  const exportRef = useRef<View>(null);
  const activeDraftIdRef = useRef<string | null>(initialDraftId);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewSize, setPreviewSize] = useState<Size>({ width: 0, height: 0 });
  const [exportAction, setExportAction] = useState<ExportAction | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const isExporting = exportAction !== null;

  useEffect(() => {
    if (initialDraftId) {
      activeDraftIdRef.current = initialDraftId;
    }
  }, [initialDraftId]);

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

  const openPreview = useCallback(() => {
    if (!imageUri) {
      return;
    }

    setExportMessage(null);
    setIsPreviewing(true);
  }, [imageUri]);

  const closePreview = useCallback(() => {
    if (exportAction !== null) {
      return;
    }

    setExportMessage(null);
    setIsPreviewing(false);
  }, [exportAction]);

  const handlePreviewLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setPreviewSize({ width, height });
  }, []);

  const captureExportView = useCallback(async () => {
    if (!exportRef.current) {
      throw new Error(t('errors.exportViewNotReady'));
    }

    return captureRef(exportRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
  }, [t]);

  const captureNamedExport = useCallback(
    async (exportFilename: string) => {
      const exportedUri = await captureExportView();
      return prepareNamedExportUri(exportedUri, exportFilename);
    },
    [captureExportView],
  );

  const handleSaveImage = useCallback(
    async (exportFilename: string) => {
      if (exportAction !== null) {
        return;
      }

      setExportAction('save');
      setExportMessage(null);

      try {
        const permission = await MediaLibrary.requestPermissionsAsync(true);

        if (!permission.granted) {
          setExportMessage(t('permissions.photoSaveRequired'));
          return;
        }

        const namedExportUri = await captureNamedExport(exportFilename);
        await MediaLibrary.saveToLibraryAsync(namedExportUri);
        setExportMessage(t('export.savedToGallery'));
        await persistDraftAfterExport(exportFilename);
      } catch {
        setExportMessage(t('errors.saveFailed'));
      } finally {
        setExportAction(null);
      }
    },
    [captureNamedExport, exportAction, persistDraftAfterExport, t],
  );

  const handleShareImage = useCallback(
    async (exportFilename: string) => {
      if (exportAction !== null) {
        return;
      }

      setExportAction('share');
      setExportMessage(null);

      try {
        const canShare = await Sharing.isAvailableAsync();

        if (!canShare) {
          setExportMessage(t('errors.sharingUnavailable'));
          return;
        }

        const namedExportUri = await captureNamedExport(exportFilename);
        await Sharing.shareAsync(namedExportUri, {
          dialogTitle: t('export.shareDialogTitle'),
          mimeType: 'image/png',
        });
        await persistDraftAfterExport(exportFilename);
      } catch {
        setExportMessage(t('errors.shareFailed'));
      } finally {
        setExportAction(null);
      }
    },
    [captureNamedExport, exportAction, persistDraftAfterExport, t],
  );
  return {
    captureExportView,
    closePreview,
    exportAction,
    exportMessage,
    exportRef,
    handlePreviewLayout,
    handleSaveImage,
    handleShareImage,
    isExporting,
    isPreviewing,
    openPreview,
    previewSize,
  };
}
