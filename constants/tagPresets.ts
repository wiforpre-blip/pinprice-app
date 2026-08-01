import type { TextStyle, ViewStyle } from 'react-native';

import { DEFAULT_CONDITION_VALUE, parseConditionValue, QUANTITY_MAX_DIGITS } from '@/constants/tagDefaults';
import { PinPriceTheme as theme } from '@/constants/theme';
import type { PriceTag, TagConditionValue, TagSizePresetId, TagStylePresetId, TagType } from '@/types/tag';
import { extractPriceDigits } from '@/utils/priceText';

export type TagFontWeight = NonNullable<TextStyle['fontWeight']>;

export type TagTextShadow = {
  color: string;
  offset: { width: number; height: number };
  radius: number;
};

/** Glyph outline (seller overlay text). Rendered as a soft textShadow halo via TagOutlinedText — not a View border. */
export type TagTextOutline = {
  color: string;
  width: number;
};

/** View chrome shadow (iOS shadow* + Android elevation). `null` = flat. */
export type TagViewShadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

export type TagShape = 'default' | 'circle';

export type ResolvedTagPreset = {
  backgroundColor: string;
  borderColor: string;
  color: string;
  minHeight: number;
  maxWidth: number;
  paddingHorizontal: number;
  paddingVertical: number;
  fontSize: number;
  lineHeight: number;
  fontWeight: TagFontWeight;
  fontStyle: NonNullable<TextStyle['fontStyle']>;
  textShadow: TagTextShadow | null;
  textOutline: TagTextOutline | null;
  borderRadius: number;
  borderWidth: number;
  /** View chrome shadow; `null` means flat (no elevation/shadow). */
  viewShadow: TagViewShadow | null;
  /** No view chrome shadow — typically transparent / outline badges. */
  isFlat: boolean;
  /** Circle badges use fixedSize for equal width/height. */
  shape: TagShape;
  /** Diameter when shape is `circle`; otherwise null. */
  fixedSize: number | null;
  /** Clockwise degrees; negative = tilt left (sale-stamp look). */
  rotateDeg: number;
};

type TagStylePresetDefinition = {
  label: string;
  type: TagType;
  backgroundColor: string;
  borderColor: string;
  color: string;
  fontWeight?: TagFontWeight;
  textShadow?: TagTextShadow | null;
  /** Hard black/color stroke around glyphs — overlay text look, not a badge border. */
  textOutline?: TagTextOutline | null;
  borderRadius?: number;
  borderWidth?: number;
  /** Explicit view shadow; omit for default (flat when transparent bg, else tag shadow). */
  viewShadow?: TagViewShadow | null;
  /** Clockwise degrees; negative tilts left. */
  rotateDeg?: number;
};

const SOFT_WHITE_SHADOW: TagTextShadow = {
  color: 'rgba(255, 255, 255, 0.92)',
  offset: { width: 0, height: 1 },
  radius: 3,
};

const STRONG_BLACK_SHADOW: TagTextShadow = {
  color: 'rgba(0, 0, 0, 0.85)',
  offset: { width: 0, height: 1 },
  radius: 4,
};

/** Safety yellow fill used by marketplace overlay text (yellow + black stroke). */
const YELLOW_OUTLINE_FILL = '#FFE600';
const YELLOW_BLACK_OUTLINE: TagTextOutline = {
  color: '#000000',
  /** Feeds textShadowRadius = Math.max(3, width + 1) for the halo effect (see TagOutlinedText). */
  width: 3,
};

const DEFAULT_TAG_FONT_WEIGHT: TagFontWeight = theme.typography.tag.fontWeight;
const DEFAULT_TAG_BORDER_RADIUS = theme.radius.sm;
const DEFAULT_TAG_BORDER_WIDTH = 1;
const CIRCLE_TAG_BORDER_WIDTH = 2;
const PILL_BORDER_RADIUS = 999;

const DEFAULT_TAG_VIEW_SHADOW: TagViewShadow = {
  shadowColor: theme.shadows.tag.shadowColor,
  shadowOffset: { ...theme.shadows.tag.shadowOffset },
  shadowOpacity: theme.shadows.tag.shadowOpacity,
  shadowRadius: theme.shadows.tag.shadowRadius,
  elevation: theme.shadows.tag.elevation,
};

/** Soft marketplace-style chrome shadow. */
const SOFT_TAG_VIEW_SHADOW: TagViewShadow = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
};

/** Grade colors for condition tags — semantic, not style presets. */
export const CONDITION_GRADE_STYLES: Record<
  TagConditionValue,
  { backgroundColor: string; borderColor: string; color: string }
