import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps, ReactNode, RefObject } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  INFO_TAG_TYPES,
  MAIN_TAG_TYPES,
  TAG_CONDITION_VALUE_CYCLE,
  TAG_LANGUAGE_CODE_CYCLE,
  TAG_SIZE_ORDER,
  type TagPickerSizePresetId,
} from '@/constants/tagDefaults';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/LanguageContext';
import { TagStylePresetRow } from '@/components/editor/TagStylePresetRow';
import type { PriceTextFormat, TagConditionValue, TagLanguageCode, TagSizePresetId, TagStylePresetId, TagType } from '@/types/tag';
import { formatPriceDisplay, getPriceTextFormatsForCurrency } from '@/utils/priceText';

const SIZE_CHIP_LABELS: Record<TagPickerSizePresetId, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
  xl: 'XL',
};

const TAG_TYPE_ICONS: Record<TagType, ComponentProps<typeof MaterialIcons>['name']> = {
  price: 'sell',
  sold: 'do-not-disturb-on',
  text: 'title',
  condition: 'grade',
  quantity: 'numbers',
  language: 'language',
};

/** Sample amount for the price format chips (matches the seller-facing preview). */
const PRICE_FORMAT_SAMPLE_AMOUNT = '120';

/** Content body always reserves 3 control-row slots so grid and detail keep one sheet height. */
const PICKER_ROW_COUNT = 3;
const PICKER_ROW_HEIGHT = 40;
const PICKER_BODY_HEIGHT =
  PICKER_ROW_COUNT * PICKER_ROW_HEIGHT + (PICKER_ROW_COUNT - 1) * theme.spacing.sm;

type StylePickerPanelProps = {
  stylePickerType: TagType;
  activeStylePresetId: TagStylePresetId;
  activeSizePresetId: TagSizePresetId;
  priceTextFormat: PriceTextFormat;
  conditionValue: TagConditionValue;
  languageCode: TagLanguageCode;
  textStylePresetId: TagStylePresetId;
  soldStylePresetId: TagStylePresetId;
  tagTypesSectionRef?: RefObject<View | null>;
  sizeSectionRef?: RefObject<View | null>;
  onCoachSectionsLayout?: () => void;
  onClose: () => void;
  onSelectConditionValue: (value: TagConditionValue) => void;
  onSelectLanguageCode: (code: TagLanguageCode) => void;
  onSelectPriceTextFormat: (format: PriceTextFormat) => void;
  onSelectToolStylePreset: (type: TagType, stylePresetId: TagStylePresetId) => void;
  onSelectToolType: (type: TagType) => void;
  onSelectSizePreset: (sizePresetId: TagSizePresetId) => void;
};

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

function TagTypeIconCard({
  type,
  caption,
  isActive,
  onPress,
}: {
  type: TagType;
  caption: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={caption}
      accessibilityRole="button"
      accessibilityState={isActive ? { selected: true } : undefined}
      hitSlop={4}
      onPress={onPress}
      style={[styles.typeCard, isActive && styles.activeTypeCard]}>
      <MaterialIcons
        color={isActive ? theme.colors.textPrimary : theme.colors.textSecondary}
        name={TAG_TYPE_ICONS[type]}
        size={22}
      />
      <Text style={[styles.typeCardCaption, isActive && styles.activeTypeCardCaption]} numberOfLines={1}>
        {caption}
      </Text>
    </Pressable>
  );
}

