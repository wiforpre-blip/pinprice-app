import { StyleSheet } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  workspace: {
    flex: 1,
  },
  content: {
    flex: 1,
    // Full-bleed photo stage — letterbox #111 reaches screen edges; header/bottom stay light.
    // paddingBottom is set at render time to clear the floating main bar + safe area.
  },
  // Above floating delete drop zone (zIndex 20) so the dragged tag floats over it.
  contentDragging: {
    zIndex: 40,
  },
  // Floats over the canvas under the header without shifting imageRect layout.
  placementChipOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 15,
    alignItems: 'center',
  },
  // Style sheet floats over canvas — must not sit in flex flow or imageRect/tags desync.
  stylePickerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 25,
  },
  placeholder: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
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
