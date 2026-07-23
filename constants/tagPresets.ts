import { PinPriceTheme as theme } from '@/constants/theme';
import type { PriceTag, TagSizePresetId, TagStylePresetId, TagType } from '@/types/tag';

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
};

export const DEFAULT_TAG_STYLE_BY_TYPE: Record<TagType, TagStylePresetId> = {
  price: 'price-white-black',
  sold: 'sold-red',
  text: 'text-default',
  quantity: 'quantity-blue',
  condition: 'condition-default',
  language: 'language-default',
};

/** Tag types that expose a color style picker in the tag popup. */
export const TAG_TYPES_WITH_COLOR_PRESETS: readonly TagType[] = ['price', 'sold', 'quantity'];

export const DEFAULT_TAG_SIZE_PRESET_ID: TagSizePresetId = 'medium';

export const TAG_STYLE_PRESETS: Record<
  TagStylePresetId,
  { label: string; type: TagType; backgroundColor: string; borderColor: string; color: string }
> = {
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
  'sold-red': {
    label: 'Red',
    type: 'sold',
    backgroundColor: theme.colors.sold,
    borderColor: theme.colors.sold,
    color: theme.colors.white,
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
  'sold-icon-plain': {
    label: 'Red Cross',
    type: 'sold',
    backgroundColor: theme.tags.soldIconPlain.backgroundColor,
    borderColor: theme.tags.soldIconPlain.borderColor,
    color: theme.tags.soldIconPlain.color,
  },
  'text-default': {
    label: 'Default',
    type: 'text',
    backgroundColor: theme.tags.text.backgroundColor,
    borderColor: theme.tags.text.borderColor,
    color: theme.tags.text.color,
  },
  'quantity-blue': {
    label: 'Blue',
    type: 'quantity',
    backgroundColor: theme.colors.quantityBlue,
    borderColor: theme.colors.quantityBlue,
    color: theme.colors.white,
  },
  'quantity-teal': {
    label: 'Teal',
    type: 'quantity',
    backgroundColor: theme.colors.quantityTeal,
    borderColor: theme.colors.quantityTeal,
    color: theme.colors.white,
  },
  'quantity-slate': {
    label: 'Slate',
    type: 'quantity',
    backgroundColor: theme.colors.quantitySlate,
    borderColor: theme.colors.quantitySlate,
    color: theme.colors.white,
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
  },
};

export const TAG_SIZE_PRESETS: Record<
  TagSizePresetId,
  { label: string; minHeight: number; maxWidth: number; paddingHorizontal: number; paddingVertical: number; fontSize: number; lineHeight: number }
> = {
  xs: {
    label: 'XS',
    minHeight: 22,
    maxWidth: 120,
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: 2,
    fontSize: 10,
    lineHeight: 12,
  },
  small: {
    label: 'Small',
    minHeight: 28,
    maxWidth: 148,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    fontSize: 12,
    lineHeight: 16,
  },
  medium: {
    label: 'Medium',
    minHeight: 32,
    maxWidth: 180,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    fontSize: theme.typography.tag.fontSize,
    lineHeight: theme.typography.tag.lineHeight,
  },
  large: {
    label: 'Large',
    minHeight: 40,
    maxWidth: 220,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 18,
    lineHeight: 22,
  },
  xl: {
    label: 'XL',
    minHeight: 48,
    maxWidth: 260,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 22,
    lineHeight: 26,
  },
};

export function getStylePresetForType(type: TagType, stylePresetId?: TagStylePresetId) {
  if (stylePresetId && TAG_STYLE_PRESETS[stylePresetId]?.type === type) {
    return stylePresetId;
  }

  return DEFAULT_TAG_STYLE_BY_TYPE[type];
}

export function getStylePresetIdsForType(type: TagType): TagStylePresetId[] {
  return (Object.keys(TAG_STYLE_PRESETS) as TagStylePresetId[]).filter((presetId) => {
    const preset = TAG_STYLE_PRESETS[presetId];
    if (preset.type !== type) {
      return false;
    }

    // Plain sold cross is selected via sold format cycle, not the color swatch row.
    if (presetId === 'sold-icon-plain') {
      return false;
    }

    return true;
  });
}

export function getResolvedTagPreset(tag: PriceTag, typeOverride?: TagType): ResolvedTagPreset {
  const type = typeOverride ?? tag.type;
  const stylePresetId =
    type === 'sold' && tag.soldTextFormat === 'icon_plain'
      ? 'sold-icon-plain'
      : getStylePresetForType(type, tag.stylePresetId);
  const stylePreset = TAG_STYLE_PRESETS[stylePresetId];
  const sizePreset = TAG_SIZE_PRESETS[tag.sizePresetId ?? DEFAULT_TAG_SIZE_PRESET_ID];
  const isPlainSoldIcon = type === 'sold' && tag.soldTextFormat === 'icon_plain';
  const isBadgeSoldIcon = type === 'sold' && tag.soldTextFormat === 'icon';
  const soldIconSize = Math.max(28, Math.round(sizePreset.fontSize * 2.2));

  return {
    backgroundColor: stylePreset.backgroundColor,
    borderColor: stylePreset.borderColor,
    color: stylePreset.color,
    minHeight: isPlainSoldIcon || isBadgeSoldIcon ? soldIconSize + theme.spacing.sm : sizePreset.minHeight,
    maxWidth: sizePreset.maxWidth,
    paddingHorizontal: isPlainSoldIcon ? theme.spacing.xs : sizePreset.paddingHorizontal,
    paddingVertical: isPlainSoldIcon ? theme.spacing.xs : sizePreset.paddingVertical,
    fontSize: isPlainSoldIcon || isBadgeSoldIcon ? soldIconSize : sizePreset.fontSize,
    lineHeight: isPlainSoldIcon || isBadgeSoldIcon ? soldIconSize : sizePreset.lineHeight,
  };
}
