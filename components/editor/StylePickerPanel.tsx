import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TAG_STYLE_PRESETS } from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { TagSizePresetId, TagStylePresetId, TagType } from '@/types/tag';

const DEFAULT_SOLD_TEXT = 'SOLD';
const STYLE_PICKER_STYLE_IDS: Record<TagType, TagStylePresetId[]> = {
  price: ['price-white-black', 'price-black-white'],
  sold: ['sold-red', 'sold-gray'],
};
const STYLE_PICKER_SIZE_IDS: TagSizePresetId[] = ['small', 'medium', 'large'];

type StylePickerPanelProps = {
  stylePickerType: TagType;
  activeStylePresetId: TagStylePresetId;
  activeSizePresetId: TagSizePresetId;
  onClose: () => void;
  onSelectToolType: (type: TagType) => void;
  onSelectStylePreset: (stylePresetId: TagStylePresetId) => void;
  onSelectSizePreset: (sizePresetId: TagSizePresetId) => void;
};

export function StylePickerPanel({
  stylePickerType,
  activeStylePresetId,
  activeSizePresetId,
  onClose,
  onSelectToolType,
  onSelectStylePreset,
  onSelectSizePreset,
}: StylePickerPanelProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.stylePickerPanel}>
      <View style={styles.stylePickerHeader}>
        <Text style={styles.stylePickerTitle}>{t('editor.style')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('style.closePicker')} onPress={onClose} style={styles.stylePickerCloseButton}>
          <MaterialIcons color={theme.colors.textSecondary} name="close" size={20} />
        </Pressable>
      </View>

      <View style={styles.toolTypeControl}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={stylePickerType === 'price' ? { selected: true } : undefined}
          onPress={() => onSelectToolType('price')}
          style={[styles.toolTypeButton, stylePickerType === 'price' && styles.activeToolTypeButton]}>
          <Text style={[styles.toolTypeButtonText, stylePickerType === 'price' && styles.activeToolTypeButtonText]}>{t('tag.price')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={stylePickerType === 'sold' ? { selected: true } : undefined}
          onPress={() => onSelectToolType('sold')}
          style={[styles.toolTypeButton, stylePickerType === 'sold' && styles.activeToolTypeButton]}>
          <Text style={[styles.toolTypeButtonText, stylePickerType === 'sold' && styles.activeToolTypeButtonText]}>{t('tag.sold')}</Text>
        </Pressable>
      </View>

      <View style={styles.styleOptionGrid}>
        {STYLE_PICKER_STYLE_IDS[stylePickerType].map((stylePresetId) => {
          const preset = TAG_STYLE_PRESETS[stylePresetId];
          const isActive = stylePresetId === activeStylePresetId;

          return (
            <Pressable
              accessibilityLabel={t(`style.presets.${stylePresetId}`)}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : undefined}
              key={stylePresetId}
              onPress={() => onSelectStylePreset(stylePresetId)}
              style={[styles.styleOption, isActive && styles.activeStyleOption]}>
              <View
                style={[
                  styles.styleOptionPreview,
                  {
                    backgroundColor: preset.backgroundColor,
                    borderColor: preset.borderColor,
                  },
                ]}>
                <Text style={[styles.styleOptionPreviewText, { color: preset.color }]}>{stylePickerType === 'sold' ? DEFAULT_SOLD_TEXT : 'THB 10,000'}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.stylePickerTitle}>{t('style.size')}</Text>
      <View style={styles.sizeOptionGrid}>
        {STYLE_PICKER_SIZE_IDS.map((sizePresetId) => {
          const isActive = sizePresetId === activeSizePresetId;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : undefined}
              key={sizePresetId}
              onPress={() => onSelectSizePreset(sizePresetId)}
              style={[styles.sizeOption, isActive && styles.activeStyleOption]}>
              <Text style={[styles.styleOptionText, isActive && styles.activeStyleOptionText]}>{t(`style.sizeOptions.${sizePresetId}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stylePickerPanel: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  stylePickerHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stylePickerTitle: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  stylePickerCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
  toolTypeControl: {
    minHeight: 44,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  toolTypeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  activeToolTypeButton: {
    backgroundColor: theme.buttons.primary.backgroundColor,
  },
  toolTypeButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  activeToolTypeButtonText: {
    color: theme.buttons.primary.color,
  },
  styleOptionGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  styleOption: {
    minHeight: 60,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
  activeStyleOption: {
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.colors.photoMockBackground,
  },
  styleOptionPreview: {
    minHeight: 28,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
  },
  styleOptionPreviewText: {
    ...theme.typography.caption,
  },
  styleOptionText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  activeStyleOptionText: {
    color: theme.colors.textPrimary,
  },
  sizeOptionGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  sizeOption: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
  },
});
