import { StyleSheet } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  // Above floating delete drop zone (zIndex 20) so the dragged tag floats over it.
  contentDragging: {
    zIndex: 40,
  },
  placeholder: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  // Constant padding for the main floating bar only. Do not grow this when the
  // history row appears - absolute history chrome must not resize canvas/imageRect.
  placeholderWithFloatingBar: {
    paddingBottom: 76,
  },
  modeOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  activeModeOption: {
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.colors.photoMockBackground,
  },
  modeOptionDisabled: {
    opacity: 0.55,
  },
  modeOptionContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  modeOptionText: {
    ...theme.typography.button,
    color: theme.colors.textPrimary,
  },
  activeModeOptionText: {
    color: theme.buttons.primary.color,
  },
  modeOptionTextDisabled: {
    color: theme.colors.textSecondary,
  },
  modeOptionHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  moreMenuPlaceholder: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
});
