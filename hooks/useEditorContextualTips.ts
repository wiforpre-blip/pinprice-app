import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTranslation } from '@/contexts/LanguageContext';
import { dismissEditorTip, loadDismissedTips } from '@/services/tips.service';
import type { EditorPricingMode } from '@/types/editor';
import {
  isEditorContextualTipId,
  type EditorContextualTipId,
} from '@/types/tips';

type UseEditorContextualTipsOptions = {
  alignFeedbackVisible: boolean;
  coachCompleted: boolean;
  editorMode: EditorPricingMode;
  hasConfirmModal: boolean;
  hasImage: boolean;
  /** Tag editor dock / draft open — hide Tip A until closed. */
  hasTagEditorOpen: boolean;
  isDraggingTag: boolean;
  isExporting: boolean;
  isMultiSelectMode: boolean;
  isPreviewing: boolean;
  isStylePickerVisible: boolean;
  selectedCount: number;
  tagCount: number;
  /** Bump after Settings "show tips again". */
  tipsResetToken?: number;
};

export function useEditorContextualTips({
  alignFeedbackVisible,
  coachCompleted,
  editorMode,
  hasConfirmModal,
  hasImage,
  hasTagEditorOpen,
  isDraggingTag,
  isExporting,
  isMultiSelectMode,
  isPreviewing,
  isStylePickerVisible,
  selectedCount,
  tagCount,
  tipsResetToken = 0,
}: UseEditorContextualTipsOptions) {
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<EditorContextualTipId>>(
    () => new Set(),
  );

  useEffect(() => {
    let isMounted = true;

    void loadDismissedTips().then((ids) => {
      if (!isMounted) {
        return;
      }

      const contextual = ids.filter(isEditorContextualTipId);
      setDismissedIds(new Set(contextual));
      setIsReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, [tipsResetToken]);

  const dismissTip = useCallback((tipId: EditorContextualTipId) => {
    setDismissedIds((current) => {
      if (current.has(tipId)) {
        return current;
      }

      const next = new Set(current);
      next.add(tipId);
      return next;
    });
    void dismissEditorTip(tipId);
  }, []);

  const suppressed =
    !isReady ||
    !coachCompleted ||
    editorMode !== 'tag' ||
    !hasImage ||
    isDraggingTag ||
    isExporting ||
    isPreviewing ||
    hasConfirmModal ||
    isStylePickerVisible ||
    alignFeedbackVisible;

  const visibleTipId = useMemo((): EditorContextualTipId | null => {
    if (suppressed) {
      return null;
    }

    // Tip B: first time ≥2 tags selected in multi-select.
    if (
      !dismissedIds.has('align') &&
      isMultiSelectMode &&
      selectedCount >= 2
    ) {
      return 'align';
    }

    // Tip A: first time ≥2 tags exist (not while multi-select or tag editor open).
    if (
      !dismissedIds.has('multi-select') &&
      tagCount >= 2 &&
      !isMultiSelectMode &&
      !hasTagEditorOpen
    ) {
      return 'multi-select';
    }

    return null;
  }, [
    dismissedIds,
    hasTagEditorOpen,
    isMultiSelectMode,
    selectedCount,
    suppressed,
    tagCount,
  ]);

  const handleGotIt = useCallback(() => {
    if (!visibleTipId) {
      return;
    }

    dismissTip(visibleTipId);
  }, [dismissTip, visibleTipId]);

  const notifyEnteredMultiSelect = useCallback(() => {
    dismissTip('multi-select');
  }, [dismissTip]);

  const notifyAlignTapped = useCallback(() => {
    dismissTip('align');
  }, [dismissTip]);

  const message = useMemo(() => {
    if (visibleTipId === 'multi-select') {
      return t('editor.contextualTips.multiSelect');
    }

    if (visibleTipId === 'align') {
      return t('editor.contextualTips.align');
    }

    return null;
  }, [t, visibleTipId]);

  return {
    message,
    notifyAlignTapped,
    notifyEnteredMultiSelect,
    onGotIt: handleGotIt,
    visibleTipId,
  };
}
