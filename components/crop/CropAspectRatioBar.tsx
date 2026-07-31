import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CROP_ASPECT_PRESETS } from '@/constants/cropAspectRatios';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { CropAspectId } from '@/types/crop';

type CropAspectRatioBarProps = {
  aspectId: CropAspectId;
  disabled?: boolean;
  onSelect: (aspectId: Exclude<CropAspectId, 'free'>) => void;
};

const PRESET_ICONS: Record<Exclude<CropAspectId, 'free'>, keyof typeof MaterialIcons.glyphMap> = {
  original: 'crop-original',
  '1:1': 'crop-square',
  '4:5': 'crop-portrait',
  '9:16': 'crop-portrait',
};

export function CropAspectRatioBar({ aspectId, disabled = false, onSelect }: CropAspectRatioBarProps) {
  const { t } = useTranslation();
  const selectedId = aspectId === 'free' ? null : aspectId;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {CROP_ASPECT_PRESETS.map((preset) => {
          const selected = selectedId === preset.id;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              disabled={disabled}
              key={preset.id}
              onPress={() => onSelect(preset.id)}
              style={[
                styles.card,
                selected && styles.cardSelected,
                disabled && styles.disabled,
              ]}>
              <MaterialIcons
                color={selected ? theme.colors.accentText : theme.colors.textPrimary}
                name={PRESET_ICONS[preset.id]}
                size={20}
              />
              <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
                {t(preset.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.xs,
  },
  card: {
    flex: 1,
    minHeight: 56,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.accent,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  labelSelected: {
    color: theme.colors.accentText,
  },
  disabled: {
    opacity: 0.45,
  },
});
