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
};

export const DEFAULT_TAG_SIZE_PRESET_ID: TagSizePresetId = 'medium';

export const TAG_STYLE_PRESETS: Record<TagStylePresetId, { label: string; type: TagType; backgroundColor: string; borderColor: string; color: string }> = {
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
  'sold-red': {
    label: 'Red',
    type: 'sold',
    backgroundColor: theme.colors.sold,
    borderColor: theme.colors.sold,
    color: theme.colors.white,
  },
  'sold-gray': {
    label: 'Gray',
    type: 'sold',
    backgroundColor: theme.colors.textMuted,
    borderColor: theme.colors.textMuted,
    color: theme.colors.white,
  },
};

export const TAG_SIZE_PRESETS: Record<
  TagSizePresetId,
  { label: string; minHeight: number; maxWidth: number; paddingHorizontal: number; paddingVertical: number; fontSize: number; lineHeight: number }
> = {
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
};

export function getStylePresetForType(type: TagType, stylePresetId?: TagStylePresetId) {
  if (stylePresetId && TAG_STYLE_PRESETS[stylePresetId]?.type === type) {
    return stylePresetId;
  }

  return DEFAULT_TAG_STYLE_BY_TYPE[type];
}

export function getResolvedTagPreset(tag: PriceTag, typeOverride?: TagType): ResolvedTagPreset {
  const type = typeOverride ?? tag.type;
  const stylePreset = TAG_STYLE_PRESETS[getStylePresetForType(type, tag.stylePresetId)];
  const sizePreset = TAG_SIZE_PRESETS[tag.sizePresetId ?? DEFAULT_TAG_SIZE_PRESET_ID];

  return {
    backgroundColor: stylePreset.backgroundColor,
    borderColor: stylePreset.borderColor,
    color: stylePreset.color,
    minHeight: sizePreset.minHeight,
    maxWidth: sizePreset.maxWidth,
    paddingHorizontal: sizePreset.paddingHorizontal,
    paddingVertical: sizePreset.paddingVertical,
    fontSize: sizePreset.fontSize,
    lineHeight: sizePreset.lineHeight,
  };
}
