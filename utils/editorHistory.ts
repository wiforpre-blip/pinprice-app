import type { EditorPricingMode, EditorUndoSnapshot } from '@/types/editor';
import type { PanelMarker } from '@/types/pricePanel';
import type { PriceTag } from '@/types/tag';

export function createCurrentHistorySnapshot(
  editorMode: EditorPricingMode,
  tags: PriceTag[],
  panelMarkers: PanelMarker[],
): EditorUndoSnapshot {
  if (editorMode === 'tag') {
    return { mode: 'tag', tags: tags.map((tag) => ({ ...tag })) };
  }

  return { markers: panelMarkers.map((marker) => ({ ...marker })), mode: 'priceList' };
}
