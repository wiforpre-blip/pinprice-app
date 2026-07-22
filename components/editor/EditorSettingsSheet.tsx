import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';

type EditorSettingsSheetProps = {
  visible: boolean;
  appVersion: string;
  onClose: () => void;
};

export function EditorSettingsSheet({ visible, appVersion, onClose }: EditorSettingsSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheetOverlay onClose={onClose} title={t('settings.title')} visible={visible}>
      <View style={styles.settingsRow}>
        <Text style={styles.settingsRowLabel}>{t('settings.currency')}</Text>
        <Text style={styles.settingsRowMuted}>{t('settings.comingSoon')}</Text>
      </View>
      <View style={styles.settingsRow}>
        <Text style={styles.settingsRowLabel}>{t('settings.version')}</Text>
        <Text style={styles.settingsRowValue}>{appVersion}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        style={styles.settingsRow}>
        <Text style={[styles.settingsRowLabel, styles.settingsRowLabelDisabled]}>{t('settings.contact')}</Text>
        <Text style={styles.settingsRowMuted}>{t('settings.comingSoon')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        style={styles.settingsRow}>
        <Text style={[styles.settingsRowLabel, styles.settingsRowLabelDisabled]}>{t('settings.help')}</Text>
        <Text style={styles.settingsRowMuted}>{t('settings.comingSoon')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        style={styles.settingsRow}>
        <Text style={[styles.settingsRowLabel, styles.settingsRowLabelDisabled]}>{t('settings.lifetimePurchase')}</Text>
        <Text style={styles.settingsRowMuted}>{t('settings.comingSoon')}</Text>
      </Pressable>
    </BottomSheetOverlay>
  );
}

const styles = StyleSheet.create({
  settingsRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  settingsRowLabel: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  settingsRowLabelDisabled: {
    color: theme.colors.textMuted,
  },
  settingsRowValue: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  settingsRowMuted: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
});