> = {
  NM: {
    backgroundColor: theme.tags.condition.backgroundColor,
    borderColor: theme.tags.condition.borderColor,
    color: theme.tags.condition.color,
  },
  LP: {
    backgroundColor: theme.tags.conditionLp.backgroundColor,
    borderColor: theme.tags.conditionLp.borderColor,
    color: theme.tags.conditionLp.color,
  },
  MP: {
    backgroundColor: theme.tags.conditionMp.backgroundColor,
    borderColor: theme.tags.conditionMp.borderColor,
    color: theme.tags.conditionMp.color,
  },
  HP: {
    backgroundColor: theme.tags.conditionHp.backgroundColor,
    borderColor: theme.tags.conditionHp.borderColor,
    color: theme.tags.conditionHp.color,
  },
};

export function resolveConditionValueFromTag(tag: Pick<PriceTag, 'condition' | 'text'>): TagConditionValue {
  if (tag.condition) {
    return parseConditionValue(tag.condition);
  }

  return parseConditionValue(tag.text);
}

export const DEFAULT_TAG_STYLE_BY_TYPE: Record<TagType, TagStylePresetId> = {
  price: 'price-white-black',
  sold: 'sold-icon-plain',
  text: 'text-default',
  quantity: 'quantity-blue',
  condition: 'condition-default',
  language: 'language-default',
};

/** Fallback when a tag has no sizePresetId (legacy / unresolved). */
export const DEFAULT_TAG_SIZE_PRESET_ID: TagSizePresetId = 'medium';

/** Default create/picker size for price + text tags (quantity still steps down from the active picker size). */
export const DEFAULT_PRICE_TEXT_SIZE_PRESET_ID: TagSizePresetId = 'large';

/** Default create/picker size for condition (card grade) tags — independent of the shared main size. */
export const DEFAULT_CONDITION_SIZE_PRESET_ID: TagSizePresetId = 'small';

/** Default create/picker size for language tags — independent of the shared main size. */
export const DEFAULT_LANGUAGE_SIZE_PRESET_ID: TagSizePresetId = 'small';

/** Width/height floor so language chips stay capsule (not circle) at every size. */
const LANGUAGE_CAPSULE_ASPECT = 1.45;

