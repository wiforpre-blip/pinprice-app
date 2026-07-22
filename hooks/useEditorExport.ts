import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { useTranslation } from '@/contexts/LanguageContext';
import type { ExportAction, Size } from '@/types/editor';

type UseEditorExportOptions = {
  imageUri: string | null;
};

export function useEditorExport({ imageUri }: UseEditorExportOptions) {
  const { t } = useTranslation();
  const exportRef = useRef<View>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewSize, setPreviewSize] = useState<Size>({ width: 0, height: 0 });
  const [exportAction, setExportAction] = useState<ExportAction | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const isExporting = exportAction !== null;

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

  const handleSaveImage = useCallback(async () => {
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

      const exportedUri = await captureExportView();
      await MediaLibrary.saveToLibraryAsync(exportedUri);
      setExportMessage(t('export.savedToGallery'));
    } catch {
      setExportMessage(t('errors.saveFailed'));
    } finally {
      setExportAction(null);
    }
  }, [captureExportView, exportAction, t]);

  const handleShareImage = useCallback(async () => {
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

      const exportedUri = await captureExportView();
      await Sharing.shareAsync(exportedUri, {
        dialogTitle: t('export.shareDialogTitle'),
        mimeType: 'image/png',
      });
    } catch {
      setExportMessage(t('errors.shareFailed'));
    } finally {
      setExportAction(null);
    }
  }, [captureExportView, exportAction, t]);

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
