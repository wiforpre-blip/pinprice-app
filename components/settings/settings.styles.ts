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
});