export function StylePickerPanel({
  stylePickerType,
  activeStylePresetId,
  activeSizePresetId,
  priceTextFormat,
  conditionValue,
  languageCode,
  textStylePresetId,
  soldStylePresetId,
  tagTypesSectionRef,
  sizeSectionRef,
  onCoachSectionsLayout,
  onClose,
  onSelectConditionValue,
  onSelectLanguageCode,
  onSelectPriceTextFormat,
  onSelectToolStylePreset,
  onSelectToolType,
  onSelectSizePreset,
}: StylePickerPanelProps) {
  const { language, t } = useTranslation();
  const { currency } = useCurrency();
  const [detailType, setDetailType] = useState<TagType | null>(null);
  const showDetail = detailType === stylePickerType;
  const priceFormats = getPriceTextFormatsForCurrency(currency);
  const formatSectionTitle: [string] = [t('tag.dock.format')];
  const styleSectionTitle: [string] = [t('tag.dock.style')];
  const sizeSectionTitle: [string] = [t('tag.dock.size')];
  const detailActiveStylePresetId =
    stylePickerType === 'sold'
      ? soldStylePresetId
      : stylePickerType === 'text'
        ? textStylePresetId
        : activeStylePresetId;

  const handleTypePress = (type: TagType) => {
    onSelectToolType(type);
    setDetailType(type);
  };

  return (
    <View style={styles.stylePickerPanel}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.handleRow}>
        <View style={styles.handle} />
      </View>

      <View style={styles.stylePickerHeader}>
        {showDetail ? (
          <Pressable
            accessibilityLabel={t('editor.back')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setDetailType(null)}
            style={styles.stylePickerBackButton}>
            <MaterialIcons color={theme.colors.textPrimary} name="arrow-back" size={20} />
          </Pressable>
        ) : null}
        <Text style={styles.stylePickerTitle}>
          {showDetail
            ? stylePickerType === 'price' || stylePickerType === 'condition'
              ? t(`tag.typeTitles.${stylePickerType}`)
              : t(`tag.${stylePickerType}`)
            : t('editor.style')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('style.closePicker')}
          onPress={onClose}
          style={[styles.stylePickerCloseButton, styles.headerTrailingButton]}>
          <MaterialIcons color={theme.colors.textSecondary} name="close" size={20} />
        </Pressable>
      </View>

      {showDetail ? (
        <View style={[styles.coachSection, styles.pickerBody]}>
          {stylePickerType === 'price' ? (
            <SectionRow labelLines={formatSectionTitle}>
              <View style={styles.optionRow}>
                {priceFormats.map((format) => {
                  const isActive = format === priceTextFormat;
                  const sample = formatPriceDisplay(
                    PRICE_FORMAT_SAMPLE_AMOUNT,
                    format,
                    currency,
                    language,
                  );

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={isActive ? { selected: true } : undefined}
                      key={format}
                      onPress={() => onSelectPriceTextFormat(format)}
                      style={[styles.sizeOption, isActive && styles.activeSizeOption]}>
                      <Text
                        numberOfLines={1}
                        style={[styles.sizeOptionText, isActive && styles.activeSizeOptionText]}>
                        {sample}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SectionRow>
          ) : null}

          {stylePickerType === 'condition' ? (
            <SectionRow labelLines={[t('tag.dock.grade')]}>
              <View style={styles.optionRow}>
                {TAG_CONDITION_VALUE_CYCLE.map((value) => {
                  const isActive = value === conditionValue;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={isActive ? { selected: true } : undefined}
                      key={value}
                      onPress={() => onSelectConditionValue(value)}
                      style={[styles.sizeOption, isActive && styles.activeSizeOption]}>
                      <Text style={[styles.sizeOptionText, isActive && styles.activeSizeOptionText]}>
                        {value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SectionRow>
          ) : null}

          {stylePickerType === 'language' ? (
            <SectionRow labelLines={[t('tag.dock.language')]}>
              <View style={styles.optionRow}>
                {TAG_LANGUAGE_CODE_CYCLE.map((code) => {
                  const isActive = code === languageCode;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={isActive ? { selected: true } : undefined}
                      key={code}
                      onPress={() => onSelectLanguageCode(code)}
                      style={[styles.sizeOption, isActive && styles.activeSizeOption]}>
                      <Text style={[styles.sizeOptionText, isActive && styles.activeSizeOptionText]}>
                        {code}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SectionRow>
          ) : null}

          {stylePickerType === 'price' ||
          stylePickerType === 'sold' ||
          stylePickerType === 'text' ||
          stylePickerType === 'quantity' ? (
            <SectionRow labelLines={styleSectionTitle}>
              <TagStylePresetRow
                activeStylePresetId={detailActiveStylePresetId}
                onSelect={(stylePresetId) =>
                  onSelectToolStylePreset(stylePickerType, stylePresetId)
                }
                soldSampleLabel={t('tag.sold')}
                textSampleLabel={language === 'th' ? 'ก' : 'Aa'}
                type={stylePickerType}
              />
            </SectionRow>
          ) : null}

          <View collapsable={false} onLayout={onCoachSectionsLayout} ref={sizeSectionRef}>
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
                      <Text style={[styles.sizeOptionText, isActive && styles.activeSizeOptionText]}>
                        {SIZE_CHIP_LABELS[sizePresetId]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </SectionRow>
          </View>
        </View>
      ) : (
        <View
          collapsable={false}
          onLayout={onCoachSectionsLayout}
          ref={tagTypesSectionRef}
          style={[styles.coachSection, styles.pickerBody]}>
          <View style={styles.typeCardRow}>
            {MAIN_TAG_TYPES.map((type) => (
              <TagTypeIconCard
                caption={t(`tag.${type}`)}
                isActive={stylePickerType === type}
                key={type}
                onPress={() => handleTypePress(type)}
                type={type}
              />
            ))}
          </View>
          <View style={styles.typeCardRow}>
            {INFO_TAG_TYPES.map((type) => (
              <TagTypeIconCard
                caption={t(`tag.${type}`)}
                isActive={stylePickerType === type}
                key={type}
                onPress={() => handleTypePress(type)}
                type={type}
              />
            ))}
          </View>
        </View>
      )}
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
  /** Fixed body height shared by type grid and detail so the sheet does not jump. */
  pickerBody: {
    height: PICKER_BODY_HEIGHT,
    justifyContent: 'flex-start',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: PICKER_ROW_HEIGHT,
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
    gap: theme.spacing.xs,
  },
  stylePickerTitle: {
    ...theme.typography.button,
    flex: 1,
    fontSize: 14,
    // Extra line box so Thai above-marks (e.g. ล์) are not clipped.
    lineHeight: 22,
    paddingTop: 2,
    color: theme.colors.textPrimary,
  },
  stylePickerBackButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
  stylePickerCloseButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
  headerTrailingButton: {
    marginLeft: 'auto',
  },
  typeCardRow: {
    flex: 1,
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  activeTypeCard: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.photoMockBackground,
  },
  typeCardCaption: {
    ...theme.typography.caption,
    fontSize: 10,
    lineHeight: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: '100%',
  },
  activeTypeCardCaption: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
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
