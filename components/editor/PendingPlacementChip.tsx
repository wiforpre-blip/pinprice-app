import { StyleSheet, Text, View } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { PriceTag } from '@/types/tag';

type PendingPlacementChipProps = {
  previewTag: PriceTag;
};

export function PendingPlacementChip({ previewTag }: PendingPlacementChipProps) {
  const { t } = useTranslation();
  const tagName = t(`tag.typeTitles.${previewTag.type}`);

  return (
    <View pointerEvents="none" style={styles.row}>
      <View style={styles.chip}>
        <Text style={styles.label} numberOfLines={1}>
          {`${t('editor.placingChip')} ${tagName}`}
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
