import { useCallback, useRef, useState } from 'react';

import type { EditorPricingMode, EditorUndoSnapshot } from '@/types/editor';
import type { PanelMarker } from '@/types/pricePanel';
import type { PriceTag } from '@/types/tag';

type EditorChromeBindings = {
  clearPricePanelState: () => void;
  clearTagEditorState: () => void;
  closeStylePicker: () => void;
  panelMarkersLength: number;
  restoreMarkers: (markers: PanelMarker[]) => void;
  restoreTags: (tags: PriceTag[]) => void;
  setUndoSnapshot: (snapshot: EditorUndoSnapshot | null) => void;
  tagsLength: number;
  undoSnapshot: EditorUndoSnapshot | null;
};

const EMPTY_BINDINGS: EditorChromeBindings = {
  clearPricePanelState: () => undefined,
  clearTagEditorState: () => undefined,
  closeStylePicker: () => undefined,
  panelMarkersLength: 0,
  restoreMarkers: () => undefined,
  restoreTags: () => undefined,
  setUndoSnapshot: () => undefined,
  tagsLength: 0,
  undoSnapshot: null,
};

export function useEditorChrome() {
  const bindingsRef = useRef<EditorChromeBindings>(EMPTY_BINDINGS);
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

  const switchEditorMode = (mode: EditorPricingMode) => {
    const { clearPricePanelState, clearTagEditorState, setUndoSnapshot } = bindingsRef.current;

    setEditorMode(mode);
    setUndoSnapshot(null);
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
    const { clearTagEditorState, restoreMarkers, restoreTags, setUndoSnapshot, undoSnapshot } =
      bindingsRef.current;

    if (!undoSnapshot) {
      return;
    }

    if (undoSnapshot.mode === 'tag') {
      restoreTags(undoSnapshot.tags);
    } else {
      restoreMarkers(undoSnapshot.markers);
    }

    setUndoSnapshot(null);
    clearTagEditorState();
  };

  const canUndo = bindingsRef.current.undoSnapshot !== null;

  return {
    bindChrome,
    canUndo,
    cancelModeSwitch,
    closeMoreMenu,
    closeOverlayMenus,
    closeSettings,
    confirmModeSwitch,
    editorMode,
    handleSelectEditorMode,
    handleUndo,
    isModeSelectorVisible,
    isModeSwitchModalVisible,
    isMoreMenuVisible,
    isSettingsOpen,
    openModeSelector,
    openMoreMenu,
    openSettings,
    pendingEditorMode,
  };
}