export const TAG_STYLE_PRESETS: Record<TagStylePresetId, TagStylePresetDefinition> = {
  'price-white-black': {
    label: 'White / Black',
    type: 'price',
    backgroundColor: theme.colors.priceTagBackground,
    borderColor: theme.colors.priceTagBorder,
    color: theme.colors.priceTagText,
  },
  'price-black-white': {
    label: 'Black / White',
    type: 'price',
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    color: theme.colors.white,
  },
  'price-yellow-black': {
    label: 'Yellow / Black',
    type: 'price',
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    color: theme.colors.accentText,
  },
  'price-red-white': {
    label: 'Red / White',
    type: 'price',
    backgroundColor: theme.tags.priceRed.backgroundColor,
    borderColor: theme.tags.priceRed.borderColor,
    color: theme.tags.priceRed.color,
  },
  'price-marketplace-white': {
    label: 'Marketplace',
    type: 'price',
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    color: '#111827',
    fontWeight: '600',
    borderRadius: 10,
    borderWidth: 1,
    viewShadow: SOFT_TAG_VIEW_SHADOW,
  },
  'price-facebook-blue': {
    label: 'Facebook',
    type: 'price',
    backgroundColor: '#1877F2',
    borderColor: '#0D65D9',
    color: '#FFFFFF',
    fontWeight: '700',
    borderRadius: 8,
    borderWidth: 1,
  },
  'price-ebay-yellow': {
    label: 'eBay',
    type: 'price',
    backgroundColor: '#F5AF02',
    borderColor: '#111111',
    color: '#111111',
    fontWeight: '800',
    borderRadius: 4,
    borderWidth: 1,
  },
  'price-outline-white': {
    label: 'Outline',
    type: 'price',
    backgroundColor: 'transparent',
    borderColor: '#FFFFFF',
    color: '#FFFFFF',
    fontWeight: '800',
    borderRadius: DEFAULT_TAG_BORDER_RADIUS,
    borderWidth: 2,
    textShadow: STRONG_BLACK_SHADOW,
    viewShadow: null,
  },
  'price-yellow-outline': {
    label: 'เหลืองขอบดำ',
    type: 'price',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    color: YELLOW_OUTLINE_FILL,
    fontWeight: '800',
    borderWidth: 0,
    textOutline: YELLOW_BLACK_OUTLINE,
    textShadow: null,
    viewShadow: null,
  },
  'price-dark-overlay': {
    label: 'Dark overlay',
    type: 'price',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderColor: '#4B5563',
    color: '#FFFFFF',
    fontWeight: '700',
    borderRadius: 8,
    borderWidth: 1,
  },
  'price-neon-green': {
    label: 'Neon',
    type: 'price',
    backgroundColor: '#39FF14',
    borderColor: '#111111',
    color: '#111111',
    fontWeight: '800',
    borderRadius: PILL_BORDER_RADIUS,
    borderWidth: 1,
  },
  'price-pink-sale': {
    label: 'Sale Pink',
    type: 'price',
    backgroundColor: '#FF2D55',
    borderColor: '#C9184A',
    color: '#FFFFFF',
    fontWeight: '800',
    borderRadius: PILL_BORDER_RADIUS,
    borderWidth: 1,
    viewShadow: SOFT_TAG_VIEW_SHADOW,
  },
  'sold-icon-plain': {
    label: 'Cross plain',
    type: 'sold',
    backgroundColor: theme.tags.soldIconPlain.backgroundColor,
    borderColor: theme.tags.soldIconPlain.borderColor,
    color: theme.tags.soldIconPlain.color,
    borderWidth: 0,
    viewShadow: null,
  },
  'sold-stamp-red': {
    label: 'Stamp',
    type: 'sold',
    backgroundColor: 'transparent',
    borderColor: theme.colors.sold,
    color: theme.colors.sold,
    fontWeight: '800',
    borderRadius: 2,
    borderWidth: 2,
    viewShadow: null,
    // Slight left tilt — sale stamp look.
    rotateDeg: -12,
  },
  'sold-red': {
    label: 'Red',
    type: 'sold',
    backgroundColor: theme.colors.sold,
    borderColor: theme.colors.sold,
    color: theme.colors.white,
  },
  'sold-outline-white': {
    label: 'Outline',
    type: 'sold',
    backgroundColor: 'transparent',
    borderColor: '#FFFFFF',
    color: '#FFFFFF',
    fontWeight: '800',
    borderRadius: DEFAULT_TAG_BORDER_RADIUS,
    borderWidth: 2,
    textShadow: STRONG_BLACK_SHADOW,
    viewShadow: null,
  },
  'sold-black': {
    label: 'Black',
    type: 'sold',
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    color: theme.colors.white,
  },
  'sold-gray': {
    label: 'Gray',
    type: 'sold',
    backgroundColor: theme.colors.textMuted,
    borderColor: theme.colors.textMuted,
    color: theme.colors.white,
  },
  'sold-marketplace-white': {
    label: 'Marketplace',
    type: 'sold',
    backgroundColor: '#FFFFFF',
    borderColor: '#F3A4A7',
    color: theme.colors.sold,
    fontWeight: '700',
    borderRadius: 10,
    borderWidth: 1,
    viewShadow: SOFT_TAG_VIEW_SHADOW,
  },
  'sold-facebook-blue': {
    label: 'Facebook',
    type: 'sold',
    backgroundColor: '#1877F2',
    borderColor: '#0D65D9',
    color: '#FFFFFF',
    fontWeight: '700',
    borderRadius: 8,
    borderWidth: 1,
  },
  'sold-dark-overlay': {
    label: 'Dark overlay',
    type: 'sold',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderColor: '#4B5563',
    color: '#FFFFFF',
    fontWeight: '700',
    borderRadius: 8,
    borderWidth: 1,
  },
  'sold-neon-pink': {
    label: 'Neon pink',
    type: 'sold',
    backgroundColor: '#FF2D55',
    borderColor: '#C9184A',
    color: '#FFFFFF',
    fontWeight: '800',
    borderRadius: PILL_BORDER_RADIUS,
    borderWidth: 1,
    viewShadow: SOFT_TAG_VIEW_SHADOW,
  },
  'text-default': {
    label: 'Default',
    type: 'text',
    backgroundColor: theme.tags.text.backgroundColor,
    borderColor: theme.tags.text.borderColor,
    color: theme.tags.text.color,
    fontWeight: '800',
  },
  'text-black-white': {
    label: 'Black / White',
    type: 'text',
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    color: theme.colors.white,
    fontWeight: '800',
  },
  'text-red-white': {
    label: 'Red / White',
    type: 'text',
    backgroundColor: theme.tags.priceRed.backgroundColor,
    borderColor: theme.tags.priceRed.borderColor,
    color: theme.tags.priceRed.color,
    fontWeight: '800',
  },
  'text-white-border': {
    label: 'White border',
    type: 'text',
    backgroundColor: theme.tags.textWhiteBorder.backgroundColor,
    borderColor: theme.tags.textWhiteBorder.borderColor,
    color: theme.tags.textWhiteBorder.color,
    fontWeight: '800',
  },
  'text-plain': {
    label: 'Plain text',
    type: 'text',
    backgroundColor: theme.tags.textPlain.backgroundColor,
    borderColor: theme.tags.textPlain.borderColor,
    color: theme.tags.textPlain.color,
    fontWeight: '800',
    textShadow: SOFT_WHITE_SHADOW,
  },
  'text-accent': {
    label: 'Accent',
    type: 'text',
    backgroundColor: theme.tags.textAccent.backgroundColor,
    borderColor: theme.tags.textAccent.borderColor,
    color: theme.tags.textAccent.color,
    fontWeight: '800',
  },
  'text-marketplace-white': {
    label: 'Marketplace',
    type: 'text',
    backgroundColor: '#FFFFFF',
    borderColor: '#D0D5DD',
    color: '#111827',
    fontWeight: '600',
    borderRadius: 10,
    borderWidth: 1,
    viewShadow: SOFT_TAG_VIEW_SHADOW,
  },
  'text-facebook-blue': {
    label: 'Facebook',
    type: 'text',
    backgroundColor: '#1877F2',
    borderColor: '#0D65D9',
    color: '#FFFFFF',
    fontWeight: '700',
    borderRadius: 8,
    borderWidth: 1,
  },
  'text-ebay-yellow': {
    label: 'eBay',
    type: 'text',
    backgroundColor: '#F5AF02',
    borderColor: '#111111',
    color: '#111111',
    fontWeight: '800',
    borderRadius: 4,
    borderWidth: 1,
  },
  'text-outline-white': {
    label: 'Outline',
    type: 'text',
    backgroundColor: 'transparent',
    borderColor: '#FFFFFF',
    color: '#FFFFFF',
    fontWeight: '800',
    borderRadius: DEFAULT_TAG_BORDER_RADIUS,
    borderWidth: 2,
    textShadow: STRONG_BLACK_SHADOW,
    viewShadow: null,
  },
  'text-yellow-outline': {
    label: 'เหลืองขอบดำ',
    type: 'text',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    color: YELLOW_OUTLINE_FILL,
    fontWeight: '800',
    borderWidth: 0,
    textOutline: YELLOW_BLACK_OUTLINE,
    textShadow: null,
    viewShadow: null,
  },
  'text-soft-note': {
    label: 'Soft note',
    type: 'text',
    backgroundColor: '#FFF8E7',
    borderColor: '#E6D5A8',
    color: '#1F2937',
    fontWeight: '600',
    borderRadius: 10,
    borderWidth: 1,
    viewShadow: SOFT_TAG_VIEW_SHADOW,
  },
  'text-dark-caption': {
    label: 'Dark caption',
    type: 'text',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderColor: '#111111',
    color: '#FFFFFF',
    fontWeight: '700',
    borderRadius: 8,
    borderWidth: 1,
    textShadow: {
      color: 'rgba(0, 0, 0, 0.4)',
      offset: { width: 0, height: 1 },
      radius: 2,
    },
  },
  'quantity-blue': {
    label: 'Blue',
    type: 'quantity',
    backgroundColor: theme.colors.quantityBlue,
    borderColor: theme.colors.quantityBlue,
    color: theme.colors.white,
    fontWeight: '800',
  },
  'quantity-teal': {
    label: 'Teal',
    type: 'quantity',
    backgroundColor: theme.colors.quantityTeal,
    borderColor: theme.colors.quantityTeal,
    color: theme.colors.white,
    fontWeight: '800',
  },
  'quantity-slate': {
    label: 'Slate',
    type: 'quantity',
    backgroundColor: theme.colors.quantitySlate,
    borderColor: theme.colors.quantitySlate,
    color: theme.colors.white,
    fontWeight: '800',
  },
  'quantity-white-black': {
    label: 'White',
    type: 'quantity',
    backgroundColor: '#FFFFFF',
    borderColor: '#111827',
    color: '#111827',
    fontWeight: '800',
    borderWidth: 1,
  },
  'quantity-black-white': {
    label: 'Black',
    type: 'quantity',
    backgroundColor: '#111827',
    borderColor: '#111827',
    color: '#FFFFFF',
    fontWeight: '800',
  },
  'quantity-yellow-black': {
    label: 'Yellow',
    type: 'quantity',
    backgroundColor: '#F5AF02',
    borderColor: '#111111',
    color: '#111111',
    fontWeight: '800',
    borderWidth: 1,
  },
  'quantity-outline-blue': {
    label: 'Outline blue',
    type: 'quantity',
    backgroundColor: 'transparent',
    borderColor: theme.colors.quantityBlue,
    color: theme.colors.quantityBlue,
    fontWeight: '800',
    borderWidth: 2,
    viewShadow: null,
  },
  'quantity-soft-gray': {
    label: 'Soft gray',
    type: 'quantity',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: '#98A2B3',
    color: '#344054',
    fontWeight: '800',
    borderWidth: 1,
    viewShadow: null,
  },
  'condition-default': {
    label: 'Default',
    type: 'condition',
    backgroundColor: theme.tags.condition.backgroundColor,
    borderColor: theme.tags.condition.borderColor,
    color: theme.tags.condition.color,
  },
  'language-default': {
    label: 'Default',
    type: 'language',
    backgroundColor: theme.tags.language.backgroundColor,
    borderColor: theme.tags.language.borderColor,
    color: theme.tags.language.color,
    fontWeight: '700',
    borderRadius: PILL_BORDER_RADIUS,
    borderWidth: 1,
    viewShadow: null,
  },
};

