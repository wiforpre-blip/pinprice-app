import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type KeyboardEvent } from 'react-native';

import { SoldCrossIcon } from '@/components/editor/SoldCrossIcon';
import { DEFAULT_QUANTITY, SOLD_ICON_TEXT, SOLD_TEXT_FORMAT_CYCLE, TAG_SIZE_ORDER, toPickerSizePreset, type TagPickerSizePresetId } from '@/constants/tagDefaults';
import {
  DEFAULT_TAG_SIZE_PRESET_ID,
  DEFAULT_TAG_STYLE_BY_TYPE,
  TAG_STYLE_PRESETS,
  getStylePresetForType,
  getStylePresetIdsForType,
  getTagTextShadowStyle,
  isTransparentTagBackground,
} from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/LanguageContext';
import type {
  ImageDisplayRect,
  PriceTag,
  PriceTextFormat,
  SoldTextFormat,
  TagEditorDraftPreview,
  TagEditorSaveUpdates,
  TagLanguageCode,
  TagSizePresetId,
  TagStylePresetId,
  TagType,
} from '@/types/tag';
import { extractPriceDigits, formatPriceDisplay, getPriceTextFormatsForCurrency, clampPriceTextFormat } from '@/utils/priceText';

type CanvasSize = {
  width: number;
  height: number;
};

type TagEditorProps = {
  canvasSize: CanvasSize;
  imageRect: ImageDisplayRect;
  isNewTag: boolean;
  tag: PriceTag | null;
  visible: boolean;
  onCancel: () => void;
  onDraftChange: (preview: TagEditorDraftPreview) => void;
  onSave: (tagId: string, updates: TagEditorSaveUpdates) => void;
};

const POPOVER_GAP = theme.spacing.sm;
const POPOVER_HEIGHT = 340;
const POPOVER_MIN_WIDTH = 240;
const POPOVER_MAX_WIDTH = 300;
const TAG_HEIGHT_OFFSET = 40;
const LANGUAGE_CODES: TagLanguageCode[] = ['TH', 'EN', 'JP', 'CN'];
const SIZE_CHIP_LABELS: Record<TagPickerSizePresetId, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
  xl: 'XL',
};
const PREVIEW_AMOUNT = '1000';
const TYPES_WITH_SIZE_PICKER: TagType[] = ['price', 'sold', 'text', 'language'];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPopoverPosition(tag: PriceTag, imageRect: ImageDisplayRect, canvasSize: CanvasSize, popoverWidth: number, keyboardInset: number) {
  const left = clamp((canvasSize.width - popoverWidth) / 2, POPOVER_GAP, Math.max(POPOVER_GAP, canvasSize.width - popoverWidth - POPOVER_GAP));
  const anchorY = imageRect.y + tag.y * imageRect.height;
  const belowTop = anchorY + TAG_HEIGHT_OFFSET;
  const aboveTop = anchorY - POPOVER_HEIGHT - POPOVER_GAP;
  const visibleBottom = Math.max(POPOVER_HEIGHT + POPOVER_GAP * 2, canvasSize.height - keyboardInset);
  const preferredTop = belowTop + POPOVER_HEIGHT > visibleBottom ? Math.max(POPOVER_GAP, aboveTop) : belowTop;
  const maxTop = Math.max(POPOVER_GAP, visibleBottom - POPOVER_HEIGHT - POPOVER_GAP);
  const top = clamp(preferredTop, POPOVER_GAP, maxTop);

  return { left, top };
}

function buildDisplayText({
  tag,
  priceAmount,
  priceTextFormat,
  soldTextFormat,
  quantity,
  languageCode,
  freeText,
  soldLabel,
  currency,
  language,
}: {
  tag: PriceTag;
  priceAmount: string;
  priceTextFormat: PriceTextFormat;
  soldTextFormat: SoldTextFormat;
  quantity: string;
  languageCode: TagLanguageCode;
  freeText: string;
  soldLabel: string;
  currency: Parameters<typeof formatPriceDisplay>[2];
  language: Parameters<typeof formatPriceDisplay>[3];
}) {
  switch (tag.type) {
    case 'price':
      return formatPriceDisplay(priceAmount, priceTextFormat, currency, language);
    case 'sold':
      return soldTextFormat === 'text' ? soldLabel : SOLD_ICON_TEXT;
    case 'text':
      return freeText.trim();
    case 'quantity': {
      const digits = extractPriceDigits(quantity) || String(DEFAULT_QUANTITY);
      return `x${Number(digits)}`;
    }
    case 'condition':
      return 'NM';
    case 'language':
      return languageCode;
  }
}

