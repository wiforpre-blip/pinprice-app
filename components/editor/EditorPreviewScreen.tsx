import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ImageLoadEventData } from 'expo-image';
import type { ReactNode, RefObject } from 'react';
import { useState } from 'react';
import {
  Keyboard,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExportPreview } from '@/components/editor/ExportPreview';
import { UnlockPaywallSheet } from '@/components/settings/UnlockPaywallSheet';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EditorPricingMode, ExportAction, Size } from '@/types/editor';
import type { PanelMarker } from '@/types/pricePanel';
import type { PriceTag } from '@/types/tag';

const UNTITLED_FILENAME = 'Untitled';

type EditorPreviewScreenProps = {
  draftFilename: string;
  editorMode: EditorPricingMode;
  exportAction: ExportAction | null;
  exportMessage: string | null;
  exportRef: RefObject<View | null>;
  filename: string;
  imageSize: Size | null;
  imageUri: string;
  isEditingFilename: boolean;
  isExporting: boolean;
  leaveConfirmModal: ReactNode;
  onCancelFilenameEdit: () => void;
  onClosePreview: () => void;
  onConfirmFilenameEdit: () => void;
  onDraftFilenameChange: (value: string) => void;
  onImageLoad: (event: ImageLoadEventData) => void;
  onPreviewLayout: (event: LayoutChangeEvent) => void;
  onSaveImage: () => void;
  onShareImage: () => void;
  onStartFilenameEdit: () => void;
  onUnlockChange: (isUnlocked: boolean) => void;
  panelMarkers: PanelMarker[];
  previewSize: Size;
  showWatermark: boolean;
  tags: PriceTag[];
};

export function EditorPreviewScreen({
  draftFilename,
  editorMode,
  exportAction,
  exportMessage,
  exportRef,
  filename,
  imageSize,
  imageUri,
  isEditingFilename,
  isExporting,
  leaveConfirmModal,
  onCancelFilenameEdit,
  onClosePreview,
  onConfirmFilenameEdit,
  onDraftFilenameChange,
  onImageLoad,
  onPreviewLayout,
  onSaveImage,
  onShareImage,
  onStartFilenameEdit,
  onUnlockChange,
  panelMarkers,
  previewSize,
  showWatermark,
  tags,
}: EditorPreviewScreenProps) {
  const { t } = useTranslation();
  const [isUnlockPaywallOpen, setIsUnlockPaywallOpen] = useState(false);
  const isUntitled = filename.trim() === UNTITLED_FILENAME;

  const handleConfirmFilenameEdit = () => {
    Keyboard.dismiss();
    onConfirmFilenameEdit();
  };

  const handleCancelFilenameEdit = () => {
    Keyboard.dismiss();
    onCancelFilenameEdit();
  };

  const handleClosePreview = () => {
    if (isEditingFilename) {
      handleConfirmFilenameEdit();
    }
    onClosePreview();
  };

  return (
    <SafeAreaView style={styles.screen}>
      {leaveConfirmModal}
      <UnlockPaywallSheet
        onClose={() => setIsUnlockPaywallOpen(false)}
        onUnlockChange={(unlocked) => {
          onUnlockChange(unlocked);
          if (unlocked) {
            setIsUnlockPaywallOpen(false);
          }
        }}
        visible={isUnlockPaywallOpen}
      />

      <View style={styles.previewTopBar}>
        <Pressable
          accessibilityRole="button"
          disabled={isExporting}
          onPress={handleClosePreview}
          style={styles.backButton}>
          <Text style={[styles.backButtonText, isExporting && styles.disabledText]}>{t('editor.edit')}</Text>
        </Pressable>

        {isEditingFilename ? (
          <TextInput
            accessibilityLabel={t('editor.editFilename')}
            autoFocus
            editable={!isExporting}
            onChangeText={onDraftFilenameChange}
            onSubmitEditing={handleConfirmFilenameEdit}
            placeholder={t('editor.filenamePlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="done"
            selectTextOnFocus
            style={styles.filenameInput}
            value={draftFilename}
          />
        ) : (
          <Pressable
            accessibilityHint={t('editor.editFilename')}
            accessibilityLabel={isUntitled ? t('editor.filenamePlaceholder') : filename}
            accessibilityRole="button"
            disabled={isExporting}
            onPress={onStartFilenameEdit}
            style={[styles.filenameButton, isExporting && styles.bottomActionDisabled]}>
            <Text
              numberOfLines={1}
              style={[styles.filenameText, isUntitled && styles.filenamePlaceholderText]}>
              {isUntitled ? t('editor.filenamePlaceholder') : filename}
            </Text>
            <MaterialIcons
              color={isExporting ? theme.colors.textMuted : theme.colors.textSecondary}
              name="edit"
              size={16}
            />
          </Pressable>
        )}

        {isEditingFilename ? (
          <View style={styles.filenameEditActions}>
            <Pressable
              accessibilityLabel={t('editor.cancelFilenameEdit')}
              accessibilityRole="button"
              disabled={isExporting}
              onPress={handleCancelFilenameEdit}
              style={styles.filenameEditAction}>
              <MaterialIcons color={theme.colors.textSecondary} name="close" size={22} />
            </Pressable>
            <Pressable
              accessibilityLabel={t('editor.confirmFilenameEdit')}
              accessibilityRole="button"
              disabled={isExporting}
              onPress={handleConfirmFilenameEdit}
              style={styles.filenameEditAction}>
              <MaterialIcons color={theme.colors.textPrimary} name="check" size={22} />
            </Pressable>
          </View>
        ) : (
          <View style={styles.previewTopSpacer} />
        )}
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
          showWatermark={showWatermark}
          tags={tags}
        />
      </View>

      {exportMessage ? <Text style={styles.exportMessage}>{exportMessage}</Text> : null}

      {showWatermark ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={isExporting ? { disabled: true } : undefined}
          disabled={isExporting}
          onPress={() => setIsUnlockPaywallOpen(true)}
          style={[styles.unlockBanner, isExporting && styles.bottomActionDisabled]}>
          <MaterialIcons color={theme.colors.textPrimary} name="layers-clear" size={18} />
          <Text numberOfLines={1} style={styles.unlockBannerText}>
            {t('settings.removeWatermark')}
          </Text>
          <MaterialIcons color={theme.colors.textMuted} name="chevron-right" size={22} />
        </Pressable>
      ) : null}

      <View style={styles.previewActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={isExporting ? { disabled: true } : undefined}
          disabled={isExporting}
          onPress={onSaveImage}
          style={[styles.previewActionButton, styles.previewPrimaryAction, isExporting && styles.bottomActionDisabled]}>
          <MaterialIcons color={theme.buttons.primary.color} name="save-alt" size={22} />
          <Text style={styles.previewPrimaryActionText}>
            {exportAction === 'save' ? t('editor.saving') : t('export.saveImage')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={isExporting ? { disabled: true } : undefined}
          disabled={isExporting}
          onPress={onShareImage}
          style={[
            styles.previewActionButton,
            styles.previewSecondaryAction,
            isExporting && styles.bottomActionDisabled,
          ]}>
          <MaterialIcons color={theme.buttons.secondary.color} name="ios-share" size={22} />
          <Text style={styles.previewSecondaryActionText}>
            {exportAction === 'share' ? t('editor.sharing') : t('export.share')}
          </Text>
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
  filenameButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  filenameText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },
  filenamePlaceholderText: {
    color: theme.colors.textSecondary,
  },
  filenameInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
  },
  filenameEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filenameEditAction: {
    minHeight: 44,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  unlockBanner: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  unlockBannerText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    flex: 1,
    minWidth: 0,
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
