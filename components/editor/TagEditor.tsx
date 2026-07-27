import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardEvent,
} from 'react-native';

import { SoldCrossIcon } from '@/components/editor/SoldCrossIcon';
import { DEFAULT_CONDITION_VALUE, DEFAULT_QUANTITY, SOLD_ICON_TEXT, SOLD_TEXT_FORMAT_CYCLE, TAG_CONDITION_VALUE_CYCLE, TAG_SIZE_ORDER, toPickerSizePreset, type TagPickerSizePresetId } from '@/constants/tagDefaults';
import {
  DEFAULT_TAG_SIZE_PRESET_ID,
  DEFAULT_TAG_STYLE_BY_TYPE,
  TAG_SIZE_PRESETS,
  TAG_STYLE_PRESETS,
  getStylePresetForType,
  getStylePresetIdsForType,
  getTagTextShadowStyle,
  isTransparentTagBackground,
  resolveConditionValueFromTag,
} from '@/constants/tagPresets';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/LanguageContext';
import type {
  ImageDisplayRect,
  PriceTag,
  PriceTextFormat,
  SoldTextFormat,
  TagConditionValue,
  TagEditorDraftPreview,
  TagEditorSaveUpdates,
  TagLanguageCode,
  TagSizePresetId,
  TagStylePresetId,
  TagType,
} from '@/types/tag';
import { FALLBACK_TAG_SIZE } from '@/utils/editorGeometry';
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

type DockMenu = 'main' | 'color' | 'style' | 'size' | 'format' | 'grade' | 'language';

const FLOAT_GAP = theme.spacing.sm;
const FLOAT_MIN_WIDTH = 160;
const FLOAT_MAX_WIDTH = 280;
const FLOAT_INPUT_HEIGHT = 52;
const FLOAT_CLOSE_ONLY_HEIGHT = 44;
const DOCK_HEIGHT_ESTIMATE = 64;
/** Extra pad beyond tag body so selection ring / long text stay clear of the float. */
const TAG_CLEARANCE_PAD = theme.spacing.md;
const LANGUAGE_CODES: TagLanguageCode[] = ['TH', 'EN', 'JP', 'CN'];
const SIZE_CHIP_LABELS: Record<TagPickerSizePresetId, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
  xl: 'XL',
};
const PREVIEW_AMOUNT = '1000';
const TYPES_WITH_SIZE_PICKER: TagType[] = ['price', 'sold', 'text', 'language'];
const TYPES_WITH_FLOAT_INPUT: TagType[] = ['price', 'text', 'quantity'];

type FloatPlacement = { left: number; top: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rectsOverlap(
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number }
) {
  return a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;
}

/** Same overlap signals as BottomSheetOverlay — Android edge-to-edge under-reports height alone. */
function getKeyboardHeight(coords: { height: number; screenY: number }) {
  const screenHeight = Dimensions.get('screen').height;
  const windowHeight = Dimensions.get('window').height;
  const fromScreenY = screenHeight - coords.screenY;
  const fromWindowY = windowHeight - coords.screenY;

  return Math.max(0, coords.height, fromScreenY, fromWindowY);
}

function estimateFloatHeight(tagType: TagType) {
  if (TYPES_WITH_FLOAT_INPUT.includes(tagType)) {
    return FLOAT_INPUT_HEIGHT;
  }

  return FLOAT_CLOSE_ONLY_HEIGHT;
}

function estimateTagClearance(tag: PriceTag) {
  const sizePreset = TAG_SIZE_PRESETS[tag.sizePresetId ?? DEFAULT_TAG_SIZE_PRESET_ID];
  return {
    width: Math.max(FALLBACK_TAG_SIZE.width, sizePreset.maxWidth * 0.45, sizePreset.minHeight * 2) + TAG_CLEARANCE_PAD,
    height: Math.max(FALLBACK_TAG_SIZE.height, sizePreset.minHeight + sizePreset.paddingVertical * 2) + TAG_CLEARANCE_PAD,
  };
}

/**
 * Place float around the tag without covering it.
 * Prefer above/below; fall back to left/right. Never clamp into the tag rect.
 */
