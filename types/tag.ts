export type TagType = 'price' | 'sold';
export type TagStylePresetId = 'price-white-black' | 'price-black-white' | 'sold-red' | 'sold-gray';
export type TagSizePresetId = 'small' | 'medium' | 'large';

export type PriceTag = {
  id: string;
  type: TagType;
  text: string;
  x: number;
  y: number;
  stylePresetId?: TagStylePresetId;
  sizePresetId?: TagSizePresetId;
};

export type ImageDisplayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
