export type TagType = 'price' | 'sold' | 'text' | 'condition' | 'quantity' | 'language';

export type TagStylePresetId =
  | 'price-white-black'
  | 'price-black-white'
  | 'price-yellow-black'
  | 'price-red-white'
  | 'sold-red'
  | 'sold-black'
  | 'sold-gray'
  | 'sold-icon-plain'
  | 'text-default'
  | 'text-white-border'
  | 'text-plain'
  | 'quantity-blue'
  | 'quantity-teal'
  | 'quantity-slate'
  | 'condition-default'
  | 'language-default';

/** `xs` is internal — used when item-info tags step down from S. Not shown in size pickers. */
export type TagSizePresetId = 'xs' | 'small' | 'medium' | 'large' | 'xl';

/** How price text is shown on the tag (separate from the raw amount in `text`). */
export type PriceTextFormat = 'symbol' | 'currency_word' | 'number';

/** How sold status is shown on the tag. */
export type SoldTextFormat = 'text' | 'icon' | 'icon_plain';

/** Condition grade on the tag. Phase 1 uses NM only; LP/MP can be added later. */
export type TagConditionValue = 'NM';

/** Language code shown on language tags (not app UI locale). */
export type TagLanguageCode = 'TH' | 'EN' | 'JP' | 'CN';

export type PriceTag = {
  id: string;
  type: TagType;
  /** Display text rendered on the image. */
  text: string;
  x: number;
  y: number;
  stylePresetId?: TagStylePresetId;
  sizePresetId?: TagSizePresetId;
  /** Price-only: display format for the amount. */
  priceTextFormat?: PriceTextFormat;
  /** Sold-only: text label vs cross icon. */
  soldTextFormat?: SoldTextFormat;
  /** Quantity-only: numeric count (display often as `x{n}`). */
  quantity?: number;
  /** Condition-only: grade value (placeholder starts at NM). */
  condition?: TagConditionValue;
  /** Language-only: code shown on the tag. */
  languageCode?: TagLanguageCode;
};

export type ImageDisplayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Popup save payload — type is fixed at create time and must not change here. */
export type TagEditorSaveUpdates = {
  text: string;
  stylePresetId?: TagStylePresetId;
  sizePresetId?: TagSizePresetId;
  priceTextFormat?: PriceTextFormat;
  soldTextFormat?: SoldTextFormat;
  quantity?: number;
  condition?: TagConditionValue;
  languageCode?: TagLanguageCode;
};

/** Live on-image preview while the tag popup is open (style/size/format before save). */
export type TagEditorDraftPreview = {
  text: string;
  stylePresetId?: TagStylePresetId;
  sizePresetId?: TagSizePresetId;
  priceTextFormat?: PriceTextFormat;
  soldTextFormat?: SoldTextFormat;
  languageCode?: TagLanguageCode;
};
