import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ImageLoadEventData } from 'expo-image';
import type { ReactNode, RefObject } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExportPreview } from '@/components/editor/ExportPreview';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EditorPricingMode, ExportAction, Size } from '@/types/editor';
import type { PanelMarker } from '@/types/pricePanel';
import type { PriceTag } from '@/types/tag';

type EditorPreviewScreenProps = {
  editorMode: EditorPricingMode;
  exportAction: ExportAction | null;
  exportMessage: string | null;
  exportRef: RefObject<View | null>;
  filename: string;
  imageSize: Size | null;
  imageUri: string;
  isExporting: boolean;
  leaveConfirmModal: ReactNode;
  onClosePreview: () => void;
  onImageLoad: (event: ImageLoadEventData) => void;
  onPreviewLayout: (event: LayoutChangeEvent) => void;
  onSaveImage: () => void;
  onShareImage: () => void;
  panelMarkers: PanelMarker[];
  previewSize: Size;
  tags: PriceTag[];
};

export function EditorPreviewScreen({
  editorMode,
  exportAction,
  exportMessage,
  exportRef,
  filename,
  imageSize,
  imageUri,
  isExporting,
  leaveConfirmModal,
  onClosePreview,
  onImageLoad,
  onPreviewLayout,
  onSaveImage,
  onShareImage,
  panelMarkers,
  previewSize,
  tags,
}: EditorPreviewScreenProps) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.screen}>
      {leaveConfirmModal}
      <View style={styles.previewTopBar}>
        <Pressable accessibilityRole="button" disabled={isExporting} onPress={onClosePreview} style={styles.backButton}>
          <Text style={[styles.backButtonText, isExporting && styles.disabledText]}>{t('editor.edit')}</Text>
        </Pressable>

        <View style={styles.filenameArea}>
          <Text numberOfLines={1} style={styles.filenameText}>
            {filename}
          </Text>
        </View>

        <View style={styles.previewTopSpacer} />
      </View>

      <View style={styles.previewContent}>
        <ExportPreview
          ref={exportRef}
          editorMode={editorMode}
          imageSize={imageSize}
          imageUri={imageUri}
          onImageLoad={onImageLoad}
          onLayout={onPreviewLayout}
          panelMarkers={panelMarkers}
          previewSize={previewSize}
          tags={tags}
        />
      </View>

      {exportMessage ? <Text style={styles.exportMessage}>{exportMessage}</Text> : null}

      <View style={styles.previewActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={isExporting ? { disabled: true } : undefined}
          disabled={isExporting}
          onPress={onSaveImage}
          style={[styles.previewActionButton, styles.previewPrimaryAction, isExporting && styles.bottomActionDisabled]}>
          <MaterialIcons color={theme.buttons.primary.color} name="save-alt" size={22} />
          <Text style={styles.previewPrimaryActionText}>{exportAction === 'save' ? t('editor.saving') : t('export.saveImage')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={isExporting ? { disabled: true } : undefined}
          disabled={isExporting}
          onPress={onShareImage}
          style={[styles.previewActionButton, styles.previewSecondaryAction, isExporting && styles.bottomActionDisabled]}>
          <MaterialIcons color={theme.buttons.secondary.color} name="ios-share" size={22} />
          <Text style={styles.previewSecondaryActionText}>{exportAction === 'share' ? t('editor.sharing') : t('export.share')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    minHeight: 44,
    width: 72,
    justifyContent: 'center',
  },
  backButtonText: {
    ...theme.typography.button,
    color: theme.colors.textPrimary,
  },
  disabledText: {
    color: theme.colors.textMuted,
  },
  filenameArea: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  filenameText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  previewTopBar: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  previewTopSpacer: {
    width: 72,
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  exportMessage: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  previewActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  previewActionButton: {
    minHeight: theme.buttons.height,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
  },
  previewPrimaryAction: {
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.buttons.primary.backgroundColor,
  },
  previewPrimaryActionText: {
    ...theme.typography.button,
    color: theme.buttons.primary.color,
  },
  previewSecondaryAction: {
    borderColor: theme.buttons.secondary.borderColor,
    backgroundColor: theme.buttons.secondary.backgroundColor,
  },
  previewSecondaryActionText: {
    ...theme.typography.button,
    color: theme.buttons.secondary.color,
  },
  bottomActionDisabled: {
    opacity: 0.45,
  },
});