function OptionChip({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isActive ? { selected: true } : undefined}
      onPress={onPress}
      style={[styles.optionChip, isActive && styles.activeOptionChip]}>
      <Text style={[styles.optionChipText, isActive && styles.activeOptionChipText]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function SoldFormatChip({
  format,
  soldLabel,
  stylePresetId,
  isActive,
  onPress,
}: {
  format: SoldTextFormat;
  soldLabel: string;
  stylePresetId: TagStylePresetId;
  isActive: boolean;
  onPress: () => void;
}) {
  if (format === 'text') {
    return <OptionChip label={soldLabel} isActive={isActive} onPress={onPress} />;
  }

  const isPlain = format === 'icon_plain';
  const badgeStyleId =
    stylePresetId === 'sold-icon-plain' ? DEFAULT_TAG_STYLE_BY_TYPE.sold : getStylePresetForType('sold', stylePresetId);
  const badgePreset = TAG_STYLE_PRESETS[badgeStyleId];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isActive ? { selected: true } : undefined}
      onPress={onPress}
      style={[styles.optionChip, isActive && styles.activeOptionChip, isPlain && styles.plainSoldChip]}>
      <View
        style={[
          styles.soldFormatPreview,
          isPlain
            ? styles.soldFormatPreviewPlain
            : {
                backgroundColor: badgePreset.backgroundColor,
                borderColor: badgePreset.borderColor,
              },
        ]}>
        <SoldCrossIcon color={isPlain ? theme.colors.sold : badgePreset.color} size={isPlain ? 20 : 16} thicknessScale={2} />
      </View>
    </Pressable>
  );
}

