import { StyleSheet } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';

export const settingsStyles = StyleSheet.create({
  list: {
    gap: 0,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  rowLabel: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  rowLabelDisabled: {
    color: theme.colors.textMuted,
  },
  rowValue: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  rowValueMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  rowValueUnlocked: {
    ...theme.typography.caption,
    color: theme.colors.success,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.sm,
  },
  languageToggle: {
    minHeight: 40,
    minWidth: 124,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  languageToggleButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
  },
  activeLanguageToggleButton: {
    backgroundColor: theme.buttons.primary.backgroundColor,
  },
  languageToggleText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  activeLanguageToggleText: {
    color: theme.buttons.primary.color,
  },
  currencyOptionRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  currencyOptionRowActive: {
    backgroundColor: theme.buttons.primary.backgroundColor,
  },
  currencyOptionLabel: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  currencyOptionLabelActive: {
    color: theme.buttons.primary.color,
  },
  feedbackTypeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  feedbackTypeButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
  },
  feedbackTypeButtonActive: {
    backgroundColor: theme.buttons.primary.backgroundColor,
    borderColor: theme.buttons.primary.borderColor,
  },
  feedbackTypeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  feedbackTypeTextActive: {
    color: theme.buttons.primary.color,
  },
  feedbackInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    textAlignVertical: 'top',
  },
  feedbackSendButton: {
    minHeight: theme.buttons.height,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.buttons.primary.backgroundColor,
    paddingHorizontal: theme.spacing.lg,
  },
  feedbackSendButtonDisabled: {
    opacity: 0.6,
  },
  feedbackSendText: {
    ...theme.typography.button,
    color: theme.buttons.primary.color,
  },
  feedbackStatus: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  feedbackStatusError: {
    color: theme.colors.sold,
  },
  feedbackForm: {
    gap: theme.spacing.md,
  },
  feedbackFooter: {
    gap: theme.spacing.sm,
  },
  unlockBody: {
    gap: theme.spacing.md,
  },
  unlockBenefit: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  unlockPrice: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  unlockBadge: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  unlockBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.success,
  },
  unlockFooter: {
    gap: theme.spacing.sm,
  },
  unlockPrimaryButton: {
    minHeight: theme.buttons.height,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.buttons.primary.backgroundColor,
    paddingHorizontal: theme.spacing.lg,
    // Extra vertical room so Thai vowels (e.g. สระอู in กู้คืน) are not clipped by the border.
    paddingVertical: theme.spacing.sm,
    overflow: 'visible',
  },
  unlockPrimaryButtonText: {
    ...theme.typography.button,
    lineHeight: 24,
    color: theme.buttons.primary.color,
    includeFontPadding: true,
  },
  unlockSecondaryButton: {
    minHeight: theme.buttons.height,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    overflow: 'visible',
  },
  unlockSecondaryButtonText: {
    ...theme.typography.button,
    lineHeight: 24,
    color: theme.colors.textPrimary,
    includeFontPadding: true,
  },
  unlockButtonDisabled: {
    opacity: 0.6,
  },
  unlockStatus: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  unlockStatusError: {
    color: theme.colors.sold,
  },
  helpBody: {
    gap: theme.spacing.md,
  },
  helpMenuList: {
    gap: 0,
  },
  helpMenuRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  helpMenuLabel: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  helpMenuLabelDisabled: {
    color: theme.colors.textMuted,
  },
  helpMenuDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  helpHowToPanel: {
    gap: theme.spacing.sm,
    paddingLeft: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  helpBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: 2,
  },
  helpBulletMark: {
    ...theme.typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textMuted,
  },
  helpBulletText: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
});
