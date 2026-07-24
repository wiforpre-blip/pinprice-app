import type { TagLanguageCode, SoldTextFormat, TagSizePresetId, TagStylePresetId, TagType } from '@/types/tag';

export const DEFAULT_PRICE_TEXT = '';
export const DEFAULT_SOLD_TEXT = 'SOLD';
export const DEFAULT_TEXT_TAG = '';
export const DEFAULT_CONDITION_TEXT = 'NM';
export const DEFAULT_QUANTITY = 1;
export const DEFAULT_LANGUAGE_CODE: TagLanguageCode = 'TH';
export const SOLD_ICON_TEXT = '✕';

export const SOLD_TEXT_FORMAT_CYCLE: SoldTextFormat[] = ['text', 'icon', 'icon_plain'];
export const TAG_LANGUAGE_CODE_CYCLE: TagLanguageCode[] = ['TH', 'EN', 'JP', 'CN'];
/** Visual styles cycled when re-tapping the text tool chip in the style picker. */
export const TEXT_STYLE_PRESET_CYCLE: TagStylePresetId[] = ['text-default', 'text-white-border', 'text-plain'];

export const MAIN_TAG_TYPES: TagType[] = ['price', 'sold', 'text'];
export const INFO_TAG_TYPES: TagType[] = ['condition', 'quantity', 'language'];

/** Sizes shown in pickers (excludes internal `xs`). */
export type TagPickerSizePresetId = Exclude<TagSizePresetId, 'xs'>;
export const TAG_SIZE_ORDER: TagPickerSizePresetId[] = ['small', 'medium', 'large', 'xl'];

/** Full scale including `xs` for item-info step-down from S. */
export const TAG_SIZE_SCALE: TagSizePresetId[] = ['xs', 'small', 'medium', 'large', 'xl'];

export function getNextCycleValue<T>(values: readonly T[], current: T): T {
  const index = values.indexOf(current);
  const nextIndex = index < 0 ? 0 : (index + 1) % values.length;
  return values[nextIndex]!;
}

/** Item-info tags render one size step smaller than the selected main size. */
export function getSmallerSizePreset(sizePresetId: TagSizePresetId): TagSizePresetId {
  const index = TAG_SIZE_SCALE.indexOf(sizePresetId);
  if (index <= 0) {
    return 'xs';
  }

  return TAG_SIZE_SCALE[index - 1]!;
}

/** Map stored size (may be `xs`) to a picker chip id. */
export function toPickerSizePreset(sizePresetId: TagSizePresetId): TagPickerSizePresetId {
  return sizePresetId === 'xs' ? 'small' : sizePresetId;
}

export function isInfoTagType(type: TagType) {
  return INFO_TAG_TYPES.includes(type);
}
