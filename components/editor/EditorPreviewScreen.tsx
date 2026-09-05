import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ImageLoadEventData } from 'expo-image';
import type { ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
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
import { UnlockDialog } from '@/components/settings/UnlockDialog';
import type { UnlockOutcome } from '@/components/settings/UnlockDialog';
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
  hasSavedToGallery: boolean;
  imageSize: Size | null;
  imageUri: string;
  isEditingFilename: boolean;
  isExporting: boolean;
  leaveConfirmModal: ReactNode;
  onCancelFilenameEdit: () => void;
  onClosePreview: () => void;
  onConfirmFilenameEdit: () => void;
  onDraftFilenameChange: (value: string) => void;
  onCaptureImageLoad: (loaded: boolean) => void;
  onImageLoad: (event: ImageLoadEventData) => void;
  onNewPhoto: () => void;
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
  hasSavedToGallery,
  imageSize,
  imageUri,
  isEditingFilename,
  isExporting,
  leaveConfirmModal,
  onCancelFilenameEdit,
  onClosePreview,
  onConfirmFilenameEdit,
  onDraftFilenameChange,
  onCaptureImageLoad,
  onImageLoad,
  onNewPhoto,
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
  const [isUnlockDialogOpen, setIsUnlockDialogOpen] = useState(false);
  /**
   * Toast shown after successful unlock from Preview.
   * Cleared immediately when a new exportMessage arrives so they never stack.
   */
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const unlockToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUntitled = filename.trim() === UNTITLED_FILENAME;

  // When a real export message arrives, dismiss the unlock toast so they don't stack.
  useEffect(() => {
    if (exportMessage) {
      setUnlockToast(null);
      if (unlockToastTimerRef.current !== null) {
        clearTimeout(unlockToastTimerRef.current);
        unlockToastTimerRef.current = null;
      }
    }
  }, [exportMessage]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (unlockToastTimerRef.current !== null) {
        clearTimeout(unlockToastTimerRef.current);
      }
    };
  }, []);

  const handleUnlockSuccess = (outcome: UnlockOutcome) => {
    setIsUnlockDialogOpen(false);
    onUnlockChange(true);

    let message: string | null = null;
    if (outcome.kind === 'purchased') {
      message = t('unlock.success');
    } else if (outcome.kind === 'restored') {
      message = t('unlock.restoreSuccess');
    }
    // already_unlocked: silent state update — no toast

    if (message) {
      // Only show toast if no export message is currently displayed
      if (!exportMessage) {
        setUnlockToast(message);
        unlockToastTimerRef.current = setTimeout(() => {
          setUnlockToast(null);
          unlockToastTimerRef.current = null;
        }, 4000);
      }
    }
  };

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

  // exportMessage takes priority; unlockToast shows only when no export result is present
  const activeToast = exportMessage ?? unlockToast;

  return (
    <SafeAreaView style={styles.screen}>
      {leaveConfirmModal}
      <UnlockDialog
        onClose={() => setIsUnlockDialogOpen(false)}
        onSuccess={handleUnlockSuccess}
        visible={isUnlockDialogOpen}
      />

      <View style={styles.previewTopBar}>
        <View style={styles.previewHeaderLeft}>
          <Pressable
            accessibilityRole="button"
            disabled={isExporting}
            onPress={handleClosePreview}
            style={styles.backButton}>
            <Text style={[styles.backButtonText, isExporting && styles.disabledText]}>{t('editor.edit')}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isExporting}
            onPress={onNewPhoto}
            style={styles.newPhotoButton}>
            <Text style={[styles.newPhotoButtonText, isExporting && styles.disabledText]}>
              {t('editor.newPhoto')}
            </Text>
          </Pressable>
        </View>

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
        {/* Tag export: on-screen preview is separate from the full-res capture target inside ExportPreview. */}
        <ExportPreview
          ref={exportRef}
          editorMode={editorMode}
          onCaptureImageLoad={onCaptureImageLoad}
          imageSize={imageSize}
          imageUri={imageUri}
          onImageLoad={onImageLoad}
          onLayout={onPreviewLayout}
          panelMarkers={panelMarkers}
          previewSize={previewSize}
          showWatermark={showWatermark}
          tags={tags}
        />


        {activeToast ? (
          <View pointerEvents="none" style={styles.exportToastOverlay}>
            <View style={styles.exportToast}>
              <Text style={styles.exportToastText}>{activeToast}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {showWatermark ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={isExporting ? { disabled: true } : undefined}
          disabled={isExporting}
          onPress={() => setIsUnlockDialogOpen(true)}
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
          <MaterialIcons
            color={theme.buttons.primary.color}
            name={hasSavedToGallery && exportAction !== 'save' ? 'check' : 'save-alt'}
            size={22}
          />
          <Text style={styles.previewPrimaryActionText}>
            {exportAction === 'save'
              ? t('editor.saving')
              : hasSavedToGallery
                ? t('export.saved')
                : t('export.saveImage')}
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
    paddingRight: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    justifyContent: 'center',
    overflow: 'visible',
  },
  backButtonText: {
    ...theme.typography.button,
    lineHeight: 24,
    includeFontPadding: true,
    color: theme.colors.textPrimary,
  },
  previewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  newPhotoButton: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    justifyContent: 'center',
    overflow: 'visible',
  },
  newPhotoButtonText: {
    ...theme.typography.button,
    lineHeight: 24,
    includeFontPadding: true,
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
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  previewTopSpacer: {
    minWidth: 48,
  },
  previewContent: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  exportToastOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  exportToast: {
    maxWidth: '100%',
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg + 2,
    paddingBottom: theme.spacing.lg + 6,
  },
  exportToastText: {
    fontSize: 24,
    lineHeight: 36,
    fontWeight: '600',
    color: theme.colors.white,
    textAlign: 'center',
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
    paddingVertical: theme.spacing.sm,
    overflow: 'visible',
  },
  previewPrimaryAction: {
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.buttons.primary.backgroundColor,
  },
  previewPrimaryActionText: {
    ...theme.typography.button,
    lineHeight: 24,
    includeFontPadding: true,
    color: theme.buttons.primary.color,
  },
  previewSecondaryAction: {
    borderColor: theme.buttons.secondary.borderColor,
    backgroundColor: theme.buttons.secondary.backgroundColor,
  },
  previewSecondaryActionText: {
    ...theme.typography.button,
    lineHeight: 24,
    includeFontPadding: true,
    color: theme.buttons.secondary.color,
  },
  bottomActionDisabled: {
    opacity: 0.45,
  },
});