function getFloatPosition(
  tag: PriceTag,
  imageRect: ImageDisplayRect,
  canvasSize: CanvasSize,
  floatWidth: number,
  floatHeight: number,
  keyboardOverlap: number
): FloatPlacement {
  const tagLeft = imageRect.x + tag.x * imageRect.width;
  const tagTop = imageRect.y + tag.y * imageRect.height;
  const clearance = estimateTagClearance(tag);
  const tagRect = {
    left: tagLeft - TAG_CLEARANCE_PAD / 2,
    top: tagTop - TAG_CLEARANCE_PAD / 2,
    width: clearance.width,
    height: clearance.height,
  };
  const tagCenterX = tagLeft + clearance.width / 2;
  const centeredLeft = clamp(
    tagCenterX - floatWidth / 2,
    FLOAT_GAP,
    Math.max(FLOAT_GAP, canvasSize.width - floatWidth - FLOAT_GAP)
  );

  const visibleTop = FLOAT_GAP;
  const visibleBottom = Math.max(
    floatHeight + FLOAT_GAP * 2,
    canvasSize.height - keyboardOverlap - DOCK_HEIGHT_ESTIMATE - FLOAT_GAP
  );
  const maxTop = Math.max(visibleTop, visibleBottom - floatHeight - FLOAT_GAP);

  const aboveTop = tagRect.top - floatHeight - FLOAT_GAP;
  const belowTop = tagRect.top + tagRect.height + FLOAT_GAP;
  const sideTop = clamp(tagRect.top, visibleTop, maxTop);
  const leftSide = tagRect.left - floatWidth - FLOAT_GAP;
  const rightSide = tagRect.left + tagRect.width + FLOAT_GAP;

  const candidates: Array<FloatPlacement & { score: number }> = [];

  const pushIfValid = (left: number, top: number, score: number) => {
    if (left < FLOAT_GAP - 0.5 || left + floatWidth > canvasSize.width - FLOAT_GAP + 0.5) {
      return;
    }

    if (top < visibleTop - 0.5 || top + floatHeight > visibleBottom + 0.5) {
      return;
    }

    const floatRect = { left, top, width: floatWidth, height: floatHeight };
    if (rectsOverlap(floatRect, tagRect)) {
      return;
    }

    candidates.push({ left, top, score });
  };

  pushIfValid(centeredLeft, aboveTop, 300 + (aboveTop - visibleTop));
  pushIfValid(centeredLeft, belowTop, 200 + (visibleBottom - (belowTop + floatHeight)));
  pushIfValid(leftSide, sideTop, 100);
  pushIfValid(rightSide, sideTop, 100);
  pushIfValid(leftSide, clamp(tagRect.top - floatHeight / 2, visibleTop, maxTop), 80);
  pushIfValid(rightSide, clamp(tagRect.top - floatHeight / 2, visibleTop, maxTop), 80);

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return { left: candidates[0].left, top: candidates[0].top };
  }

  // Last resort: keep clear of the tag even if partially tight against keyboard/edges.
  if (rightSide + floatWidth <= canvasSize.width - FLOAT_GAP) {
    return { left: rightSide, top: sideTop };
  }

  if (leftSide >= FLOAT_GAP) {
    return { left: leftSide, top: sideTop };
  }

  if (tagRect.top > canvasSize.height / 2) {
    return {
      left: centeredLeft,
      top: Math.min(maxTop, Math.max(visibleTop, tagRect.top - floatHeight - FLOAT_GAP)),
    };
  }

  return {
    left: centeredLeft,
    top: Math.min(maxTop, Math.max(visibleTop, tagRect.top + tagRect.height + FLOAT_GAP)),
  };
}

