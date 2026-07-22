import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EditorPricingMode } from '@/types/editor';

const FLOATING_MAIN_ACTIONS = [
  { id: 'style', labelKey: 'editor.style', icon: 'palette' },
  { id: 'select', labelKey: 'editor.select', icon: 'select-all' },
  { id: 'export', labelKey: 'editor.export', icon: 'file-upload' },
] as const;

export type FloatingMainActionId = (typeof FLOATING_MAIN_ACTIONS)[number]['id'];

type EditorFloatingControlsProps = {
  alignFeedbackMessage: string | null;
  isDraggingTag: boolean;
  isMultiSelectGroupDrag: boolean;
  isStylePickerVisible: boolean;
  isMultiSelectMode: boolean;
  editorMode: EditorPricingMode;
  selectedImageUri: string | null;
  selectedTagIds: string[];
  isDragOverDelete: boolean;
  bottomDropAreaRef: RefObject<View | null>;
  onBottomDropAreaLayout: () => void;
  onFloatingMainAction: (actionId: FloatingMainActionId) => void;
};

export function EditorFloatingControls({
  alignFeedbackMessage,
  isDraggingTag,
  isMultiSelectGroupDrag,
  isStylePickerVisible,
  isMultiSelectMode,
  editorMode,
  selectedImageUri,
  selectedTagIds,
  isDragOverDelete,
  bottomDropAreaRef,
  onBottomDropAreaLayout,
  onFloatingMainAction,
}: EditorFloatingControlsProps) {
  const { t } = useTranslation();

  return (
    <View pointerEvents="box-none" style={styles.floatingControlsLayer}>
      {alignFeedbackMessage ? (
        <View pointerEvents="none" style={styles.alignFeedbackToast}>
          <Text style={styles.alignFeedbackText}>{alignFeedbackMessage}</Text>
        </View>
      ) : null}
      {isDraggingTag ? (
        isMultiSelectGroupDrag ? null : (
          <View
            ref={bottomDropAreaRef}
            onLayout={onBottomDropAreaLayout}
            style={[styles.deleteDropZone, isDragOverDelete && styles.activeDeleteDropZone]}>
            <MaterialIcons color={isDragOverDelete ? theme.buttons.primary.color : theme.colors.sold} name="delete-outline" size={28} />
            <Text style={[styles.deleteDropZoneText, isDragOverDelete && styles.activeDeleteDropZoneText]}>{t('tag.dragToDelete')}</Text>
          </View>
        )
      ) : isStylePickerVisible ? null : (
        <View style={styles.floatingMainBar}>
          {FLOATING_MAIN_ACTIONS.map((item) => {
            const isSelectAction = item.id === 'select';
            const isStyleAction = item.id === 'style';
            const isAlignAction = isSelectAction && isMultiSelectMode;
            const isDisabled =
              (isStyleAction && (isMultiSelectMode || editorMode === 'priceList' || !selectedImageUri)) ||
              (isSelectAction && !selectedImageUri) ||
              (isAlignAction && selectedTagIds.length < 2) ||
              (item.id === 'export' && !selectedImageUri);
            const actionIcon = isAlignAction ? 'vertical-align-center' : item.icon;
            const actionLabel = isAlignAction ? t('editor.align') : t(item.labelKey);

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={isDisabled ? { disabled: true } : undefined}
                disabled={isDisabled}
                key={item.id}
                onPress={() => onFloatingMainAction(item.id)}
                style={[styles.floatingMainAction, isDisabled && styles.floatingMainActionDisabled]}>
                <MaterialIcons
                  color={isDisabled ? theme.colors.textMuted : theme.buttons.secondary.color}
                  name={actionIcon}
                  size={22}
                />
                <Text style={[styles.floatingMainActionText, isDisabled && styles.floatingMainActionTextDisabled]}>
                  {actionLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  floatingControlsLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  floatingMainBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.buttons.secondary.borderColor,
    backgroundColor: theme.buttons.secondary.backgroundColor,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    ...theme.shadows.card,
  },
  floatingMainAction: {
    minHeight: 52,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  floatingMainActionDisabled: {
    opacity: 0.45,
  },
  floatingMainActionText: {
    ...theme.typography.caption,
    color: theme.buttons.secondary.color,
  },
  floatingMainActionTextDisabled: {
    color: theme.colors.textMuted,
  },
  alignFeedbackToast: {
    maxWidth: 320,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.shadows.card,
  },
  alignFeedbackText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  deleteDropZone: {
    alignSelf: 'stretch',
    minHeight: 88,
    marginHorizontal: -theme.spacing.lg,
    marginBottom: -theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  activeDeleteDropZone: {
    borderTopColor: theme.colors.sold,
    backgroundColor: theme.colors.sold,
  },
  deleteDropZoneText: {
    ...theme.typography.button,
    color: theme.colors.sold,
  },
  activeDeleteDropZoneText: {
    color: theme.buttons.primary.color,
  },
});