/**
 * Seller size scale (picker shows S/M/L/XL; `xs` is info-tag step-down from S).
 * Keep `small` near the historical S anchor. Step M/L/XL up clearly with matching
 * lineHeight / minHeight / padding so bold Thai glyphs, commas, and outline halo fit.
 * Rule of thumb: minHeight >= lineHeight + paddingVertical * 2.
 */
export const TAG_SIZE_PRESETS: Record<
  TagSizePresetId,
  { label: string; minHeight: number; maxWidth: number; paddingHorizontal: number; paddingVertical: number; fontSize: number; lineHeight: number }
> = {
  xs: {
    label: 'XS',
    minHeight: 24,
    maxWidth: 120,
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: 3,
    fontSize: 10,
    lineHeight: 14,
  },
  small: {
    label: 'Small',
    // Anchor size — keep near prior S; tiny pad/lineHeight bump only for glyph room.
    minHeight: 30,
    maxWidth: 152,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    fontSize: 12,
    lineHeight: 18,
  },
  medium: {
    label: 'Medium',
    minHeight: 40,
    maxWidth: 200,
    paddingHorizontal: theme.spacing.sm + 2,
    paddingVertical: 6,
    fontSize: 16,
    lineHeight: 22,
  },
  large: {
    label: 'Large',
    minHeight: 50,
    maxWidth: 248,
    paddingHorizontal: theme.spacing.md + 2,
    paddingVertical: theme.spacing.sm,
    fontSize: 20,
    lineHeight: 28,
  },
  xl: {
    label: 'XL',
    minHeight: 62,
    maxWidth: 300,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    fontSize: 26,
    lineHeight: 34,
  },
};

