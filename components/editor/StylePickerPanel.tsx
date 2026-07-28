import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode, RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { INFO_TAG_TYPES, MAIN_TAG_TYPES, SOLD_ICON_TEXT, TAG_SIZE_ORDER, type TagPickerSizePresetId } from '@/constants/tagDefaults';
import {
  CONDITION_GRADE_STYLES,
  DEFAULT_TAG_STYLE_BY_TYPE,
  TAG_STYLE_PRESETS,
  getTagTextShadowStyle,
  isTransparentTagBackground,
} from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { SoldCrossIcon } from '@/components/editor/SoldCrossIcon';
import type { PriceTextFormat, SoldTextFormat, TagConditionValue, TagLanguageCode, TagSizePresetId, TagStylePresetId, TagType } from '@/types/tag';
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
  conditionValue: TagConditionValue;
  languageCode: TagLanguageCode;
  textStylePresetId: TagStylePresetId;
  soldStylePresetId: TagStylePresetId;
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
  conditionValue,
  languageCode,
  textLabel,
}: {
  type: TagType;
  pricePreview: string;
  soldLabel: string;
  soldTextFormat: SoldTextFormat;
  conditionValue: TagConditionValue;
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
      return conditionValue;
    case 'quantity':
      return 'x4';
    case 'language':
      return languageCode;
  }
}

function SectionRow({ labelLines, children }: { labelLines: [string, string] | [string]; children: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <View
        accessibilityLabel={labelLines.join(' ')}
        accessibilityRole="header"
        style={styles.rowLabelWrap}>
        {labelLines.map((line, index) => (
          <Text importantForAccessibility="no" key={`${line}-${index}`} style={styles.rowLabel}>
            {line}
          </Text>
        ))}
      </View>
      <View style={styles.sectionRowContent}>{children}</View>
    </View>
  );
}

