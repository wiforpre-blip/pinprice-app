import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { EditorPricingMode } from '@/types/editor';

/** Main bar footprint only (not history row) — keep canvas padding stable. */
export const EDITOR_FLOATING_MAIN_BAR_HEIGHT = 66;

const FLOATING_MAIN_ACTIONS = [
  { id: 'style', labelKey: 'editor.style', icon: 'palette' },
  { id: 'align', labelKey: 'editor.align', icon: 'vertical-align-center' },
  { id: 'export', labelKey: 'editor.export', icon: 'file-upload' },
] as const;

export type FloatingMainActionId = (typeof FLOATING_MAIN_ACTIONS)[number]['id'];
export type FloatingHistoryActionId = 'undo' | 'reset' | 'redo';

type EditorFloatingControlsProps = {
  alignFeedbackMessage: string | null;
  canExport: boolean;
  isDraggingTag: boolean;
  isStylePickerVisible: boolean;
  isMultiSelectMode: boolean;
  editorMode: EditorPricingMode;
  selectedImageUri: string | null;
  selectedTagIds: string[];
  isDragOverDelete: boolean;
  bottomDropAreaRef: RefObject<View | null>;
  styleButtonRef?: RefObject<View | null>;
  exportButtonRef?: RefObject<View | null>;
  onBottomDropAreaLayout: () => void;
  onStyleButtonLayout?: () => void;
  onExportButtonLayout?: () => void;
  onFloatingMainAction: (actionId: FloatingMainActionId) => void;
};

export function EditorFloatingControls({
  alignFeedbackMessage,
  canExport,
  isDraggingTag,
  isStylePickerVisible,
  isMultiSelectMode,
  editorMode,
  selectedImageUri,
  selectedTagIds,
  isDragOverDelete,
  bottomDropAreaRef,
  styleButtonRef,
  exportButtonRef,
  onBottomDropAreaLayout,
  onStyleButtonLayout,
  onExportButtonLayout,
  onFloatingMainAction,
}: EditorFloatingControlsProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const floatingBottomPadding = theme.spacing.lg + bottomInset;
  const showFloatingBars = Boolean(selectedImageUri) && !isStylePickerVisible && !isDraggingTag;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.floatingControlsLayer,
        isDraggingTag && styles.floatingControlsLayerDragging,
        { paddingBottom: floatingBottomPadding },
      ]}>
      {isDraggingTag ? (
          <View
            ref={bottomDropAreaRef}
            onLayout={onBottomDropAreaLayout}
            style={[
              styles.deleteDropZone,
              {
                marginBottom: -floatingBottomPadding,
                paddingBottom: floatingBottomPadding,
              },
              isDragOverDelete && styles.activeDeleteDropZone,
            ]}>
            <MaterialIcons color={isDragOverDelete ? theme.buttons.primary.color : theme.colors.sold} name="delete-outline" size={28} />
            <Text style={[styles.deleteDropZoneText, isDragOverDelete && styles.activeDeleteDropZoneText]}>{t('tag.dragToDelete')}</Text>
          </View>
      ) : showFloatingBars ? (
        <View style={styles.floatingBarsColumn}>
          {alignFeedbackMessage ? (
            <View pointerEvents="none" style={styles.alignFeedbackToast}>
              <Text style={styles.alignFeedbackText}>{alignFeedbackMessage}</Text>
            </View>
          ) : null}
          <View style={styles.floatingMainBar}>
            {FLOATING_MAIN_ACTIONS.map((item) => {
              const isAlignAction = item.id === 'align';
              const isStyleAction = item.id === 'style';
              const isExportAction = item.id === 'export';
              const isAlignInactive = isAlignAction && (!isMultiSelectMode || selectedTagIds.length < 2);
              const isDisabled =
                (isStyleAction &&
                  (isMultiSelectMode || editorMode === 'priceList' || !selectedImageUri)) ||
                isAlignInactive ||
                (isExportAction && (!selectedImageUri || !canExport));
              const actionLabel = t(item.labelKey);
              const anchorOnLayout = isStyleAction
                ? onStyleButtonLayout
                : isExportAction
                  ? onExportButtonLayout
                  : undefined;
              const anchorRef = isStyleAction ? styleButtonRef : isExportAction ? exportButtonRef : undefined;

              return (
                <View
                  collapsable={false}
                  key={item.id}
                  onLayout={anchorOnLayout}
                  ref={anchorRef}
                  style={isStyleAction || isExportAction ? styles.styleButtonAnchor : undefined}>
                  <Pressable
                    accessibilityLabel={actionLabel}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: isDisabled,
                    }}
                    disabled={isDisabled}
                    onPress={() => onFloatingMainAction(item.id)}
                    style={[
                      styles.floatingMainAction,
                      isDisabled && styles.floatingActionDisabled,
                      isAlignInactive && styles.floatingAlignInactive,
                    ]}>
                    <MaterialIcons
                      color={isDisabled ? theme.colors.textMuted : theme.buttons.secondary.color}
                      name={item.icon}
                      size={22}
                    />
                    <Text
                      style={[
                        styles.floatingMainActionText,
                        isDisabled && styles.floatingActionTextDisabled,
                      ]}>
                      {actionLabel}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
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
    // Base bottom padding is applied at render time with safe-area inset so the
    // absolute chrome clears the system nav / home indicator. Keep history row
    // absolute so canvas/imageRect never resize when it appears.
  },
  floatingControlsLayerDragging: {
    // Stay below elevated content (zIndex 40) so the dragged tag floats over the delete zone.
    zIndex: 10,
  },
  floatingBarsColumn: {
    alignItems: 'center',
    gap: theme.spacing.sm,
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
    minHeight: 56,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    // Extra bottom padding so Thai vowel marks (e.g. สระอู in "ซูม") are not clipped.
    paddingBottom: theme.spacing.sm,
  },
  styleButtonAnchor: {
    // Keep native host view for reliable measureInWindow on Android.
  },
  floatingActionDisabled: {
    opacity: 0.45,
  },
  floatingAlignInactive: {
    opacity: 0.38,
  },
  floatingMainActionText: {
    ...theme.typography.caption,
    // Slightly taller than caption default so Thai under-marks render fully.
    lineHeight: 18,
    color: theme.buttons.secondary.color,
  },
  floatingActionTextDisabled: {
    color: theme.colors.textMuted,
  },
  alignFeedbackToast: {
    maxWidth: 320,
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
    // Tall enough to cover the two-row floating footprint while dragging.
    minHeight: 120,
    marginHorizontal: -theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    // marginBottom / paddingBottom include safe-area inset at render time.
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