export function isTransparentTagBackground(backgroundColor: string) {
  return backgroundColor === 'transparent';
}

export function getStylePresetForType(type: TagType, stylePresetId?: TagStylePresetId) {
  if (stylePresetId && TAG_STYLE_PRESETS[stylePresetId]?.type === type) {
    return stylePresetId;
  }

  return DEFAULT_TAG_STYLE_BY_TYPE[type];
}

/** Seller-priority order for sold style picker (plain cross first). */
export const SOLD_STYLE_PRESET_ORDER: readonly TagStylePresetId[] = [
  'sold-icon-plain',
  'sold-red',
  'sold-stamp-red',
  'sold-black',
  'sold-outline-white',
  'sold-gray',
  'sold-marketplace-white',
  'sold-facebook-blue',
  'sold-dark-overlay',
  'sold-neon-pink',
];

/**
 * Shared visual identity across price/text tags — lets a seller pick a look once and
 * have it carry over when they switch tag type. Sold/quantity/condition/language are
 * not part of this system.
 */
export type TagStyleFamilyId =
  | 'yellow-outline'
  | 'white-black'
  | 'black-white'
  | 'yellow-black'
  | 'red-white'
  | 'marketplace-white'
  | 'facebook-blue'
  | 'ebay-yellow'
  | 'outline-white'
  | 'dark-overlay';

/** Seller-priority order for price/text pickers — safe/common looks first. */
export const MAIN_TEXT_STYLE_FAMILY_ORDER: readonly TagStyleFamilyId[] = [
  'white-black',
  'black-white',
  'yellow-outline',
  'yellow-black',
  'red-white',
  'marketplace-white',
  'facebook-blue',
  'ebay-yellow',
  'outline-white',
  'dark-overlay',
];

/** Seller-priority order for quantity style picker — default/neutral first. */
export const QUANTITY_STYLE_PRESET_ORDER: readonly TagStylePresetId[] = [
  'quantity-blue',
  'quantity-white-black',
  'quantity-black-white',
  'quantity-teal',
  'quantity-slate',
  'quantity-yellow-black',
  'quantity-outline-blue',
  'quantity-soft-gray',
];

const PRICE_STYLE_PRESET_BY_FAMILY: Record<TagStyleFamilyId, TagStylePresetId> = {
  'yellow-outline': 'price-yellow-outline',
  'white-black': 'price-white-black',
  'black-white': 'price-black-white',
  'yellow-black': 'price-yellow-black',
  'red-white': 'price-red-white',
  'marketplace-white': 'price-marketplace-white',
  'facebook-blue': 'price-facebook-blue',
  'ebay-yellow': 'price-ebay-yellow',
  'outline-white': 'price-outline-white',
  'dark-overlay': 'price-dark-overlay',
};