function ToolPreviewChip({
  type,
  label,
  caption,
  isActive,
  soldTextFormat,
  conditionValue,
  stylePresetId,
  onPress,
}: {
  type: TagType;
  label: string;
  caption: string;
  isActive: boolean;
  soldTextFormat?: SoldTextFormat;
  conditionValue?: TagConditionValue;
  stylePresetId?: TagStylePresetId;
  onPress: () => void;
}) {
  const isPlainSoldIcon = type === 'sold' && soldTextFormat === 'icon_plain';
  const isBadgeSoldIcon = type === 'sold' && soldTextFormat === 'icon';
  const isCondition = type === 'condition';
  const resolvedStylePresetId =
    stylePresetId && TAG_STYLE_PRESETS[stylePresetId]?.type === type
      ? stylePresetId
      : DEFAULT_TAG_STYLE_BY_TYPE[type];
  const preset = TAG_STYLE_PRESETS[isPlainSoldIcon ? 'sold-icon-plain' : resolvedStylePresetId];
  const conditionColors = CONDITION_GRADE_STYLES[conditionValue ?? 'NM'];
  const isTransparentChrome = isTransparentTagBackground(preset.backgroundColor);
  const isTransparentText = type === 'text' && isTransparentChrome;
  const isPlainText = isTransparentText && preset.borderColor === 'transparent';
  const backgroundColor = isCondition
    ? conditionColors.backgroundColor
    : isPlainSoldIcon || isPlainText
      ? 'transparent'
      : preset.backgroundColor;
  const borderColor = isCondition
    ? isActive
      ? theme.colors.textPrimary
      : conditionColors.borderColor
    : isPlainSoldIcon || isPlainText
      ? isActive
        ? theme.colors.textPrimary
        : 'transparent'
      : isActive
        ? theme.colors.textPrimary
        : preset.borderColor;
  const textColor = isCondition ? conditionColors.color : preset.color;
  const isLightText =
    textColor === '#FFFFFF' || textColor === theme.colors.white || textColor.toLowerCase() === '#fff';
  const previewBackgroundColor =
    isTransparentChrome && isLightText && !isPlainSoldIcon ? '#3A3F46' : backgroundColor;
  const previewBorderRadius =
    type === 'price' || type === 'text' || type === 'sold'
      ? (preset.borderRadius ?? theme.radius.sm)
      : type === 'condition'
        ? 16
        : theme.radius.sm;
  const previewBorderWidth = isCondition
    ? 2
    : type === 'price' || type === 'text' || type === 'sold'
      ? isPlainSoldIcon
        ? 0
        : (preset.borderWidth ?? (isPlainText ? 0 : 1))
      : undefined;
  const previewFontWeight =
    type === 'text' || type === 'price' || type === 'sold' ? (preset.fontWeight ?? '700') : undefined;

  const preview = (
    <View
      style={[
        styles.toolChipPreview,
        isActive && styles.activeToolChipPreview,
        isPlainSoldIcon && styles.plainSoldPreview,
        isPlainText && styles.plainTextPreview,
        isCondition && styles.conditionPreview,
        {
          backgroundColor: previewBackgroundColor,
          borderColor,
          borderWidth: previewBorderWidth,
          borderRadius: Math.min(previewBorderRadius, 20),
          ...(type === 'sold' && preset.rotateDeg
            ? { transform: [{ rotate: `${preset.rotateDeg}deg` as const }] }
            : null),
        },
      ]}>
      {isPlainSoldIcon || isBadgeSoldIcon ? (
        <SoldCrossIcon
          color={isPlainSoldIcon ? theme.colors.sold : preset.color}
          size={isPlainSoldIcon ? 26 : 16}
          thicknessScale={2}
        />
      ) : (
        <Text
          style={[
            styles.toolChipPreviewText,
            type === 'text' ? getTagTextShadowStyle(preset.textShadow ?? null) : null,
            isCondition && styles.conditionPreviewText,
            { color: textColor, fontWeight: previewFontWeight },
          ]}
          numberOfLines={1}>
          {label}
        </Text>
      )}
    </View>
  );

  return (
    <Pressable
      accessibilityLabel={caption}
      accessibilityRole="button"
      accessibilityState={isActive ? { selected: true } : undefined}
      hitSlop={4}
      onPress={onPress}
      style={[styles.toolChip, isActive && styles.activeToolChip]}>
      <View style={styles.toolChipPreviewSlot}>{preview}</View>
      <Text style={[styles.toolChipCaption, isActive && styles.activeToolChipCaption]} numberOfLines={1}>
        {caption}
      </Text>
    </Pressable>
  );
}

