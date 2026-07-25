import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { INFO_TAG_TYPES, MAIN_TAG_TYPES, SOLD_ICON_TEXT, TAG_SIZE_ORDER, type TagPickerSizePresetId } from '@/constants/tagDefaults';
import { DEFAULT_TAG_STYLE_BY_TYPE, TAG_STYLE_PRESETS, getTagTextShadowStyle, isTransparentTagBackground } from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { SoldCrossIcon } from '@/components/editor/SoldCrossIcon';
import type { PriceTextFormat, SoldTextFormat, TagLanguageCode, TagSizePresetId, TagStylePresetId, TagType } from '@/types/tag';
import { formatPriceDisplay } from '@/utils/priceText';

const SIZE_CHIP_LABELS: Record<TagPickerSizePresetId, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
  xl: 'XL',
};

type StylePickerPanelProps = {
  stylePickerType: TagType;
  activeSizePresetId: TagSizePresetId;
  priceTextFormat: PriceTextFormat;
  soldTextFormat: SoldTextFormat;
  languageCode: TagLanguageCode;
  textStylePresetId: TagStylePresetId;
  tagTypesSectionRef?: RefObject<View | null>;
  sizeSectionRef?: RefObject<View | null>;
  onCoachSectionsLayout?: () => void;
  onClose: () => void;
  onSelectToolType: (type: TagType) => void;
  onSelectSizePreset: (sizePresetId: TagSizePresetId) => void;
};

function getToolPreviewLabel({
  type,
  pricePreview,
  soldLabel,
  soldTextFormat,
  languageCode,
  textLabel,
}: {
  type: TagType;
  pricePreview: string;
  soldLabel: string;
  soldTextFormat: SoldTextFormat;
  languageCode: TagLanguageCode;
  textLabel: string;
}) {
  switch (type) {
    case 'price':
      return pricePreview;
    case 'sold':
      return soldTextFormat === 'text' ? soldLabel : SOLD_ICON_TEXT;
    case 'text':
      return textLabel;
    case 'condition':
      return 'NM';
    case 'quantity':
      return 'x4';
    case 'language':
      return languageCode;
  }
}