const TEXT_STYLE_PRESET_BY_FAMILY: Record<TagStyleFamilyId, TagStylePresetId> = {
  'yellow-outline': 'text-yellow-outline',
  'white-black': 'text-default',
  'black-white': 'text-black-white',
  'yellow-black': 'text-accent',
  'red-white': 'text-red-white',
  'marketplace-white': 'text-marketplace-white',
  'facebook-blue': 'text-facebook-blue',
  'ebay-yellow': 'text-ebay-yellow',
  'outline-white': 'text-outline-white',
  'dark-overlay': 'text-dark-caption',
};

/** Explicit picker order for price — same family order/count as text. */
export const PRICE_STYLE_PRESET_ORDER: readonly TagStylePresetId[] = MAIN_TEXT_STYLE_FAMILY_ORDER.map(
  (familyId) => PRICE_STYLE_PRESET_BY_FAMILY[familyId],
);

/** Explicit picker order for text — same family order/count as price. */
export const TEXT_STYLE_PRESET_ORDER: readonly TagStylePresetId[] = MAIN_TEXT_STYLE_FAMILY_ORDER.map(
  (familyId) => TEXT_STYLE_PRESET_BY_FAMILY[familyId],
);

const STYLE_FAMILY_BY_PRESET_ID: Partial<Record<TagStylePresetId, TagStyleFamilyId>> = (() => {
  const map: Partial<Record<TagStylePresetId, TagStyleFamilyId>> = {};
  for (const familyId of MAIN_TEXT_STYLE_FAMILY_ORDER) {
    map[PRICE_STYLE_PRESET_BY_FAMILY[familyId]] = familyId;
    map[TEXT_STYLE_PRESET_BY_FAMILY[familyId]] = familyId;
  }
  return map;
})();

/** Returns the shared family for a price/text preset, or `null` for orphans and other tag types. */
export function getStyleFamilyId(stylePresetId: TagStylePresetId): TagStyleFamilyId | null {
  return STYLE_FAMILY_BY_PRESET_ID[stylePresetId] ?? null;
}

/** Resolves a shared family back to the price/text preset id for the given type. */
export function getStylePresetForFamily(
  type: Extract<TagType, 'price' | 'text'>,
  familyId: TagStyleFamilyId,
): TagStylePresetId {
  return type === 'price' ? PRICE_STYLE_PRESET_BY_FAMILY[familyId] : TEXT_STYLE_PRESET_BY_FAMILY[familyId];
}

export function getStylePresetIdsForType(type: TagType): TagStylePresetId[] {
  if (type === 'sold') {
    return SOLD_STYLE_PRESET_ORDER.filter((presetId) => TAG_STYLE_PRESETS[presetId]?.type === 'sold');
  }

  if (type === 'price') {
    return [...PRICE_STYLE_PRESET_ORDER];
  }

  if (type === 'text') {
    return [...TEXT_STYLE_PRESET_ORDER];
  }

  if (type === 'quantity') {
    return QUANTITY_STYLE_PRESET_ORDER.filter(
      (presetId) => TAG_STYLE_PRESETS[presetId]?.type === 'quantity',
    );
  }

  return (Object.keys(TAG_STYLE_PRESETS) as TagStylePresetId[]).filter((presetId) => {
    return TAG_STYLE_PRESETS[presetId].type === type;
  });
}

