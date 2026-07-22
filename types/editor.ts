import type { PanelMarker } from '@/types/pricePanel';
import type { PriceTag } from '@/types/tag';

export type Size = {
  width: number;
  height: number;
};

export type TagSize = {
  width: number;
  height: number;
};

export type ScreenPoint = {
  x: number;
  y: number;
};

export type ScreenRect = ScreenPoint & {
  width: number;
  height: number;
};

export type ExportAction = 'save' | 'share';
export type EditorPricingMode = 'tag' | 'priceList';
export type EditorUndoSnapshot =
  | { mode: 'tag'; tags: PriceTag[] }
  | { markers: PanelMarker[]; mode: 'priceList' };