function ToolPreviewChip({
  type,
  label,
  isActive,
  soldTextFormat,
  stylePresetId,
  onPress,
}: {
  type: TagType;
  label: string;
  isActive: boolean;
  soldTextFormat?: SoldTextFormat;
  stylePresetId?: TagStylePresetId;
  onPress: () => void;
}) {
  const isPlainSoldIcon = type === 'sold' && soldTextFormat === 'icon_plain';
  const isBadgeSoldIcon = type === 'sold' && soldTextFormat === 'icon';
  const resolvedStylePresetId =
    stylePresetId && TAG_STYLE_PRESETS[stylePresetId]?.type === type
      ? stylePresetId
      : DEFAULT_TAG_STYLE_BY_TYPE[type];
  const preset = TAG_STYLE_PRESETS[isPlainSoldIcon ? 'sold-icon-plain' : resolvedStylePresetId];
  const isPlainText = type === 'text' && isTransparentTagBackground(preset.backgroundColor);
  const preview = (
    <View
      style={[
        styles.toolChipPreview,
        isActive && styles.activeToolChipPreview,
        isPlainSoldIcon && styles.plainSoldPreview,
        isPlainText && styles.plainTextPreview,
        {
          backgroundColor: isPlainSoldIcon || isPlainText ? 'transparent' : preset.backgroundColor,
          borderColor:
            isPlainSoldIcon || isPlainText
              ? isActive
                ? theme.colors.textPrimary
                : 'transparent'
              : isActive
                ? theme.colors.textPrimary
                : preset.borderColor,
        },
      ]}>
      {isPlainSoldIcon || isBadgeSoldIcon ? (
        <SoldCrossIcon
          color={isPlainSoldIcon ? theme.colors.sold : preset.color}
          size={isPlainSoldIcon ? 28 : 18}
          thicknessScale={2}
        />
      ) : (
        <Text
          style={[
            styles.toolChipPreviewText,
            type === 'text' ? getTagTextShadowStyle(preset.textShadow ?? null) : null,
            { color: preset.color, fontWeight: type === 'text' ? (preset.fontWeight ?? '700') : undefined },
          ]}
          numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={isActive ? { selected: true } : undefined}
      hitSlop={4}
      onPress={onPress}
      style={styles.toolChip}>
      {type === 'text' ? <View style={styles.textToolStage}>{preview}</View> : preview}
    </Pressable>
  );
}

export function StylePickerPanel({
  stylePickerType,
  activeSizePresetId,
  priceTextFormat,
  soldTextFormat,
  languageCode,
  textStylePresetId,
  tagTypesSectionRef,
  sizeSectionRef,
  onCoachSectionsLayout,
  onClose,
  onSelectToolType,
  onSelectSizePreset,
}: StylePickerPanelProps) {
  const { language, t } = useTranslation();
  const { currency } = useCurrency();
  const pricePreview = formatPriceDisplay('1000', priceTextFormat, currency, language) || '฿1,000';
  const soldLabel = t('tag.sold');
  const textLabel = language === 'th' ? 'ข้อความ' : 'Text';
  const mainSectionTitle = language === 'th' ? 'ป้ายหลัก' : 'Main tags';
  const infoSectionTitle = language === 'th' ? 'ป้ายข้อมูลสินค้า' : 'Item info';

  return (
    <View style={styles.stylePickerPanel}>
      <View style={styles.stylePickerHeader}>
        <Text style={styles.stylePickerTitle}>{t('editor.style')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('style.closePicker')} onPress={onClose} style={styles.stylePickerCloseButton}>
          <MaterialIcons color={theme.colors.textSecondary} name="close" size={20} />
        </Pressable>
      </View>

      <View collapsable={false} onLayout={onCoachSectionsLayout} ref={tagTypesSectionRef} style={styles.coachSection}>
        <Text style={styles.sectionTitle}>{mainSectionTitle}</Text>
        <View style={styles.toolRow}>
          {MAIN_TAG_TYPES.map((type) => {
            const label = getToolPreviewLabel({
              type,
              pricePreview,
              soldLabel,
              soldTextFormat,
              languageCode,
              textLabel,
            });

            return (
              <ToolPreviewChip
                key={type}
                type={type}
                label={label}
                isActive={stylePickerType === type}
                soldTextFormat={type === 'sold' ? soldTextFormat : undefined}
                stylePresetId={type === 'text' ? textStylePresetId : undefined}
                onPress={() => onSelectToolType(type)}
              />
            );
          })}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>{infoSectionTitle}</Text>
        <View style={styles.toolRow}>
          {INFO_TAG_TYPES.map((type) => {
            const label = getToolPreviewLabel({
              type,
              pricePreview,
              soldLabel,
              soldTextFormat,
              languageCode,
              textLabel,
            });

            return (
              <ToolPreviewChip
                key={type}
                type={type}
                label={label}
                isActive={stylePickerType === type}
                onPress={() => onSelectToolType(type)}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.divider} />

      <View collapsable={false} onLayout={onCoachSectionsLayout} ref={sizeSectionRef} style={styles.coachSection}>
        <Text style={styles.sectionTitle}>{t('style.size')}</Text>
        <View style={styles.sizeOptionGrid}>
          {TAG_SIZE_ORDER.map((sizePresetId) => {
            const isActive = sizePresetId === activeSizePresetId;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={isActive ? { selected: true } : undefined}
                key={sizePresetId}
                onPress={() => onSelectSizePreset(sizePresetId)}
                style={[styles.sizeOption, isActive && styles.activeSizeOption]}>
                <Text style={[styles.sizeOptionText, isActive && styles.activeSizeOptionText]}>{SIZE_CHIP_LABELS[sizePresetId]}</Text>
              </Pressable>
            );
          })}
        </View>
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
  coachSection: {
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
  sectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  toolRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  toolChip: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolChipPreview: {
    minHeight: 32,
    minWidth: 56,
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  plainSoldPreview: {
    minWidth: 32,
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  plainTextPreview: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  textToolStage: {
    minHeight: 36,
    maxWidth: '100%',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.photoMockBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
  },
  activeToolChipPreview: {
    borderWidth: 2,
  },
  toolChipPreviewText: {
    ...theme.typography.caption,
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
  activeSizeOption: {
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.colors.photoMockBackground,
  },
  sizeOptionText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  activeSizeOptionText: {
    color: theme.colors.textPrimary,
  },
});