export function getResolvedTagPreset(tag: PriceTag, typeOverride?: TagType): ResolvedTagPreset {
  const type = typeOverride ?? tag.type;
  const stylePresetId =
    type === 'sold' && tag.soldTextFormat === 'icon_plain'
      ? 'sold-icon-plain'
      : getStylePresetForType(type, tag.stylePresetId);
  const stylePreset = TAG_STYLE_PRESETS[stylePresetId];
  const sizePreset = TAG_SIZE_PRESETS[
    tag.sizePresetId ??
      (type === 'condition'
        ? DEFAULT_CONDITION_SIZE_PRESET_ID
        : type === 'language'
          ? DEFAULT_LANGUAGE_SIZE_PRESET_ID
          : DEFAULT_TAG_SIZE_PRESET_ID)
  ];
  const isPlainSoldIcon = type === 'sold' && tag.soldTextFormat === 'icon_plain';
  const isBadgeSoldIcon = type === 'sold' && tag.soldTextFormat === 'icon';
  const soldIconSize = Math.max(28, Math.round(sizePreset.fontSize * 2.2));
  /** Solid red X (icon_plain): 160% of shared sold-icon base (80% of the prior 200% size). */
  const resolvedSoldIconSize = isPlainSoldIcon ? Math.round(soldIconSize * 1.6) : soldIconSize;
  const isTransparentBg = isTransparentTagBackground(stylePreset.backgroundColor);
  const viewShadow: TagViewShadow | null =
    stylePreset.viewShadow !== undefined
      ? stylePreset.viewShadow
      : isTransparentBg || isPlainSoldIcon
        ? null
        : DEFAULT_TAG_VIEW_SHADOW;
  const isFlat = viewShadow == null;
  const isCondition = type === 'condition';
  const conditionValue = isCondition ? resolveConditionValueFromTag(tag) : DEFAULT_CONDITION_VALUE;
  const conditionColors = CONDITION_GRADE_STYLES[conditionValue];
  /** Fixed diameter so NM/LP/MP/HP stay circular regardless of glyph width. */
  const conditionDiameter = Math.max(sizePreset.minHeight, Math.round(sizePreset.fontSize * 2.6));
  const borderWidth =
    stylePreset.borderWidth ??
    (isCondition
      ? CIRCLE_TAG_BORDER_WIDTH
      : isTransparentBg && stylePreset.borderColor === 'transparent'
        ? 0
        : DEFAULT_TAG_BORDER_WIDTH);
  const borderRadius = isCondition
    ? conditionDiameter / 2
    : (stylePreset.borderRadius ?? DEFAULT_TAG_BORDER_RADIUS);

  return {
    backgroundColor: isCondition ? conditionColors.backgroundColor : stylePreset.backgroundColor,
    borderColor: isCondition ? conditionColors.borderColor : stylePreset.borderColor,
    color: isCondition ? conditionColors.color : stylePreset.color,
    minHeight: isCondition
      ? conditionDiameter
      : isPlainSoldIcon || isBadgeSoldIcon
        ? resolvedSoldIconSize + theme.spacing.sm
        : sizePreset.minHeight,
    maxWidth: isCondition ? conditionDiameter : sizePreset.maxWidth,
    paddingHorizontal: isCondition
      ? 0
      : isPlainSoldIcon
        ? theme.spacing.xs
        : type === 'language'
          ? Math.max(theme.spacing.xs + 2, Math.round(sizePreset.paddingHorizontal * 0.7))
          : sizePreset.paddingHorizontal,
    paddingVertical: isCondition ? 0 : isPlainSoldIcon ? theme.spacing.xs : sizePreset.paddingVertical,
    fontSize: isPlainSoldIcon || isBadgeSoldIcon ? resolvedSoldIconSize : sizePreset.fontSize,
    lineHeight: isCondition
      ? sizePreset.fontSize
      : isPlainSoldIcon || isBadgeSoldIcon
        ? resolvedSoldIconSize
        : sizePreset.lineHeight,
    fontWeight: stylePreset.fontWeight ?? DEFAULT_TAG_FONT_WEIGHT,
    fontStyle: isCondition ? 'italic' : 'normal',
    textShadow: stylePreset.textShadow ?? null,
    textOutline: stylePreset.textOutline ?? null,
    borderRadius,
    borderWidth: isPlainSoldIcon ? 0 : borderWidth,
    viewShadow: isPlainSoldIcon ? null : viewShadow,
    isFlat: isPlainSoldIcon ? true : isFlat,
    shape: isCondition ? 'circle' : 'default',
    fixedSize: isCondition ? conditionDiameter : null,
    rotateDeg: isPlainSoldIcon ? 0 : (stylePreset.rotateDeg ?? 0),
  };
}

/** Visible body lines before ellipsis (non-text, non-circle tags). Text tags grow until image height. */
export const TAG_BODY_MAX_LINES = 3;

/**
 * Default text-tag chip width on create (fraction of image width).
 * Max allowed width is the full image (see resolveTagMaxWidth) — do not stretch empty edit to max.
 */
export const TEXT_TAG_DEFAULT_WIDTH_RATIO = 0.49;

/** Default pixel width for a new/empty text tag chip. */
export function resolveTextTagDefaultWidth(imageWidth: number) {
  return Math.max(64, Math.round(Math.max(0, imageWidth) * TEXT_TAG_DEFAULT_WIDTH_RATIO));
}

/**
 * Quantity chip width for "x" + N digits (1–3). Grows with digit count; never forces wrap.
 */
export function resolveQuantityTagWidth(
  digitCountOrText: number | string,
  fontSize: number,
  paddingHorizontal: number,
  maxWidth: number,
  minHeight: number,
): number {
  const rawCount =
    typeof digitCountOrText === 'number'
      ? digitCountOrText
      : (extractPriceDigits(digitCountOrText) || '1').length;
  const digitCount = Math.max(1, Math.min(QUANTITY_MAX_DIGITS, rawCount));
  const contentWidth = Math.ceil(fontSize * (1.15 + digitCount * 0.72) + paddingHorizontal * 2 + 4);
  return Math.min(maxWidth, Math.max(contentWidth, minHeight));
}

