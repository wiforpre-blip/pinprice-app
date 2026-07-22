import { type Dispatch, type SetStateAction, useState } from 'react';

import type { EditorUndoSnapshot } from '@/types/editor';
import type { PanelMarker as PanelMarkerType } from '@/types/pricePanel';
import type { ImageDisplayRect } from '@/types/tag';
import { getNormalizedPointFromCanvasPoint, isPointInsideImageRect } from '@/utils/editorGeometry';

function createPanelMarker(x: number, y: number): PanelMarkerType {
  return {
    id: `marker-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    priceText: '',
    x,
    y,
  };
}

function clonePanelMarkers(markers: PanelMarkerType[]) {
  return markers.map((marker) => ({ ...marker }));
}

type UsePriceListEditorStateOptions = {
  closeStylePicker: () => void;
  deselectTagForMarkerSelect: () => void;
  imageRect: ImageDisplayRect | null;
  setUndoSnapshot: Dispatch<SetStateAction<EditorUndoSnapshot | null>>;
};

export function usePriceListEditorState({
  closeStylePicker,
  deselectTagForMarkerSelect,
  imageRect,
  setUndoSnapshot,
}: UsePriceListEditorStateOptions) {
  const [panelMarkers, setPanelMarkers] = useState<PanelMarkerType[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [isMarkerDeleteModalVisible, setIsMarkerDeleteModalVisible] = useState(false);
  const [deleteCandidateMarkerId, setDeleteCandidateMarkerId] = useState<string | null>(null);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);

  const editingMarker = panelMarkers.find((marker) => marker.id === editingMarkerId) ?? null;
  const editingMarkerIndex = editingMarkerId ? panelMarkers.findIndex((marker) => marker.id === editingMarkerId) : -1;
  const hasNextMarkerToEdit = editingMarkerIndex >= 0 && editingMarkerIndex < panelMarkers.length - 1;

  const clearPricePanelState = () => {
    setPanelMarkers([]);
    setSelectedMarkerId(null);
    setEditingMarkerId(null);
    setDeleteCandidateMarkerId(null);
    setIsMarkerDeleteModalVisible(false);
  };

  const restoreMarkers = (nextMarkers: PanelMarkerType[]) => {
    setPanelMarkers(clonePanelMarkers(nextMarkers));
    setSelectedMarkerId(null);
    setEditingMarkerId(null);
    setDeleteCandidateMarkerId(null);
    setIsMarkerDeleteModalVisible(false);
  };

  const addMarkerAtPoint = (touchX: number, touchY: number) => {
    if (!imageRect) {
      return;
    }

    if (!isPointInsideImageRect(touchX, touchY, imageRect)) {
      return;
    }

    const { x, y } = getNormalizedPointFromCanvasPoint(touchX, touchY, imageRect);
    const newMarker = createPanelMarker(x, y);

    setPanelMarkers((currentMarkers) => {
      setUndoSnapshot({ markers: clonePanelMarkers(currentMarkers), mode: 'priceList' });
      return [...currentMarkers, newMarker];
    });
    setSelectedMarkerId(newMarker.id);
    closeStylePicker();
  };

  const handleSelectMarker = (markerId: string) => {
    setSelectedMarkerId(markerId);
    deselectTagForMarkerSelect();
  };

  const handleEditMarkerPrice = (markerId: string) => {
    handleSelectMarker(markerId);
    setEditingMarkerId(markerId);
  };

  const handleCancelMarkerPriceEdit = () => {
    setEditingMarkerId(null);
  };

  const handleSaveMarkerPrice = (markerId: string, priceText: string) => {
    const currentIndex = panelMarkers.findIndex((marker) => marker.id === markerId);
    const nextMarker = currentIndex >= 0 ? panelMarkers[currentIndex + 1] : undefined;

    setPanelMarkers((currentMarkers) => {
      const previousMarker = currentMarkers.find((marker) => marker.id === markerId);

      if (!previousMarker || previousMarker.priceText === priceText) {
        return currentMarkers;
      }

      setUndoSnapshot({ markers: clonePanelMarkers(currentMarkers), mode: 'priceList' });
      return currentMarkers.map((marker) => (marker.id === markerId ? { ...marker, priceText } : marker));
    });

    if (nextMarker) {
      setSelectedMarkerId(nextMarker.id);
      setEditingMarkerId(nextMarker.id);
      return;
    }

    setSelectedMarkerId(markerId);
    setEditingMarkerId(null);
  };

  const requestDeleteMarker = (markerId: string) => {
    setSelectedMarkerId(markerId);
    setDeleteCandidateMarkerId(markerId);
    setIsMarkerDeleteModalVisible(true);
  };

  const cancelDeleteMarker = () => {
    setDeleteCandidateMarkerId(null);
    setIsMarkerDeleteModalVisible(false);
  };

  const confirmDeleteMarker = () => {
    if (!deleteCandidateMarkerId) {
      setIsMarkerDeleteModalVisible(false);
      return;
    }

    setPanelMarkers((currentMarkers) => {
      if (!currentMarkers.some((marker) => marker.id === deleteCandidateMarkerId)) {
        return currentMarkers;
      }

      setUndoSnapshot({ markers: clonePanelMarkers(currentMarkers), mode: 'priceList' });
      return currentMarkers.filter((marker) => marker.id !== deleteCandidateMarkerId);
    });

    setSelectedMarkerId((currentSelectedId) => (currentSelectedId === deleteCandidateMarkerId ? null : currentSelectedId));
    setEditingMarkerId((currentEditingId) => (currentEditingId === deleteCandidateMarkerId ? null : currentEditingId));
    setDeleteCandidateMarkerId(null);
    setIsMarkerDeleteModalVisible(false);
  };

  return {
    addMarkerAtPoint,
    cancelDeleteMarker,
    clearPricePanelState,
    confirmDeleteMarker,
    editingMarker,
    editingMarkerId,
    handleCancelMarkerPriceEdit,
    handleEditMarkerPrice,
    handleSaveMarkerPrice,
    handleSelectMarker,
    hasNextMarkerToEdit,
    isMarkerDeleteModalVisible,
    panelMarkers,
    requestDeleteMarker,
    restoreMarkers,
    selectedMarkerId,
  };
}
