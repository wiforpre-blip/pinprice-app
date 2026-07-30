import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
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
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SoldCrossIcon } from '@/components/editor/SoldCrossIcon';
import type { TagInlineEdit } from '@/components/editor/TagOverlay';
import { DEFAULT_CONDITION_VALUE, DEFAULT_QUANTITY, DEFAULT_SOLD_TEXT_FORMAT, QUANTITY_MAX_DIGITS, SOLD_ICON_TEXT, TAG_CONDITION_VALUE_CYCLE, TAG_SIZE_ORDER, toPickerSizePreset, type TagPickerSizePresetId } from '@/constants/tagDefaults';
import {
  DEFAULT_TAG_SIZE_PRESET_ID,
  DEFAULT_TAG_STYLE_BY_TYPE,
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
import { extractPriceDigits, formatPriceDisplay, getPriceTextFormatsForCurrency, clampPriceTextFormat } from '@/utils/priceText';

type CanvasSize = {
  width: number;
  height: number;
};

type TagEditorProps = {
  /** Kept for call-site stability; keyboard overlays canvas (no lift). */
  canvasSize: CanvasSize;
  /** Kept for call-site stability; keyboard overlays canvas (no lift). */
  imageRect: ImageDisplayRect;
  /** Forwarded TextInput ref from the selected TagOverlay (inline edit). */
  inputRef?: RefObject<TextInput | null>;
  isNewTag: boolean;
  /** Coach spotlight target for the dock Save action. */
  saveButtonRef?: RefObject<View | null>;
  tag: PriceTag | null;
  visible: boolean;
  onCancel: () => void;
  /** Always reports 0 — keyboard overlays canvas instead of lifting it. */
  onCanvasLiftChange?: (liftY: number) => void;
  /** Canvas-relative keyboard overlap (px) for draft-preview visibility only. */
  onKeyboardOverlapChange?: (overlap: number) => void;
  onDraftChange: (preview: TagEditorDraftPreview, options?: { syncOnly?: boolean }) => void;
  onInlineEditChange?: (edit: TagInlineEdit | null) => void;
  onSave: (tagId: string, updates: TagEditorSaveUpdates) => void;
  onSaveButtonLayout?: () => void;
};

type DockMenu = 'main' | 'color' | 'style' | 'size' | 'format' | 'grade' | 'language';

const PRICE_AMOUNT_MAX_DIGITS = 6;
const LANGUAGE_CODES: TagLanguageCode[] = ['TH', 'EN', 'JP', 'CN'];
const SIZE_CHIP_LABELS: Record<TagPickerSizePresetId, string> = {
  small: 'S',
  medium: 'M',
  large: 'L',
  xl: 'XL',
};
const PREVIEW_AMOUNT = '1000';
const TYPES_WITH_SIZE_PICKER: TagType[] = ['price', 'sold', 'text', 'quantity', 'language'];
export const TYPES_WITH_INLINE_INPUT: TagType[] = ['price', 'text', 'quantity'];
/** Used when IME height is not measured yet — parks the dock above an estimated keyboard. */
const PROVISIONAL_KEYBOARD_OVERLAP = Platform.OS === 'ios' ? 320 : 280;
/** Late fallback if autoFocus never raised the IME (hardware keyboard / rare devices). */
const INLINE_FOCUS_FALLBACK_MS = 600;

/** Same overlap signals as BottomSheetOverlay — Android edge-to-edge under-reports height alone. */
function getKeyboardHeight(coords: { height: number; screenY: number }) {
  const screenHeight = Dimensions.get('screen').height;
  const windowHeight = Dimensions.get('window').height;
  const fromScreenY = screenHeight - coords.screenY;
  const fromWindowY = windowHeight - coords.screenY;

  return Math.max(0, coords.height, fromScreenY, fromWindowY);
}

type KeyboardSettleTimers = {
  a: ReturnType<typeof setTimeout> | null;
  b: ReturnType<typeof setTimeout> | null;
  c: ReturnType<typeof setTimeout> | null;
};

function clearKeyboardSettleTimers(timers: KeyboardSettleTimers) {
  if (timers.a) {
    clearTimeout(timers.a);
  }
  if (timers.b) {
    clearTimeout(timers.b);
  }
  if (timers.c) {
    clearTimeout(timers.c);
  }
  timers.a = null;
  timers.b = null;
  timers.c = null;
}

/** Measure host vs keyboard top; fall back to keyboard height when host layout is not ready. */
function applyHostKeyboardOverlap(
  getHost: () => View | null,
  keyboardTop: number,
  keyboardHeight: number,
  onOverlap: (overlap: number) => void,
) {
  getHost()?.measure((_x, _y, _width, height, _pageX, pageY) => {
    if (height <= 0) {
      onOverlap(Math.max(0, Math.round(keyboardHeight)));
      return;
    }

    // pageY matches endCoordinates.screenY space (same pattern as drag/delete hit-testing).
    onOverlap(Math.max(0, Math.round(pageY + height - keyboardTop)));
  });
}

/** Re-measure across keyboard animation settle frames (IME height/position can lag). */
function scheduleHostKeyboardOverlapUpdate(
  getHost: () => View | null,
  timers: KeyboardSettleTimers,
  keyboardTop: number,
  keyboardHeight: number,
  onOverlap: (overlap: number) => void,
) {
  clearKeyboardSettleTimers(timers);
  const apply = () => applyHostKeyboardOverlap(getHost, keyboardTop, keyboardHeight, onOverlap);
  apply();
  requestAnimationFrame(apply);
  timers.a = setTimeout(apply, 50);
  timers.b = setTimeout(apply, 120);
  timers.c = setTimeout(apply, 280);
}

function syncHostKeyboardOverlapFromMetrics(
  getHost: () => View | null,
  timers: KeyboardSettleTimers,
  onOverlap: (overlap: number) => void,
) {
  const metrics = Keyboard.metrics();
  if (!metrics || metrics.height <= 0) {
    return;
  }

  scheduleHostKeyboardOverlapUpdate(getHost, timers, metrics.screenY, getKeyboardHeight(metrics), onOverlap);
}

/** Reject over-limit edits without setState so the controlled input does not flash then revert. */
function acceptPriceDigits(nextText: string, currentDigits: string) {
  const digits = extractPriceDigits(nextText);
  if (digits.length <= PRICE_AMOUNT_MAX_DIGITS) {
    return digits;
  }

  // Already at cap: keep current so a 7th keypress does not insert-then-revert.
  if (currentDigits.length >= PRICE_AMOUNT_MAX_DIGITS) {
    return currentDigits;
  }

  return digits.slice(0, PRICE_AMOUNT_MAX_DIGITS);
}

function acceptQuantityDigits(nextText: string, currentDigits: string) {
  const digits = extractPriceDigits(nextText);
  if (digits.length <= QUANTITY_MAX_DIGITS) {
    return digits;
  }

  if (currentDigits.length >= QUANTITY_MAX_DIGITS) {
    return currentDigits;
  }

  return digits.slice(0, QUANTITY_MAX_DIGITS);
}

/** Never poke native focus while the IME is already up (avoids restart flicker). */
function focusInlineInputIfNeeded(input: TextInput | null | undefined) {
  if (!input) {
    return;
  }

  if ((Keyboard.metrics()?.height ?? 0) > 0) {
    return;
  }

  input.focus();
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

function OptionChip({
  label,
  isActive,
  onPress,
  style,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isActive ? { selected: true } : undefined}
      onPress={onPress}
      style={[styles.optionChip, isActive && styles.activeOptionChip, style]}>
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

function ColorPresetRow({
  type,
  activeStylePresetId,
  onSelect,
  soldSampleLabel = 'SOLD',
}: {
  type: PriceTag['type'];
  activeStylePresetId: TagStylePresetId;
  onSelect: (stylePresetId: TagStylePresetId) => void;
  soldSampleLabel?: string;
}) {
  const isPriceStyleRow = type === 'price';
  const isSoldStyleRow = type === 'sold';
  const priceSampleLabel = '฿';

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
        const isFlat = isTransparentTagBackground(preset.backgroundColor);
        const borderRadius = preset.borderRadius ?? theme.radius.sm - 2;
        const borderWidth =
          preset.borderWidth ?? (isFlat && preset.borderColor === 'transparent' ? 0 : 1);
        const isPlainCross = stylePresetId === 'sold-icon-plain';

        if (isPriceStyleRow || isSoldStyleRow) {
          return (
            <Pressable
              accessibilityLabel={preset.label}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : undefined}
              key={stylePresetId}
              onPress={() => onSelect(stylePresetId)}
              style={[styles.textStyleChipOuter, isActive && styles.colorSwatchOuterActive]}>
              <View
                style={[
                  styles.priceStylePreview,
                  isPlainCross && styles.soldPlainStylePreview,
                  {
                    backgroundColor: isPlainCross || isFlat ? 'transparent' : preset.backgroundColor,
                    borderColor:
                      isPlainCross || preset.borderColor === 'transparent'
                        ? 'transparent'
                        : preset.borderColor,
                    borderWidth: isPlainCross ? 0 : borderWidth,
                    borderRadius: isPlainCross ? 0 : Math.min(borderRadius, 16),
                    ...(preset.rotateDeg
                      ? { transform: [{ rotate: `${preset.rotateDeg}deg` as const }] }
                      : null),
                    ...(!isPlainCross && preset.viewShadow
                      ? {
                          shadowColor: preset.viewShadow.shadowColor,
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.18,
                          shadowRadius: 2,
                          elevation: 1,
                        }
                      : null),
                  },
                ]}>
                {isPlainCross ? (
                  <SoldCrossIcon color={preset.color} size={18} thicknessScale={2} />
                ) : isSoldStyleRow ? (
                  <Text
                    style={[
                      styles.priceStylePreviewText,
                      getTagTextShadowStyle(preset.textShadow ?? null),
                      { color: preset.color, fontWeight: preset.fontWeight ?? '800' },
                    ]}
                    numberOfLines={1}>
                    {soldSampleLabel}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.priceStylePreviewText,
                      getTagTextShadowStyle(preset.textShadow ?? null),
                      { color: preset.color, fontWeight: preset.fontWeight ?? '800' },
                    ]}
                    numberOfLines={1}>
                    {priceSampleLabel}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        }

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
        const borderRadius = preset.borderRadius ?? theme.radius.sm - 2;
        const borderWidth =
          preset.borderWidth ?? (isFlat && preset.borderColor === 'transparent' ? 0 : 1);

        return (
          <Pressable
            accessibilityLabel={preset.label}
            accessibilityRole="button"
            accessibilityState={isActive ? { selected: true } : undefined}
            key={stylePresetId}
            onPress={() => onSelect(stylePresetId)}
            style={[styles.textStyleChipOuter, isActive && styles.colorSwatchOuterActive]}>
            <View
              style={[
                styles.textStylePreview,
                isFlat && preset.borderColor === 'transparent' && styles.textStylePreviewPlain,
                {
                  backgroundColor: isFlat ? 'transparent' : preset.backgroundColor,
                  borderColor:
                    preset.borderColor === 'transparent' ? 'transparent' : preset.borderColor,
                  borderWidth,
                  borderRadius: Math.min(borderRadius, 14),
                  ...(preset.viewShadow
                    ? {
                        shadowColor: preset.viewShadow.shadowColor,
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.18,
                        shadowRadius: 2,
                        elevation: 1,
                      }
                    : null),
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
          style={styles.dockRingOptionChip}
        />
      ))}
    </View>
  );
}

export function TagEditor({
  inputRef,
  tag,
  visible,
  onCancel,
  onCanvasLiftChange,
  onKeyboardOverlapChange,
  onDraftChange,
  onInlineEditChange,
  onSave,
  onSaveButtonLayout,
  saveButtonRef,
}: TagEditorProps) {
  const { language, t } = useTranslation();
  const { currency } = useCurrency();
  const hostRef = useRef<View>(null);
  const ignoreKeyboardHideRef = useRef(false);
  const onCanvasLiftChangeRef = useRef(onCanvasLiftChange);
  onCanvasLiftChangeRef.current = onCanvasLiftChange;
  const onKeyboardOverlapChangeRef = useRef(onKeyboardOverlapChange);
  onKeyboardOverlapChangeRef.current = onKeyboardOverlapChange;
  const onInlineEditChangeRef = useRef(onInlineEditChange);
  onInlineEditChangeRef.current = onInlineEditChange;
  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;
  const scheduleKeyboardSyncRef = useRef<() => void>(() => {});
  const keyboardSettleTimersRef = useRef<KeyboardSettleTimers>({ a: null, b: null, c: null });
  /** Last measured IME overlap — reused to park the dock before the next autoFocus. */
  const lastKeyboardOverlapRef = useRef(0);
  const [priceAmount, setPriceAmount] = useState('');
  const [priceTextFormat, setPriceTextFormat] = useState<PriceTextFormat>('symbol');
  const [soldTextFormat, setSoldTextFormat] = useState<SoldTextFormat>(DEFAULT_SOLD_TEXT_FORMAT);
  const [quantity, setQuantity] = useState(String(DEFAULT_QUANTITY));
  const [languageCode, setLanguageCode] = useState<TagLanguageCode>('TH');
  const [conditionValue, setConditionValue] = useState<TagConditionValue>(DEFAULT_CONDITION_VALUE);
  const [freeText, setFreeText] = useState('');
  const [stylePresetId, setStylePresetId] = useState<TagStylePresetId>(DEFAULT_TAG_STYLE_BY_TYPE.price);
  const [sizePresetId, setSizePresetId] = useState<TagSizePresetId>(DEFAULT_TAG_SIZE_PRESET_ID);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const [activeDockMenu, setActiveDockMenu] = useState<DockMenu>('main');
  /** Hide dock until keyboard is up (inline types) so it does not pop at bottom then jump. */
  const [isDockReady, setIsDockReady] = useState(false);
  const soldLabel = t('tag.sold');
  const priceFormats = getPriceTextFormatsForCurrency(currency);
  // Refs so inline onChangeText can update without re-publishing config every keystroke.
  const freeTextRef = useRef(freeText);
  const priceAmountRef = useRef(priceAmount);
  const quantityRef = useRef(quantity);
  const priceTextFormatRef = useRef(priceTextFormat);
  const currencyRef = useRef(currency);
  const languageRef = useRef(language);
  freeTextRef.current = freeText;
  priceAmountRef.current = priceAmount;
  quantityRef.current = quantity;
  priceTextFormatRef.current = priceTextFormat;
  currencyRef.current = currency;
  languageRef.current = language;

  const setTrackedKeyboardOverlap = (overlap: number) => {
    if (overlap > 0) {
      lastKeyboardOverlapRef.current = overlap;
    }
    setKeyboardOverlap(overlap);
  };

  useEffect(() => {
    if (!visible || !tag) {
      return;
    }

    setActiveDockMenu('main');
    setStylePresetId(getStylePresetForType(tag.type, tag.stylePresetId));
    setSizePresetId(tag.sizePresetId ?? DEFAULT_TAG_SIZE_PRESET_ID);

    switch (tag.type) {
      case 'price': {
        const digits = extractPriceDigits(tag.text);
        priceAmountRef.current = digits;
        setPriceAmount(digits);
        setPriceTextFormat(clampPriceTextFormat(currency, tag.priceTextFormat));
        break;
      }
      case 'sold':
        setSoldTextFormat(tag.soldTextFormat ?? (tag.text === SOLD_ICON_TEXT ? 'icon' : 'text'));
        break;
      case 'text':
        freeTextRef.current = tag.text;
        setFreeText(tag.text);
        break;
      case 'quantity': {
        const qty = String(tag.quantity ?? (extractPriceDigits(tag.text) || DEFAULT_QUANTITY));
        quantityRef.current = qty;
        setQuantity(qty);
        break;
      }
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
      // Clear inline fields on close so the next open cannot leak the previous amount/text.
      priceAmountRef.current = '';
      freeTextRef.current = '';
      quantityRef.current = String(DEFAULT_QUANTITY);
      setPriceAmount('');
      setFreeText('');
      setQuantity(String(DEFAULT_QUANTITY));
      setKeyboardOverlap(0);
      setActiveDockMenu('main');
      setIsDockReady(false);
      onCanvasLiftChangeRef.current?.(0);
    }
  }, [visible]);

  // Show dock after keyboard (inline types), or immediately for types without a soft keyboard.
  useEffect(() => {
    if (!visible || !tag) {
      setIsDockReady(false);
      return;
    }

    if (!TYPES_WITH_INLINE_INPUT.includes(tag.type)) {
      setIsDockReady(true);
      return;
    }

    setIsDockReady(false);
    // Fallback if IME never reports (hardware keyboard / rare Android cases).
    const fallback = setTimeout(() => setIsDockReady(true), 480);
    return () => clearTimeout(fallback);
  }, [tag?.id, tag?.type, visible]);

  // Park dock above keyboard on first inline-edit render (before autoFocus measures IME).
  const effectiveKeyboardOverlap = useMemo(() => {
    if (keyboardOverlap > 0) {
      return keyboardOverlap;
    }

    if (visible && tag && TYPES_WITH_INLINE_INPUT.includes(tag.type)) {
      return lastKeyboardOverlapRef.current > 0 ? lastKeyboardOverlapRef.current : PROVISIONAL_KEYBOARD_OVERLAP;
    }

    return 0;
  }, [keyboardOverlap, tag, visible]);

  useEffect(() => {
    if (effectiveKeyboardOverlap > 0) {
      setIsDockReady(true);
    }
  }, [effectiveKeyboardOverlap]);

  useLayoutEffect(() => {
    onKeyboardOverlapChangeRef.current?.(visible ? effectiveKeyboardOverlap : 0);
  }, [effectiveKeyboardOverlap, visible]);

  useEffect(() => {
    return () => {
      onKeyboardOverlapChangeRef.current?.(0);
    };
  }, []);

  const getEditorHost = () => hostRef.current;
  const syncKeyboardOverlap = () => {
    syncHostKeyboardOverlapFromMetrics(getEditorHost, keyboardSettleTimersRef.current, setTrackedKeyboardOverlap);
  };
  scheduleKeyboardSyncRef.current = syncKeyboardOverlap;

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timers = keyboardSettleTimersRef.current;

    const updateOverlapFromKeyboard = (event: KeyboardEvent) => {
      const keyboardHeight = getKeyboardHeight(event.endCoordinates);
      if (keyboardHeight <= 0) {
        setKeyboardOverlap(0);
        return;
      }

      scheduleHostKeyboardOverlapUpdate(
        getEditorHost,
        timers,
        event.endCoordinates.screenY,
        keyboardHeight,
        setTrackedKeyboardOverlap,
      );
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

      clearKeyboardSettleTimers(timers);
      setKeyboardOverlap(0);
    });

    // autoFocus can open the keyboard before listeners attach — sync current frame.
    syncKeyboardOverlap();
    const initialSyncTimer = setTimeout(syncKeyboardOverlap, 100);

    return () => {
      clearTimeout(initialSyncTimer);
      clearKeyboardSettleTimers(timers);
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

  // Full draft preview for style/size/format — exclude keystroke-driven displayText for inline types.
  useEffect(() => {
    if (!visible || !tag) {
      return;
    }

    // Inline types: use tag.text only. displayText can still hold the previous session's
    // priceAmount/freeText for one frame before init resets — that leaked into draftPreview
    // and made outside-tap auto-save the old price instead of cancelling a blank draft.
    const previewText = TYPES_WITH_INLINE_INPUT.includes(tag.type) ? tag.text : displayText;

    const preview: TagEditorDraftPreview = {
      text: previewText,
      stylePresetId: tag.type === 'sold' && soldTextFormat === 'icon_plain' ? 'sold-icon-plain' : stylePresetId,
      sizePresetId: TYPES_WITH_SIZE_PICKER.includes(tag.type) ? sizePresetId : tag.sizePresetId,
      priceTextFormat: tag.type === 'price' ? priceTextFormat : undefined,
      soldTextFormat: tag.type === 'sold' ? soldTextFormat : undefined,
      condition: tag.type === 'condition' ? conditionValue : undefined,
      languageCode: tag.type === 'language' ? languageCode : undefined,
    };

    onDraftChangeRef.current(preview);
    // displayText omitted on purpose for price/text/quantity keystrokes — syncOnly handles those.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keystroke text must not full-render the editor
  }, [
    conditionValue,
    languageCode,
    priceTextFormat,
    sizePresetId,
    soldTextFormat,
    stylePresetId,
    tag,
    visible,
    soldLabel,
    currency,
    language,
  ]);

  // Keystroke path for inline types: sync live draft text without full editor setState.
  useEffect(() => {
    if (!visible || !tag || !TYPES_WITH_INLINE_INPUT.includes(tag.type)) {
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

    onDraftChangeRef.current(preview, { syncOnly: true });
  }, [displayText, tag, visible, stylePresetId, sizePresetId, priceTextFormat, soldTextFormat, conditionValue, languageCode]);

  // Keyboard overlays the canvas — do not translate image/tags up.
  useLayoutEffect(() => {
    onCanvasLiftChangeRef.current?.(0);
  }, [visible]);

  useEffect(() => {
    return () => {
      onCanvasLiftChangeRef.current?.(0);
    };
  }, []);

  // Publish inline-edit config when the edit session / format context changes — NOT on every keystroke.
  // Handlers read live values from refs; TagOverlay keeps local value for instant typing.
  useEffect(() => {
    const publish = onInlineEditChangeRef.current;
    if (!visible || !tag || !TYPES_WITH_INLINE_INPUT.includes(tag.type)) {
      publish?.(null);
      return;
    }

    if (tag.type === 'price') {
      const digits = priceAmountRef.current;
      const formattedAmount = formatPriceDisplay(digits, priceTextFormat, currency, language);
      const formattedPlaceholder = formatPriceDisplay(PREVIEW_AMOUNT, priceTextFormat, currency, language);
      const atDigitCap = digits.length >= PRICE_AMOUNT_MAX_DIGITS;
      publish?.({
        value: formattedAmount,
        keyboardType: 'number-pad',
        maxLength: atDigitCap ? Math.max(formattedAmount.length, 1) : undefined,
        placeholder: formattedPlaceholder,
        autoFocus: true,
        onChangeText: (nextText) => {
          const currentDigits = priceAmountRef.current;
          const nextDigits = acceptPriceDigits(nextText, currentDigits);
          const formatted = formatPriceDisplay(
            nextDigits,
            priceTextFormatRef.current,
            currencyRef.current,
            languageRef.current,
          );
          if (nextDigits === currentDigits) {
            return formatted;
          }

          priceAmountRef.current = nextDigits;
          setPriceAmount(nextDigits);
          return formatted;
        },
        onFocus: () => scheduleKeyboardSyncRef.current(),
      });
      return;
    }

    if (tag.type === 'text') {
      publish?.({
        value: freeTextRef.current,
        multiline: true,
        placeholder: language === 'th' ? 'ข้อความ' : 'Text',
        autoFocus: true,
        onChangeText: (nextText) => {
          freeTextRef.current = nextText;
          setFreeText(nextText);
          return nextText;
        },
        onFocus: () => scheduleKeyboardSyncRef.current(),
      });
      return;
    }

    if (tag.type === 'quantity') {
      publish?.({
        value: quantityRef.current,
        keyboardType: 'number-pad',
        maxLength: QUANTITY_MAX_DIGITS,
        placeholder: String(DEFAULT_QUANTITY),
        prefix: 'x',
        autoFocus: true,
        onChangeText: (nextText) => {
          const currentDigits = quantityRef.current;
          const nextDigits = acceptQuantityDigits(nextText, currentDigits);
          if (nextDigits === currentDigits) {
            return currentDigits;
          }

          quantityRef.current = nextDigits;
          setQuantity(nextDigits);
          return nextDigits;
        },
        onFocus: () => scheduleKeyboardSyncRef.current(),
      });
    }
    // Intentionally omit freeText / priceAmount / quantity — keystrokes must not re-publish.
  }, [currency, inputRef, language, priceTextFormat, tag, visible]);

  // Clear inline edit only when the editor session ends.
  useEffect(() => {
    return () => {
      onInlineEditChangeRef.current?.(null);
    };
  }, []);

  // Open session: rely on TextInput autoFocus only. One late fallback if IME never appeared.
  // Do not cascade focus() during IME animation — that restarts the keyboard (flicker).
  useEffect(() => {
    if (!visible || !tag || !TYPES_WITH_INLINE_INPUT.includes(tag.type)) {
      return;
    }

    const fallback = setTimeout(() => {
      focusInlineInputIfNeeded(inputRef?.current);
      scheduleKeyboardSyncRef.current();
    }, INLINE_FOCUS_FALLBACK_MS);

    return () => clearTimeout(fallback);
  }, [inputRef, tag?.id, tag?.type, visible]);

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
        onSave(tag.id, { text: displayText, stylePresetId, quantity: Number(digits), ...sizeUpdate });
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

  const showInlineInput = TYPES_WITH_INLINE_INPUT.includes(tag.type);
  const showColorMenu = tag.type === 'price' || tag.type === 'sold' || tag.type === 'quantity';
  const showStyleMenu = tag.type === 'text';
  const showSizeMenu = TYPES_WITH_SIZE_PICKER.includes(tag.type);
  const showPriceFormatMenu = tag.type === 'price';
  const showGradeMenu = tag.type === 'condition';
  const showLanguageMenu = tag.type === 'language';
  const textStyleSample = language === 'th' ? 'ก' : 'Aa';
  const soldActiveStylePresetId =
    soldTextFormat === 'icon_plain' ? 'sold-icon-plain' : getStylePresetForType('sold', stylePresetId);

  const selectSoldStylePreset = (nextStylePresetId: TagStylePresetId) => {
    if (nextStylePresetId === 'sold-icon-plain') {
      setStylePresetId('sold-icon-plain');
      setSoldTextFormat('icon_plain');
      return;
    }

    setStylePresetId(nextStylePresetId);
    if (soldTextFormat === 'icon_plain') {
      // Leave plain cross — show SOLD text so the new badge theme is visible.
      setSoldTextFormat('text');
    }
  };

  const keepInputFocused = () => {
    if (!visible || !showInlineInput) {
      return;
    }

    ignoreKeyboardHideRef.current = true;
    requestAnimationFrame(() => {
      focusInlineInputIfNeeded(inputRef?.current);
    });
    setTimeout(() => {
      ignoreKeyboardHideRef.current = false;
      // Re-sync in case a hide was skipped while we held focus.
      syncKeyboardOverlap();
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

  const renderMainDock = () => (
    <View style={styles.dockContent}>
      {showGradeMenu ? <DockMenuButton label={t('tag.dock.grade')} onPress={() => openDockMenu('grade')} /> : null}
      {showLanguageMenu ? <DockMenuButton label={t('tag.dock.language')} onPress={() => openDockMenu('language')} /> : null}
      {showColorMenu ? (
        <DockMenuButton
          label={tag.type === 'sold' ? t('tag.dock.style') : t('tag.dock.color')}
          onPress={() => openDockMenu('color')}
        />
      ) : null}
      {showPriceFormatMenu ? <DockMenuButton label={t('tag.dock.format')} onPress={() => openDockMenu('format')} /> : null}
      {showStyleMenu ? <DockMenuButton label={t('tag.dock.style')} onPress={() => openDockMenu('style')} /> : null}
      {showSizeMenu ? <DockMenuButton label={t('tag.dock.size')} onPress={() => openDockMenu('size')} /> : null}
      <View style={styles.dockActions}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>{t('tag.cancel')}</Text>
        </Pressable>
        <View collapsable={false} onLayout={onSaveButtonLayout} ref={saveButtonRef}>
          <Pressable accessibilityRole="button" onPress={saveTag} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{t('tag.save')}</Text>
          </Pressable>
        </View>
      </View>
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
        <ColorPresetRow
          type={tag.type}
          activeStylePresetId={tag.type === 'sold' ? soldActiveStylePresetId : stylePresetId}
          soldSampleLabel={soldLabel}
          onSelect={
            tag.type === 'sold'
              ? withKeepFocus(selectSoldStylePreset)
              : withKeepFocus(setStylePresetId)
          }
        />
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
                style={styles.dockRingOptionChip}
              />
            );
          })}
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
              style={styles.dockRingOptionChip}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <View pointerEvents="box-none" ref={hostRef} style={styles.host}>
      {isDockReady ? (
        <View style={[styles.dock, { bottom: effectiveKeyboardOverlap }]}>
          <ScrollView
            bounces={false}
            horizontal={false}
            keyboardShouldPersistTaps="always"
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}>
            {activeDockMenu === 'main' ? renderMainDock() : renderSubDock()}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
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
    paddingHorizontal: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
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
    gap: theme.spacing.xs,
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
    paddingHorizontal: theme.spacing.sm,
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
    gap: theme.spacing.xs,
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
    paddingHorizontal: theme.spacing.xs,
  },
  activeOptionChip: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.photoMockBackground,
  },
  dockRingOptionChip: {
    // Match Color/Style sub-menu focus ring thickness (colorSwatchOuter / textStyleChipOuter).
    borderWidth: 2,
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
    gap: theme.spacing.xs,
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
    borderColor: theme.colors.accent,
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
  priceStylePreview: {
    minHeight: 22,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  soldPlainStylePreview: {
    minWidth: 28,
    paddingHorizontal: 2,
  },
  priceStylePreviewText: {
    fontSize: 12,
    lineHeight: 14,
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
  dockActions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cancelButton: {
    minHeight: 44,
    minWidth: 72,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    backgroundColor: theme.buttons.secondary.backgroundColor,
    borderColor: theme.buttons.secondary.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  cancelButtonText: {
    ...theme.typography.caption,
    color: theme.buttons.secondary.color,
  },
  saveButton: {
    minHeight: 44,
    minWidth: 72,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    backgroundColor: theme.buttons.primary.backgroundColor,
    borderColor: theme.buttons.primary.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  saveButtonText: {
    ...theme.typography.caption,
    color: theme.buttons.primary.color,
  },
});