/** Digits-only field width inside the quantity chip (prefix "x" is a sibling). */
export function resolveQuantityDigitsFieldWidth(digitCountOrText: number | string, fontSize: number): number {
  const rawCount =
    typeof digitCountOrText === 'number'
      ? digitCountOrText
      : (extractPriceDigits(digitCountOrText) || '1').length;
  const digitCount = Math.max(1, Math.min(QUANTITY_MAX_DIGITS, rawCount));
  return Math.ceil(fontSize * digitCount * 0.72 + 4);
}

/**
 * Language chip width for short codes ("TH"/"EN").
 * Floors width above height so pill radius stays capsule at every size (not a circle).
 */
export function resolveLanguageTagWidth(
  fontSize: number,
  paddingHorizontal: number,
  minHeight: number,
  maxWidth: number,
): number {
  const contentWidth = Math.ceil(fontSize * 1.85 + paddingHorizontal * 2);
  const capsuleMinWidth = Math.round(minHeight * LANGUAGE_CAPSULE_ASPECT);
  return Math.min(maxWidth, Math.max(contentWidth, capsuleMinWidth));
}

/**
 * Text tags may grow up to the full image width (caller also caps by room-to-right).
 * Quantity grows with digit count (1 line) up to size-preset maxWidth.
 * Other types keep size-preset maxWidth.
 */
export function resolveTagMaxWidth(tag: PriceTag, imageWidth: number, typeOverride?: TagType): number {
  const type = typeOverride ?? tag.type;
  if (type === 'text') {
    return Math.max(0, imageWidth);
  }

  const preset = getResolvedTagPreset(tag, typeOverride);
  if (type === 'quantity') {
    const qtyDigits = extractPriceDigits(tag.text) || String(tag.quantity ?? 1);
    return resolveQuantityTagWidth(
      qtyDigits,
      preset.fontSize,
      preset.paddingHorizontal,
      preset.maxWidth,
      preset.minHeight,
    );
  }

  if (type === 'language') {
    return resolveLanguageTagWidth(
      preset.fontSize,
      preset.paddingHorizontal,
      preset.minHeight,
      preset.maxWidth,
    );
  }

  return preset.maxWidth;
}

/**
 * Estimated pixel size used when clamping a newly placed tag into the image.
 * Prefer a realistic chip width so right-edge placements stay inside the photo.
 */
export function estimatePlacementTagSize(
  type: TagType,
  sizePresetId?: TagSizePresetId,
  imageWidth?: number,
): { width: number; height: number } {
  const preset = TAG_SIZE_PRESETS[
    sizePresetId ??
      (type === 'condition'
        ? DEFAULT_CONDITION_SIZE_PRESET_ID
        : type === 'language'
          ? DEFAULT_LANGUAGE_SIZE_PRESET_ID
          : DEFAULT_TAG_SIZE_PRESET_ID)
  ];
  const height = preset.minHeight + preset.paddingVertical * 2;

  if (type === 'quantity') {
    // Default place width for 1 digit ("x1"); grows on edit as digits are typed.
    const width = resolveQuantityTagWidth(1, preset.fontSize, preset.paddingHorizontal, preset.maxWidth, preset.minHeight);
    return { width, height };
  }

  if (type === 'language') {
    const width = resolveLanguageTagWidth(
      preset.fontSize,
      preset.paddingHorizontal,
      preset.minHeight,
      preset.maxWidth,
    );
    return { width, height };
  }

  if (type === 'condition') {
    const diameter = Math.max(preset.minHeight + preset.paddingVertical * 2, 36);
    return { width: diameter, height: diameter };
  }

  if (type === 'text') {
    // Default create width (~49% of image) — not the full max — so edge taps clamp correctly.
    const width =
      imageWidth != null && imageWidth > 0
        ? resolveTextTagDefaultWidth(imageWidth)
        : Math.min(preset.maxWidth, Math.max(64, Math.round(preset.maxWidth * TEXT_TAG_DEFAULT_WIDTH_RATIO)));
    return { width, height };
  }

  return {
    width: Math.min(preset.maxWidth, Math.max(80, Math.round(preset.maxWidth * 0.55))),
    height,
  };
}

/** Map resolved text shadow onto RN Text style props. */
export function getTagTextShadowStyle(textShadow: TagTextShadow | null): TextStyle {
  if (!textShadow) {
    return {};
  }

  return {
    textShadowColor: textShadow.color,
    textShadowOffset: textShadow.offset,
    textShadowRadius: textShadow.radius,
  };
}

/** Map resolved view shadow onto RN View style props (`null` = flat). */
export function getTagViewShadowStyle(viewShadow: TagViewShadow | null): ViewStyle {
  if (!viewShadow) {
    return {
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    };
  }

  return {
    shadowColor: viewShadow.shadowColor,
    shadowOffset: viewShadow.shadowOffset,
    shadowOpacity: viewShadow.shadowOpacity,
    shadowRadius: viewShadow.shadowRadius,
    elevation: viewShadow.elevation,
  };
}
