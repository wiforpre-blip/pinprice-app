import { StyleSheet, Text, View } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';

/** Floating hint while multi-select is active — same slot as PendingPlacementChip. */
export function MultiSelectHintChip() {
  const { t } = useTranslation();

  return (
    <View pointerEvents="none" style={styles.row}>
      <View style={styles.chip}>
        <Text style={styles.label} numberOfLines={1}>
          {t('editor.tapEmptyToExit')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  chip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    ...theme.shadows.card,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
});