function ColorPresetRow({
  type,
  activeStylePresetId,
  onSelect,
}: {
  type: PriceTag['type'];
  activeStylePresetId: TagStylePresetId;
  onSelect: (stylePresetId: TagStylePresetId) => void;
}) {
  return (
    <View style={styles.colorRow}>
      {getStylePresetIdsForType(type).map((stylePresetId) => {
        const preset = TAG_STYLE_PRESETS[stylePresetId];
        const isActive = stylePresetId === activeStylePresetId;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={isActive ? { selected: true } : undefined}
            key={stylePresetId}
            onPress={() => onSelect(stylePresetId)}
            style={[styles.colorSwatchOuter, isActive && styles.colorSwatchOuterActive]}>
            <View
              style={[
                styles.colorSwatchInner,
                {
                  backgroundColor: preset.backgroundColor,
                  borderColor: preset.borderColor === 'transparent' ? theme.colors.border : preset.borderColor,
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function TextStylePresetRow({
  activeStylePresetId,
  sampleLabel,
  onSelect,
}: {
  activeStylePresetId: TagStylePresetId;
  sampleLabel: string;
  onSelect: (stylePresetId: TagStylePresetId) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.colorRow}>
      {getStylePresetIdsForType('text').map((stylePresetId) => {
        const preset = TAG_STYLE_PRESETS[stylePresetId];
        const isActive = stylePresetId === activeStylePresetId;
        const isFlat = isTransparentTagBackground(preset.backgroundColor);

        return (
          <Pressable
            accessibilityLabel={preset.label}
            accessibilityRole="button"
            accessibilityState={isActive ? { selected: true } : undefined}
            key={stylePresetId}
            onPress={() => onSelect(stylePresetId)}
            style={[styles.textStyleChipOuter, isActive && styles.colorSwatchOuterActive]}>
            <View style={styles.textStyleStage}>
              <View
                style={[
                  styles.textStylePreview,
                  isFlat && styles.textStylePreviewPlain,
                  {
                    backgroundColor: isFlat ? 'transparent' : preset.backgroundColor,
                    borderColor: isFlat ? 'transparent' : preset.borderColor,
                  },
                ]}>
                <Text
                  style={[
                    styles.textStylePreviewText,
                    getTagTextShadowStyle(preset.textShadow ?? null),
                    { color: preset.color, fontWeight: preset.fontWeight ?? '700' },
                  ]}
                  numberOfLines={1}>
                  {sampleLabel}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SizePresetRow({
  activeSizePresetId,
  onSelect,
}: {
  activeSizePresetId: TagSizePresetId;
  onSelect: (sizePresetId: TagSizePresetId) => void;
}) {
  const { t } = useTranslation();
  const pickerActiveId = toPickerSizePreset(activeSizePresetId);

  return (
    <View style={styles.sizeBlock}>
      <Text style={styles.sectionLabel}>{t('style.size')}</Text>
      <View style={styles.optionRow}>
        {TAG_SIZE_ORDER.map((sizePresetId) => (
          <OptionChip
            key={sizePresetId}
            label={SIZE_CHIP_LABELS[sizePresetId]}
            isActive={sizePresetId === pickerActiveId}
            onPress={() => onSelect(sizePresetId)}
          />
        ))}
      </View>
    </View>
  );
}

export function TagEditor({
  canvasSize,
  imageRect,
  tag,
  visible,
  onCancel,
  onDraftChange,
  onSave,
}: TagEditorProps) {
  const { language, t } = useTranslation();
  const { currency } = useCurrency();
  const [priceAmount, setPriceAmount] = useState('');
  const [priceTextFormat, setPriceTextFormat] = useState<PriceTextFormat>('symbol');
  const [soldTextFormat, setSoldTextFormat] = useState<SoldTextFormat>('text');
  const [quantity, setQuantity] = useState(String(DEFAULT_QUANTITY));
  const [languageCode, setLanguageCode] = useState<TagLanguageCode>('TH');
  const [freeText, setFreeText] = useState('');
  const [stylePresetId, setStylePresetId] = useState<TagStylePresetId>(DEFAULT_TAG_STYLE_BY_TYPE.price);
  const [sizePresetId, setSizePresetId] = useState<TagSizePresetId>(DEFAULT_TAG_SIZE_PRESET_ID);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const popoverWidth = Math.min(POPOVER_MAX_WIDTH, Math.max(POPOVER_MIN_WIDTH, canvasSize.width - theme.spacing.lg * 2));
  const soldLabel = t('tag.sold');
  const priceFormats = getPriceTextFormatsForCurrency(currency);

  useEffect(() => {
    if (!visible || !tag) {
      return;
    }

    setStylePresetId(getStylePresetForType(tag.type, tag.stylePresetId));
    setSizePresetId(tag.sizePresetId ?? DEFAULT_TAG_SIZE_PRESET_ID);

    switch (tag.type) {
      case 'price':
        setPriceAmount(extractPriceDigits(tag.text));
        setPriceTextFormat(clampPriceTextFormat(currency, tag.priceTextFormat));
        break;
      case 'sold':
        setSoldTextFormat(tag.soldTextFormat ?? (tag.text === SOLD_ICON_TEXT ? 'icon' : 'text'));
        break;
      case 'text':
        setFreeText(tag.text);
        break;
      case 'quantity':
        setQuantity(String(tag.quantity ?? (extractPriceDigits(tag.text) || DEFAULT_QUANTITY)));
        break;
      case 'language':
        setLanguageCode(tag.languageCode ?? (LANGUAGE_CODES.includes(tag.text as TagLanguageCode) ? (tag.text as TagLanguageCode) : 'TH'));
        break;
      case 'condition':
        break;
    }
  }, [currency, tag, visible]);

  useEffect(() => {
    if (!visible || !tag || tag.type !== 'price') {
      return;
    }

    setPriceTextFormat((current) => clampPriceTextFormat(currency, current));
  }, [currency, tag, visible]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      setKeyboardInset(event.endCoordinates.height + POPOVER_GAP);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const displayText = useMemo(() => {
    if (!tag) {
      return '';
    }

    return buildDisplayText({
      tag,
      priceAmount,
      priceTextFormat,
      soldTextFormat,
      quantity,
      languageCode,
      freeText,
      soldLabel,
      currency,
      language,
    });
  }, [tag, priceAmount, priceTextFormat, soldTextFormat, quantity, languageCode, freeText, soldLabel, currency, language]);

  useEffect(() => {
    if (!visible || !tag) {
      return;
    }

    const preview: TagEditorDraftPreview = {
      text: displayText,
      stylePresetId: tag.type === 'sold' && soldTextFormat === 'icon_plain' ? 'sold-icon-plain' : stylePresetId,
      sizePresetId: TYPES_WITH_SIZE_PICKER.includes(tag.type) ? sizePresetId : tag.sizePresetId,
      priceTextFormat: tag.type === 'price' ? priceTextFormat : undefined,
      soldTextFormat: tag.type === 'sold' ? soldTextFormat : undefined,
      languageCode: tag.type === 'language' ? languageCode : undefined,
    };

    onDraftChange(preview);
  }, [displayText, languageCode, onDraftChange, priceTextFormat, sizePresetId, soldTextFormat, stylePresetId, tag, visible]);

  if (!visible || !tag) {
    return null;
  }

  const saveTag = () => {
    const sizeUpdate = TYPES_WITH_SIZE_PICKER.includes(tag.type) ? { sizePresetId } : {};

    switch (tag.type) {
      case 'price':
        onSave(tag.id, {
          text: displayText,
          stylePresetId,
          priceTextFormat: clampPriceTextFormat(currency, priceTextFormat),
          ...sizeUpdate,
        });
        break;
      case 'sold':
        onSave(tag.id, {
          text: displayText,
          stylePresetId: soldTextFormat === 'icon_plain' ? 'sold-icon-plain' : stylePresetId,
          soldTextFormat,
          ...sizeUpdate,
        });
        break;
      case 'text':
        onSave(tag.id, { text: displayText || (language === 'th' ? 'ข้อความ' : 'Text'), stylePresetId, ...sizeUpdate });
        break;
      case 'quantity': {
        const digits = extractPriceDigits(quantity) || String(DEFAULT_QUANTITY);
        onSave(tag.id, { text: displayText, stylePresetId, quantity: Number(digits) });
        break;
      }
      case 'condition':
        onSave(tag.id, { text: displayText, stylePresetId, condition: 'NM' });
        break;
      case 'language':
        onSave(tag.id, { text: displayText, stylePresetId, languageCode, ...sizeUpdate });
        break;
    }
  };

  const popoverPosition = getPopoverPosition(tag, imageRect, canvasSize, popoverWidth, keyboardInset);
  const showColorPresets =
    (tag.type === 'price' || tag.type === 'sold' || tag.type === 'quantity') &&
    !(tag.type === 'sold' && soldTextFormat === 'icon_plain');
  const showTextStylePresets = tag.type === 'text';
  const showSizePicker = TYPES_WITH_SIZE_PICKER.includes(tag.type);
  const titleKey = `tag.typeTitles.${tag.type}` as const;
  const title = t(titleKey);
  const textStyleSample = language === 'th' ? 'ก' : 'Aa';

  return (
    <View style={[styles.popover, popoverPosition, { width: popoverWidth }]}>
      <Text style={styles.title}>{title}</Text>

      {tag.type === 'price' ? (
        <>
          <TextInput
            autoCorrect={false}
            autoFocus
            keyboardType="number-pad"
            onChangeText={(nextText) => setPriceAmount(extractPriceDigits(nextText))}
            placeholder={PREVIEW_AMOUNT}
            placeholderTextColor={theme.colors.textMuted}
            returnKeyType="done"
            style={styles.input}
            value={priceAmount}
          />
          <View style={styles.optionRow}>
            {priceFormats.map((format) => {
              const sample = formatPriceDisplay(priceAmount || PREVIEW_AMOUNT, format, currency, language);
              return (
                <OptionChip key={format} label={sample} isActive={priceTextFormat === format} onPress={() => setPriceTextFormat(format)} />
              );
            })}
          </View>
        </>
      ) : null}

      {tag.type === 'sold' ? (
        <View style={styles.optionRow}>
          {SOLD_TEXT_FORMAT_CYCLE.map((format) => (
            <SoldFormatChip
              key={format}
              format={format}
              soldLabel={soldLabel}
              stylePresetId={stylePresetId}
              isActive={soldTextFormat === format}
              onPress={() => setSoldTextFormat(format)}
            />
          ))}
        </View>
      ) : null}

      {tag.type === 'text' ? (
        <TextInput
          autoCorrect={false}
          autoFocus
          onChangeText={setFreeText}
          placeholder={language === 'th' ? 'ข้อความ' : 'Text'}
          placeholderTextColor={theme.colors.textMuted}
          returnKeyType="done"
          style={styles.input}
          value={freeText}
        />
      ) : null}

      {tag.type === 'quantity' ? (
        <TextInput
          autoCorrect={false}
          autoFocus
          keyboardType="number-pad"
          onChangeText={(nextText) => setQuantity(extractPriceDigits(nextText))}
          placeholder={String(DEFAULT_QUANTITY)}
          placeholderTextColor={theme.colors.textMuted}
          returnKeyType="done"
          style={styles.input}
          value={quantity}
        />
      ) : null}

      {tag.type === 'condition' ? <Text style={styles.placeholderNote}>NM</Text> : null}

      {tag.type === 'language' ? (
        <View style={styles.optionRow}>
          {LANGUAGE_CODES.map((code) => (
            <OptionChip key={code} label={code} isActive={languageCode === code} onPress={() => setLanguageCode(code)} />
          ))}
        </View>
      ) : null}

      {showTextStylePresets ? (
        <TextStylePresetRow activeStylePresetId={stylePresetId} sampleLabel={textStyleSample} onSelect={setStylePresetId} />
      ) : null}

      {showColorPresets ? <ColorPresetRow type={tag.type} activeStylePresetId={stylePresetId} onSelect={setStylePresetId} /> : null}

      {showSizePicker ? <SizePresetRow activeSizePresetId={sizePresetId} onSelect={setSizePresetId} /> : null}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={saveTag} style={[styles.button, styles.saveButton]}>
          <Text style={[styles.buttonText, styles.saveButtonText]}>{t('tag.save')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.button, styles.cancelButton]}>
          <Text style={[styles.buttonText, styles.cancelButtonText]}>{t('tag.cancel')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  popover: {
    position: 'absolute',
    zIndex: 4,
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  title: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  sectionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  sizeBlock: {
    gap: theme.spacing.xs,
  },
  input: {
    minHeight: 44,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.sm,
    ...theme.typography.body,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionChip: {
    minHeight: 44,
    minWidth: 44,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
  },
  plainSoldChip: {
    backgroundColor: 'transparent',
  },
  soldFormatPreview: {
    minWidth: 28,
    minHeight: 28,
    borderRadius: theme.radius.sm - 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  soldFormatPreviewPlain: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  activeOptionChip: {
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.colors.photoMockBackground,
  },
  optionChipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  activeOptionChipText: {
    color: theme.colors.textPrimary,
  },
  colorRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  colorSwatchOuter: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  colorSwatchOuterActive: {
    borderColor: theme.colors.primary,
  },
  colorSwatchInner: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radius.sm - 2,
    borderWidth: 1,
  },
  textStyleChipOuter: {
    minWidth: 56,
    minHeight: 48,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  textStyleStage: {
    minWidth: 48,
    minHeight: 36,
    borderRadius: theme.radius.sm - 2,
    backgroundColor: theme.colors.photoMockBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
  },
  textStylePreview: {
    minHeight: 24,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm - 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  textStylePreviewPlain: {
    borderWidth: 0,
    paddingHorizontal: 2,
    backgroundColor: 'transparent',
  },
  textStylePreviewText: {
    ...theme.typography.caption,
    fontWeight: '700',
  },
  placeholderNote: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    minHeight: 44,
    textAlignVertical: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  button: {
    minHeight: 44,
    flex: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  buttonText: {
    ...theme.typography.caption,
  },
  saveButton: {
    backgroundColor: theme.buttons.primary.backgroundColor,
    borderColor: theme.buttons.primary.borderColor,
  },
  saveButtonText: {
    color: theme.buttons.primary.color,
  },
  cancelButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
  },
});
