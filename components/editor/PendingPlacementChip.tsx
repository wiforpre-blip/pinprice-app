import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SoldCrossIcon } from '@/components/editor/SoldCrossIcon';
import { getResolvedTagPreset, isTransparentTagBackground } from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { PriceTag } from '@/types/tag';

type PendingPlacementChipProps = {
  previewTag: PriceTag;
  onCancel: () => void;
};

export function PendingPlacementChip({ previewTag, onCancel }: PendingPlacementChipProps) {
  const { t } = useTranslation();
  const tagName = t(`tag.${previewTag.type}`);
  const resolved = getResolvedTagPreset(previewTag);
  const isPlainSoldIcon = previewTag.type === 'sold' && previewTag.soldTextFormat === 'icon_plain';
  const isBadgeSoldIcon = previewTag.type === 'sold' && previewTag.soldTextFormat === 'icon';
  const isFlat = isPlainSoldIcon || isTransparentTagBackground(resolved.backgroundColor);

  return (
    <View style={styles.row}>
      <View style={styles.chip}>
        <View
          style={[
            styles.swatch,
            {
              backgroundColor: isFlat ? 'transparent' : resolved.backgroundColor,
              borderColor: isFlat ? resolved.color : resolved.borderColor,
            },
          ]}>
          {isPlainSoldIcon || isBadgeSoldIcon ? (
            <SoldCrossIcon color={isPlainSoldIcon ? theme.colors.sold : resolved.color} size={12} thicknessScale={2} />
          ) : previewTag.type === 'condition' ? (
            <Text style={[styles.conditionSwatchText, { color: resolved.color }]} numberOfLines={1}>
              {previewTag.text}
            </Text>
          ) : (
            <View style={[styles.swatchDot, { backgroundColor: resolved.color }]} />
          )}
        </View>

        <Text style={styles.label} numberOfLines={1}>
          {`${t('editor.placingChip')} ${tagName}`}
        </Text>

        <Pressable
          accessibilityLabel={t('editor.cancelPlacing')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onCancel}
          style={styles.cancelButton}>
          <MaterialIcons color={theme.colors.textSecondary} name="close" size={18} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  chip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingLeft: theme.spacing.sm,
    paddingRight: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    ...theme.shadows.card,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  conditionSwatchText: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    flexShrink: 1,
  },
  cancelButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
