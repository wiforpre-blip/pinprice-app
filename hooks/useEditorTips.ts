import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { dismissEditorTip, loadDismissedTips } from '@/services/tips.service';
import type { EditorPricingMode } from '@/types/editor';
import { EDITOR_TIP_PRIORITY, type EditorTipId } from '@/types/tips';

type UseEditorTipsOptions = {
  editorMode: EditorPricingMode;
  hasConfirmModal: boolean;
  hasImage: boolean;
  isDraggingTag: boolean;
  isExporting: boolean;
  isPreviewing: boolean;
  isStylePickerVisible: boolean;
  isTagEditorOpen: boolean;
  isZoomMode: boolean;
  tagCount: number;
};

function isTipEligible(tipId: EditorTipId, options: UseEditorTipsOptions, dismissed: Set<EditorTipId>): boolean {
  if (dismissed.has(tipId)) {
    return false;
  }

  const { hasImage, tagCount, isTagEditorOpen, isZoomMode, isStylePickerVisible } = options;

  switch (tipId) {
    case 'add-tag':
      return hasImage && tagCount === 0;
    case 'drag-tag':
      return hasImage && tagCount >= 1;
    case 'style':
      return hasImage && !isStylePickerVisible;
    case 'tag-popup':
      return isTagEditorOpen;
    case 'select':
      return hasImage && tagCount >= 2 && !isStylePickerVisible;
    case 'zoom':
      return hasImage && isZoomMode;
    case 'export':
      return hasImage && tagCount >= 1 && !isStylePickerVisible;
    default:
      return false;
  }
}

export function useEditorTips({
  editorMode,
  hasConfirmModal,
  hasImage,
  isDraggingTag,
  isExporting,
  isPreviewing,
  isStylePickerVisible,
  isTagEditorOpen,
  isZoomMode,
  tagCount,
}: UseEditorTipsOptions) {
  const [dismissedTips, setDismissedTips] = useState<EditorTipId[]>([]);
  const [isReady, setIsReady] = useState(false);
  const wasTagEditorOpenRef = useRef(false);
  const wasZoomModeRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    void loadDismissedTips().then((stored) => {
      if (!isMounted) {
        return;
      }

      setDismissedTips(stored);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const markDismissed = useCallback((tipId: EditorTipId) => {
    setDismissedTips((current) => (current.includes(tipId) ? current : [...current, tipId]));
    void dismissEditorTip(tipId);
  }, []);

  // Auto-dismiss: first tag added.
  useEffect(() => {
    if (!isReady || tagCount < 1) {
      return;
    }

    markDismissed('add-tag');
  }, [isReady, markDismissed, tagCount]);

  // Auto-dismiss: tag editor closed.
  useEffect(() => {
    if (!isReady) {
      wasTagEditorOpenRef.current = isTagEditorOpen;
      return;
    }

    if (wasTagEditorOpenRef.current && !isTagEditorOpen) {
      markDismissed('tag-popup');
    }

    wasTagEditorOpenRef.current = isTagEditorOpen;
  }, [isReady, isTagEditorOpen, markDismissed]);

  // Auto-dismiss: leave zoom mode.
  useEffect(() => {
    if (!isReady) {
      wasZoomModeRef.current = isZoomMode;
      return;
    }

    if (wasZoomModeRef.current && !isZoomMode) {
      markDismissed('zoom');
    }

    wasZoomModeRef.current = isZoomMode;
  }, [isReady, isZoomMode, markDismissed]);

  const notifyTagDragCompleted = useCallback(() => {
    markDismissed('drag-tag');
  }, [markDismissed]);

  const notifyExportSuccess = useCallback(() => {
    markDismissed('export');
  }, [markDismissed]);

  const dismissActiveTip = useCallback(
    (tipId: EditorTipId) => {
      markDismissed(tipId);
    },
    [markDismissed],
  );

  const suppressed =
    !isReady ||
    editorMode !== 'tag' ||
    isDraggingTag ||
    isExporting ||
    isPreviewing ||
    hasConfirmModal;

  const dismissedSet = useMemo(() => new Set(dismissedTips), [dismissedTips]);

  const activeTipId = useMemo(() => {
    if (suppressed) {
      return null;
    }

    const context: UseEditorTipsOptions = {
      editorMode,
      hasConfirmModal,
      hasImage,
      isDraggingTag,
      isExporting,
      isPreviewing,
      isStylePickerVisible,
      isTagEditorOpen,
      isZoomMode,
      tagCount,
    };

    for (const tipId of EDITOR_TIP_PRIORITY) {
      if (isTipEligible(tipId, context, dismissedSet)) {
        return tipId;
      }
    }

    return null;
  }, [
    dismissedSet,
    editorMode,
    hasConfirmModal,
    hasImage,
    isDraggingTag,
    isExporting,
    isPreviewing,
    isStylePickerVisible,
    isTagEditorOpen,
    isZoomMode,
    suppressed,
    tagCount,
  ]);

  return {
    activeTipId,
    dismissActiveTip,
    notifyExportSuccess,
    notifyTagDragCompleted,
  };
}

export function getEditorTipMessageKey(tipId: EditorTipId): string {
  switch (tipId) {
    case 'add-tag':
      return 'editor.tips.addTag';
    case 'drag-tag':
      return 'editor.tips.dragTag';
    case 'style':
      return 'editor.tips.style';
    case 'tag-popup':
      return 'editor.tips.tagPopup';
    case 'select':
      return 'editor.tips.select';
    case 'zoom':
      return 'editor.tips.zoom';
    case 'export':
      return 'editor.tips.export';
    default:
      return 'editor.tips.addTag';
  }
}
