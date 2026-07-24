import { useCallback, useRef, useState } from 'react';

import { useEditorHistory } from '@/hooks/useEditorHistory';
import type { EditorPricingMode, EditorUndoSnapshot } from '@/types/editor';
import type { PanelMarker } from '@/types/pricePanel';
import type { PriceTag } from '@/types/tag';

type EditorChromeBindings = {
  clearPricePanelState: () => void;
  clearTagEditorState: () => void;
  closeStylePicker: () => void;
  getCurrentSnapshot: () => EditorUndoSnapshot;
  panelMarkersLength: number;
  restoreMarkers: (markers: PanelMarker[]) => void;
  restoreTags: (tags: PriceTag[]) => void;
  tagsLength: number;
};

const EMPTY_BINDINGS: EditorChromeBindings = {
  clearPricePanelState: () => undefined,
  clearTagEditorState: () => undefined,
  closeStylePicker: () => undefined,
  getCurrentSnapshot: () => ({ mode: 'tag', tags: [] }),
  panelMarkersLength: 0,
  restoreMarkers: () => undefined,
  restoreTags: () => undefined,
  tagsLength: 0,
};

function restoreSnapshot(
  snapshot: EditorUndoSnapshot,
  restoreTags: (tags: PriceTag[]) => void,
  restoreMarkers: (markers: PanelMarker[]) => void,
) {
  if (snapshot.mode === 'tag') {
    restoreTags(snapshot.tags);
    return;
  }

  restoreMarkers(snapshot.markers);
}

export function useEditorChrome() {
  const bindingsRef = useRef<EditorChromeBindings>(EMPTY_BINDINGS);
  const {
    canRedo,
    canUndo,
    clearHistory,
    confirmPendingDraftHistory,
    discardPendingDraftHistory,
    pushHistory,
    redo,
    undo,
  } = useEditorHistory();
  const [editorMode, setEditorMode] = useState<EditorPricingMode>('tag');
  const [pendingEditorMode, setPendingEditorMode] = useState<EditorPricingMode | null>(null);
  const [isModeSwitchModalVisible, setIsModeSwitchModalVisible] = useState(false);
  const [isModeSelectorVisible, setIsModeSelectorVisible] = useState(false);
  const [isMoreMenuVisible, setIsMoreMenuVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const bindChrome = useCallback((bindings: EditorChromeBindings) => {
    bindingsRef.current = bindings;
  }, []);

  const closeOverlayMenus = useCallback(() => {
    setIsModeSelectorVisible(false);
    setIsMoreMenuVisible(false);
  }, []);

  const openModeSelector = () => {
    bindingsRef.current.closeStylePicker();
    setIsMoreMenuVisible(false);
    setIsModeSelectorVisible(true);
  };

  const closeModeSelector = () => {
    setIsModeSelectorVisible(false);
  };

  const openMoreMenu = () => {
    bindingsRef.current.closeStylePicker();
    setIsModeSelectorVisible(false);
    setIsMoreMenuVisible(true);
  };

  const closeMoreMenu = () => {
    setIsMoreMenuVisible(false);
  };

  const openSettings = () => {
    bindingsRef.current.closeStylePicker();
    setIsModeSelectorVisible(false);
    setIsMoreMenuVisible(false);
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  const hydrateEditorMode = useCallback((mode: EditorPricingMode) => {
    setEditorMode(mode);
  }, []);

  const switchEditorMode = (mode: EditorPricingMode) => {
    const { clearPricePanelState, clearTagEditorState } = bindingsRef.current;

    setEditorMode(mode);
    clearHistory();
    clearTagEditorState();
    clearPricePanelState();
    closeModeSelector();
  };

  const handleSelectEditorMode = (mode: EditorPricingMode) => {
    const { panelMarkersLength, tagsLength } = bindingsRef.current;

    if (mode === editorMode) {
      closeModeSelector();
      return;
    }

    const hasOpposingElements = editorMode === 'tag' ? tagsLength > 0 : panelMarkersLength > 0;

    if (!hasOpposingElements) {
      switchEditorMode(mode);
      return;
    }

    setPendingEditorMode(mode);
    setIsModeSwitchModalVisible(true);
  };

  const cancelModeSwitch = () => {
    setPendingEditorMode(null);
    setIsModeSwitchModalVisible(false);
  };

  const confirmModeSwitch = () => {
    if (!pendingEditorMode) {
      setIsModeSwitchModalVisible(false);
      return;
    }

    switchEditorMode(pendingEditorMode);
    setPendingEditorMode(null);
    setIsModeSwitchModalVisible(false);
  };

  const handleUndo = () => {
    const { clearTagEditorState, getCurrentSnapshot, restoreMarkers, restoreTags } = bindingsRef.current;
    const previous = undo(getCurrentSnapshot());

    if (!previous) {
      return;
    }

    restoreSnapshot(previous, restoreTags, restoreMarkers);
    clearTagEditorState();
  };

  const handleRedo = () => {
    const { clearTagEditorState, getCurrentSnapshot, restoreMarkers, restoreTags } = bindingsRef.current;
    const next = redo(getCurrentSnapshot());

    if (!next) {
      return;
    }

    restoreSnapshot(next, restoreTags, restoreMarkers);
    clearTagEditorState();
  };

  return {
    bindChrome,
    canRedo,
    canUndo,
    cancelModeSwitch,
    clearHistory,
    closeMoreMenu,
    closeOverlayMenus,
    closeSettings,
    confirmModeSwitch,
    confirmPendingDraftHistory,
    discardPendingDraftHistory,
    editorMode,
    handleRedo,
    handleSelectEditorMode,
    handleUndo,
    hydrateEditorMode,
    isModeSelectorVisible,
    isModeSwitchModalVisible,
    isMoreMenuVisible,
    isSettingsOpen,
    openModeSelector,
    openMoreMenu,
    openSettings,
    pendingEditorMode,
    pushHistory,
  };
}
