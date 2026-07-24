import type { EditorPricingMode } from '@/types/editor';
import type { PanelMarker } from '@/types/pricePanel';
import type { PriceTag } from '@/types/tag';

/** Local editor session snapshot persisted after a successful save/share. */
export type EditorDraft = {
  id: string;
  filename: string;
  /** App-owned copy under documentDirectory — not a raw picker URI. */
  imageUri: string;
  editorMode: EditorPricingMode;
  tags: PriceTag[];
  panelMarkers: PanelMarker[];
  createdAt: string;
  updatedAt: string;
};

/** Payload captured from the live editor at export time. */
export type EditorDraftSnapshot = {
  filename: string;
  editorMode: EditorPricingMode;
  tags: PriceTag[];
  panelMarkers: PanelMarker[];
};

export type UpsertEditorDraftInput = EditorDraftSnapshot & {
  /** Reuse when the same editor session saves/shares again. */
  id?: string;
  sourceImageUri: string;
};