function buildDisplayText({
  tag,
  priceAmount,
  priceTextFormat,
  soldTextFormat,
  quantity,
  languageCode,
  conditionValue,
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
  conditionValue: TagConditionValue;
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
      return conditionValue;
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

function DockMenuButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      // Keep soft keyboard up when switching dock menus (avoids layout jump).
      onPress={onPress}
      style={styles.dockMenuButton}>
      <Text style={styles.dockMenuButtonText} numberOfLines={1}>
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
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="always"
      showsHorizontalScrollIndicator={false}
      style={styles.subMenuScroll}
      contentContainerStyle={styles.colorRow}>
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
    </ScrollView>
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
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="always"
      showsHorizontalScrollIndicator={false}
      style={styles.textStyleScroll}
      contentContainerStyle={styles.colorRow}>
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

function SizePresetChips({
  activeSizePresetId,
  onSelect,
}: {
  activeSizePresetId: TagSizePresetId;
  onSelect: (sizePresetId: TagSizePresetId) => void;
}) {
  const pickerActiveId = toPickerSizePreset(activeSizePresetId);

  return (
    <View style={styles.sizeChipRow}>
      {TAG_SIZE_ORDER.map((sizePresetId) => (
        <OptionChip
          key={sizePresetId}
          label={SIZE_CHIP_LABELS[sizePresetId]}
          isActive={sizePresetId === pickerActiveId}
          onPress={() => onSelect(sizePresetId)}
        />
      ))}
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
  const hostRef = useRef<View>(null);
  const inputRef = useRef<TextInput>(null);
  const ignoreKeyboardHideRef = useRef(false);
  const [priceAmount, setPriceAmount] = useState('');
  const [priceTextFormat, setPriceTextFormat] = useState<PriceTextFormat>('symbol');
  const [soldTextFormat, setSoldTextFormat] = useState<SoldTextFormat>('text');
  const [quantity, setQuantity] = useState(String(DEFAULT_QUANTITY));
  const [languageCode, setLanguageCode] = useState<TagLanguageCode>('TH');
  const [conditionValue, setConditionValue] = useState<TagConditionValue>(DEFAULT_CONDITION_VALUE);
  const [freeText, setFreeText] = useState('');
  const [stylePresetId, setStylePresetId] = useState<TagStylePresetId>(DEFAULT_TAG_STYLE_BY_TYPE.price);
  const [sizePresetId, setSizePresetId] = useState<TagSizePresetId>(DEFAULT_TAG_SIZE_PRESET_ID);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const [activeDockMenu, setActiveDockMenu] = useState<DockMenu>('main');
  const soldLabel = t('tag.sold');
  const priceFormats = getPriceTextFormatsForCurrency(currency);

  useEffect(() => {
    if (!visible || !tag) {
      return;
    }

    setActiveDockMenu('main');
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
        setConditionValue(resolveConditionValueFromTag(tag));
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
    if (!visible) {
      setKeyboardOverlap(0);
      setActiveDockMenu('main');
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let settleTimerA: ReturnType<typeof setTimeout> | null = null;
    let settleTimerB: ReturnType<typeof setTimeout> | null = null;
    let settleTimerC: ReturnType<typeof setTimeout> | null = null;

    const clearSettleTimers = () => {
      if (settleTimerA) {
        clearTimeout(settleTimerA);
      }
      if (settleTimerB) {
        clearTimeout(settleTimerB);
      }
      if (settleTimerC) {
        clearTimeout(settleTimerC);
      }
      settleTimerA = null;
      settleTimerB = null;
      settleTimerC = null;
    };

    const applyOverlap = (keyboardTop: number, keyboardHeight: number) => {
      hostRef.current?.measure((_x, _y, _width, height, _pageX, pageY) => {
        if (height <= 0) {
          setKeyboardOverlap(Math.max(0, Math.round(keyboardHeight)));
          return;
        }

        // pageY matches endCoordinates.screenY space (same pattern as drag/delete hit-testing).
        const hostBottom = pageY + height;
        setKeyboardOverlap(Math.max(0, Math.round(hostBottom - keyboardTop)));
      });
    };

    const scheduleOverlapUpdate = (keyboardTop: number, keyboardHeight: number) => {
      clearSettleTimers();
      applyOverlap(keyboardTop, keyboardHeight);
      requestAnimationFrame(() => applyOverlap(keyboardTop, keyboardHeight));
      settleTimerA = setTimeout(() => applyOverlap(keyboardTop, keyboardHeight), 50);
      settleTimerB = setTimeout(() => applyOverlap(keyboardTop, keyboardHeight), 120);
      settleTimerC = setTimeout(() => applyOverlap(keyboardTop, keyboardHeight), 280);
    };

    const updateOverlapFromKeyboard = (event: KeyboardEvent) => {
      const keyboardHeight = getKeyboardHeight(event.endCoordinates);
      if (keyboardHeight <= 0) {
        setKeyboardOverlap(0);
        return;
      }

      scheduleOverlapUpdate(event.endCoordinates.screenY, keyboardHeight);
    };

    const syncFromKeyboardMetrics = () => {
      const metrics = Keyboard.metrics();
      if (!metrics || metrics.height <= 0) {
        return;
      }

      scheduleOverlapUpdate(metrics.screenY, getKeyboardHeight(metrics));
    };

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, updateOverlapFromKeyboard);
    const didShowSubscription =
      Platform.OS === 'ios' ? Keyboard.addListener('keyboardDidShow', updateOverlapFromKeyboard) : null;
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      if (ignoreKeyboardHideRef.current) {
        return;
      }

      clearSettleTimers();
      setKeyboardOverlap(0);
    });

    // autoFocus can open the keyboard before listeners attach — sync current frame.
    syncFromKeyboardMetrics();
    settleTimerC = setTimeout(syncFromKeyboardMetrics, 100);

    return () => {
      clearSettleTimers();
      showSubscription.remove();
      didShowSubscription?.remove();
      hideSubscription.remove();
    };
  }, [visible]);

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
      conditionValue,
      freeText,
      soldLabel,
      currency,
      language,
    });
  }, [tag, priceAmount, priceTextFormat, soldTextFormat, quantity, languageCode, conditionValue, freeText, soldLabel, currency, language]);

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
      condition: tag.type === 'condition' ? conditionValue : undefined,
      languageCode: tag.type === 'language' ? languageCode : undefined,
    };

    onDraftChange(preview);
  }, [conditionValue, displayText, languageCode, onDraftChange, priceTextFormat, sizePresetId, soldTextFormat, stylePresetId, tag, visible]);

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
        onSave(tag.id, { text: displayText, stylePresetId, condition: conditionValue });
        break;
      case 'language':
        onSave(tag.id, { text: displayText, stylePresetId, languageCode, ...sizeUpdate });
        break;
    }
  };

  const scheduleKeyboardSync = () => {
    const metrics = Keyboard.metrics();
    if (!metrics || metrics.height <= 0) {
      return;
    }

    const keyboardHeight = Math.max(
      0,
      metrics.height,
      Dimensions.get('screen').height - metrics.screenY,
      Dimensions.get('window').height - metrics.screenY
    );

    const apply = () => {
      hostRef.current?.measure((_x, _y, _width, height, _pageX, pageY) => {
        if (height <= 0) {
          setKeyboardOverlap(Math.round(keyboardHeight));
          return;
        }

        setKeyboardOverlap(Math.max(0, Math.round(pageY + height - metrics.screenY)));
      });
    };

    apply();
    requestAnimationFrame(apply);
    setTimeout(apply, 80);
  };

  const showFloatInput = TYPES_WITH_FLOAT_INPUT.includes(tag.type);
  const floatWidth = showFloatInput
    ? Math.min(FLOAT_MAX_WIDTH, Math.max(FLOAT_MIN_WIDTH, canvasSize.width - theme.spacing.lg * 2))
    : FLOAT_CLOSE_ONLY_HEIGHT;
  const floatHeight = estimateFloatHeight(tag.type);
  const floatPlacementTag = { ...tag, sizePresetId };
  const floatPosition = getFloatPosition(floatPlacementTag, imageRect, canvasSize, floatWidth, floatHeight, keyboardOverlap);
  const showColorMenu =
    (tag.type === 'price' || tag.type === 'sold' || tag.type === 'quantity') &&
    !(tag.type === 'sold' && soldTextFormat === 'icon_plain');
  const showStyleMenu = tag.type === 'text';
  const showSizeMenu = TYPES_WITH_SIZE_PICKER.includes(tag.type);
  const showPriceFormatMenu = tag.type === 'price';
  const showSoldFormatMenu = tag.type === 'sold';
  const showGradeMenu = tag.type === 'condition';
  const showLanguageMenu = tag.type === 'language';
  const textStyleSample = language === 'th' ? 'ก' : 'Aa';

  const keepInputFocused = () => {
    if (!showFloatInput) {
      return;
    }

    ignoreKeyboardHideRef.current = true;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    setTimeout(() => {
      ignoreKeyboardHideRef.current = false;
      // Re-sync in case a hide was skipped while we held focus.
      const metrics = Keyboard.metrics();
      if (metrics && metrics.height > 0) {
        scheduleKeyboardSync();
      }
    }, 450);
  };

  const openDockMenu = (menu: DockMenu) => {
    setActiveDockMenu(menu);
    keepInputFocused();
  };

  const withKeepFocus = <T,>(apply: (value: T) => void) => {
    return (value: T) => {
      apply(value);
      keepInputFocused();
    };
  };

  const renderCloseButton = () => (
    <Pressable
      accessibilityLabel={t('tag.cancel')}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onCancel}
      style={styles.closeButton}>
      <MaterialIcons color={theme.colors.textSecondary} name="close" size={18} />
    </Pressable>
  );

  const renderMainDock = () => (
    <View style={styles.dockContent}>
      {showSoldFormatMenu ? <DockMenuButton label={t('tag.dock.format')} onPress={() => openDockMenu('format')} /> : null}
      {showGradeMenu ? <DockMenuButton label={t('tag.dock.grade')} onPress={() => openDockMenu('grade')} /> : null}
      {showLanguageMenu ? <DockMenuButton label={t('tag.dock.language')} onPress={() => openDockMenu('language')} /> : null}
      {showColorMenu ? <DockMenuButton label={t('tag.dock.color')} onPress={() => openDockMenu('color')} /> : null}
      {showPriceFormatMenu ? <DockMenuButton label={t('tag.dock.format')} onPress={() => openDockMenu('format')} /> : null}
      {showStyleMenu ? <DockMenuButton label={t('tag.dock.style')} onPress={() => openDockMenu('style')} /> : null}
      {showSizeMenu ? <DockMenuButton label={t('tag.dock.size')} onPress={() => openDockMenu('size')} /> : null}
      <Pressable accessibilityRole="button" onPress={saveTag} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>{t('tag.save')}</Text>
      </Pressable>
    </View>
  );

  const renderSubDock = () => (
    <View style={styles.dockContent}>
      <Pressable
        accessibilityLabel={t('editor.back')}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => openDockMenu('main')}
        style={styles.backButton}>
        <MaterialIcons color={theme.colors.textPrimary} name="arrow-back" size={20} />
      </Pressable>

      {activeDockMenu === 'color' && showColorMenu ? (
        <ColorPresetRow type={tag.type} activeStylePresetId={stylePresetId} onSelect={withKeepFocus(setStylePresetId)} />
      ) : null}

      {activeDockMenu === 'style' && showStyleMenu ? (
        <TextStylePresetRow
          activeStylePresetId={stylePresetId}
          sampleLabel={textStyleSample}
          onSelect={withKeepFocus(setStylePresetId)}
        />
      ) : null}

      {activeDockMenu === 'size' && showSizeMenu ? (
        <SizePresetChips activeSizePresetId={sizePresetId} onSelect={withKeepFocus(setSizePresetId)} />
      ) : null}

      {activeDockMenu === 'format' && showPriceFormatMenu ? (
        <View style={styles.optionRow}>
          {priceFormats.map((format) => {
            const sample = formatPriceDisplay(priceAmount || PREVIEW_AMOUNT, format, currency, language);
            return (
              <OptionChip
                key={format}
                label={sample}
                isActive={priceTextFormat === format}
                onPress={() => withKeepFocus(setPriceTextFormat)(format)}
              />
            );
          })}
        </View>
      ) : null}

      {activeDockMenu === 'format' && showSoldFormatMenu ? (
        <View style={styles.optionRow}>
          {SOLD_TEXT_FORMAT_CYCLE.map((format) => (
            <SoldFormatChip
              key={format}
              format={format}
              soldLabel={soldLabel}
              stylePresetId={stylePresetId}
              isActive={soldTextFormat === format}
              onPress={() => withKeepFocus(setSoldTextFormat)(format)}
            />
          ))}
        </View>
      ) : null}

      {activeDockMenu === 'grade' && showGradeMenu ? (
        <View style={styles.optionRow}>
          {TAG_CONDITION_VALUE_CYCLE.map((grade) => (
            <OptionChip
              key={grade}
              label={grade}
              isActive={conditionValue === grade}
              onPress={() => withKeepFocus(setConditionValue)(grade)}
            />
          ))}
        </View>
      ) : null}

      {activeDockMenu === 'language' && showLanguageMenu ? (
        <View style={styles.optionRow}>
          {LANGUAGE_CODES.map((code) => (
            <OptionChip
              key={code}
              label={code}
              isActive={languageCode === code}
              onPress={() => withKeepFocus(setLanguageCode)(code)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View pointerEvents="box-none" ref={hostRef} style={styles.host}>
      <View style={[styles.float, floatPosition, { width: floatWidth }]}>
        {tag.type === 'price' ? (
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              autoCorrect={false}
              autoFocus
              blurOnSubmit={false}
              keyboardType="number-pad"
              onChangeText={(nextText) => setPriceAmount(extractPriceDigits(nextText))}
              onFocus={scheduleKeyboardSync}
              placeholder={PREVIEW_AMOUNT}
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              style={styles.input}
              value={priceAmount}
            />
            {renderCloseButton()}
          </View>
        ) : null}

        {tag.type === 'text' ? (
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              autoCorrect={false}
              autoFocus
              blurOnSubmit={false}
              onChangeText={setFreeText}
              onFocus={scheduleKeyboardSync}
              placeholder={language === 'th' ? 'ข้อความ' : 'Text'}
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              style={styles.input}
              value={freeText}
            />
            {renderCloseButton()}
          </View>
        ) : null}

        {tag.type === 'quantity' ? (
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              autoCorrect={false}
              autoFocus
              blurOnSubmit={false}
              keyboardType="number-pad"
              onChangeText={(nextText) => setQuantity(extractPriceDigits(nextText))}
              onFocus={scheduleKeyboardSync}
              placeholder={String(DEFAULT_QUANTITY)}
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="done"
              style={styles.input}
              value={quantity}
            />
            {renderCloseButton()}
          </View>
        ) : null}

        {!showFloatInput ? (
          <Pressable
            accessibilityLabel={t('tag.cancel')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={onCancel}
            style={styles.closeOnlyButton}>
            <MaterialIcons color={theme.colors.textSecondary} name="close" size={18} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.dock, { bottom: keyboardOverlap }]}>
        <ScrollView
          bounces={false}
          horizontal={false}
          keyboardShouldPersistTaps="always"
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}>
          {activeDockMenu === 'main' ? renderMainDock() : renderSubDock()}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  float: {
    position: 'absolute',
    zIndex: 5,
    gap: theme.spacing.xs,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    ...theme.shadows.card,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.sm,
    ...theme.typography.body,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeOnlyButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 6,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.photoMockItemBorder,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  dockContent: {
    minHeight: 44,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dockMenuButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
  },
  dockMenuButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  optionChip: {
    minHeight: 44,
    minWidth: 44,
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
  textStyleScroll: {
    flex: 1,
    minWidth: 0,
  },
  subMenuScroll: {
    flex: 1,
    minWidth: 0,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingRight: theme.spacing.xs,
  },
  colorSwatchOuter: {
    width: 40,
    height: 40,
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
    minWidth: 48,
    minHeight: 40,
    borderRadius: theme.radius.sm,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  textStyleStage: {
    minWidth: 40,
    minHeight: 32,
    borderRadius: theme.radius.sm - 2,
    backgroundColor: theme.colors.photoMockBackground,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 4,
  },
  textStylePreview: {
    minHeight: 22,
    minWidth: 26,
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
  sizeChipRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  saveButton: {
    minHeight: 44,
    minWidth: 72,
    marginLeft: 'auto',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    backgroundColor: theme.buttons.primary.backgroundColor,
    borderColor: theme.buttons.primary.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  saveButtonText: {
    ...theme.typography.caption,
    color: theme.buttons.primary.color,
  },
});