export function StylePickerPanel({
  stylePickerType,
  activeSizePresetId,
  priceTextFormat,
  soldTextFormat,
  conditionValue,
  languageCode,
  textStylePresetId,
  soldStylePresetId,
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
  const mainSectionTitle: [string, string] | [string] = language === 'th' ? ['ป้าย', 'หลัก'] : ['Main'];
  const infoSectionTitle: [string, string] | [string] = language === 'th' ? ['ป้าย', 'ข้อมูล'] : ['Info'];
  const sizeSectionTitle: [string, string] | [string] = language === 'th' ? ['ขนาด'] : ['Size'];

  return (
    <View style={styles.stylePickerPanel}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.handleRow}>
        <View style={styles.handle} />
      </View>

      <View style={styles.stylePickerHeader}>
        <Text style={styles.stylePickerTitle}>{t('editor.style')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('style.closePicker')} onPress={onClose} style={styles.stylePickerCloseButton}>
          <MaterialIcons color={theme.colors.textSecondary} name="close" size={20} />
        </Pressable>
      </View>

      <View collapsable={false} onLayout={onCoachSectionsLayout} ref={tagTypesSectionRef} style={styles.coachSection}>
        <SectionRow labelLines={mainSectionTitle}>
          <View style={styles.toolRow}>
            {MAIN_TAG_TYPES.map((type) => {
              const label = getToolPreviewLabel({
                type,
                pricePreview,
                soldLabel,
                soldTextFormat,
                conditionValue,
                languageCode,
                textLabel,
              });

              return (
                <ToolPreviewChip
                  key={type}
                  type={type}
                  label={label}
                  caption={t(`tag.${type}`)}
                  isActive={stylePickerType === type}
                  soldTextFormat={type === 'sold' ? soldTextFormat : undefined}
                  stylePresetId={
                    type === 'text' ? textStylePresetId : type === 'sold' ? soldStylePresetId : undefined
                  }
                  onPress={() => onSelectToolType(type)}
                />
              );
            })}
          </View>
        </SectionRow>

        <SectionRow labelLines={infoSectionTitle}>
          <View style={styles.toolRow}>
            {INFO_TAG_TYPES.map((type) => {
              const label = getToolPreviewLabel({
                type,
                pricePreview,
                soldLabel,
                soldTextFormat,
                conditionValue,
                languageCode,
                textLabel,
              });

              return (
                <ToolPreviewChip
                  key={type}
                  type={type}
                  label={label}
                  caption={t(`tag.${type}`)}
                  isActive={stylePickerType === type}
                  conditionValue={type === 'condition' ? conditionValue : undefined}
                  onPress={() => onSelectToolType(type)}
                />
              );
            })}
          </View>
        </SectionRow>
      </View>

      <View style={styles.divider} />

      <View collapsable={false} onLayout={onCoachSectionsLayout} ref={sizeSectionRef} style={styles.coachSection}>
        <SectionRow labelLines={sizeSectionTitle}>
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
        </SectionRow>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stylePickerPanel: {
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.photoMockItemBorder,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
    // Upward cast so the docked panel reads as a layer over the canvas.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  handleRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.photoMockItemBorder,
  },
  coachSection: {
    gap: theme.spacing.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  rowLabelWrap: {
    width: 44,
    justifyContent: 'center',
    gap: 0,
  },
  rowLabel: {
    ...theme.typography.caption,
    fontSize: 11,
    // Tight but non-overlapping lines for Thai two-line labels (ป้าย / หลัก).
    lineHeight: 14,
    color: theme.colors.textMuted,
  },
  sectionRowContent: {
    flex: 1,
    minWidth: 0,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  stylePickerHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stylePickerTitle: {
    ...theme.typography.button,
    fontSize: 14,
    // Extra line box so Thai above-marks (e.g. ล์) are not clipped.
    lineHeight: 22,
    paddingTop: 2,
    color: theme.colors.textPrimary,
  },
  stylePickerCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
  toolRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  toolChip: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    borderRadius: theme.radius.sm,
    // Keep borderWidth constant so selecting Main↔Info chips does not reflow row height.
    borderWidth: 2.5,
    borderColor: 'transparent',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  activeToolChip: {
    borderColor: theme.colors.accent,
  },
  /** Fixed slot so captions sit on one baseline across different preview heights. */
  toolChipPreviewSlot: {
    height: 32,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolChipCaption: {
    ...theme.typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: '100%',
  },
  activeToolChipCaption: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  toolChipPreview: {
    minHeight: 28,
    minWidth: 48,
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
  },
  plainSoldPreview: {
    minWidth: 28,
    borderWidth: 0,
    paddingHorizontal: 0,
  },
  conditionPreview: {
    width: 32,
    height: 32,
    minHeight: 32,
    minWidth: 32,
    maxWidth: 32,
    borderRadius: 16,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  conditionPreviewText: {
    fontStyle: 'italic',
    fontWeight: '800',
    fontSize: 11,
  },
  plainTextPreview: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  activeToolChipPreview: {
    borderWidth: 2,
  },
  toolChipPreviewText: {
    ...theme.typography.caption,
    fontSize: 11,
  },
  sizeOptionGrid: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  sizeOption: {
    minHeight: 40,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xs,
  },
  activeSizeOption: {
    borderColor: theme.colors.accent,
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
