import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { PriceTag } from '@/types/tag';

type PendingPlacementChipProps = {
  previewTag: PriceTag;
  onCancel: () => void;
};

export function PendingPlacementChip({ previewTag, onCancel }: PendingPlacementChipProps) {
  const { t } = useTranslation();
  const tagName = t(`tag.typeTitles.${previewTag.type}`);

  return (
    <View style={styles.row}>
      <View style={styles.chip}>
        <Text style={styles.label} numberOfLines={1}>
          {`${t('editor.placingChip')} ${tagName}`}
        </Text>

        <Pressable
          accessibilityLabel={t('editor.cancelPlacing')}
          accessibilityRole="button"
          hitSlop={12}
          onPress={onCancel}
          style={styles.cancelButton}>
          <MaterialIcons color={theme.colors.textSecondary} name="close" size={16} />
        </Pressable>
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
    gap: theme.spacing.xs,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingLeft: theme.spacing.sm,
    paddingRight: 2,
    paddingVertical: 2,
    ...theme.shadows.card,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  cancelButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
