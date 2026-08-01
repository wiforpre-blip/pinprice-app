import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { loadCoachCompleted, markCoachCompleted } from '@/services/tips.service';
import {
  EDITOR_COACH_STEPS,
  getNextCoachStep,
  isCoachActionRequiredStep,
  type EditorCoachStepId,
} from '@/types/tips';
import type { EditorPricingMode } from '@/types/editor';

type UseEditorCoachOptions = {
  draftTagId: string | null;
  editorMode: EditorPricingMode;
  hasConfirmModal: boolean;
  hasImage: boolean;
  isDraggingTag: boolean;
  isExporting: boolean;
  isPreviewing: boolean;
  isStylePickerVisible: boolean;
  /** Newest tag id while a draft is open — used to track place → edit → drag focus. */
  selectedTagId: string | null;
  tagCount: number;
  /** Tag ids currently on the canvas (for cancel/save detection). */
  tagIds: string[];
  openStylePicker: () => void;
  finishStylePicker: () => void;
  /** Bump after Settings "show tips again" so the coach reloads without leaving the editor. */
  tipsResetToken?: number;
};

export function useEditorCoach({
  draftTagId,
  editorMode,
  hasConfirmModal,
  hasImage,
  isDraggingTag,
  isExporting,
  isPreviewing,
  isStylePickerVisible,
  selectedTagId,
  tagCount,
  tagIds,
  openStylePicker,
  finishStylePicker,
  tipsResetToken = 0,
}: UseEditorCoachOptions) {
  const [isReady, setIsReady] = useState(false);
  const [isCompleted, setIsCompleted] = useState(true);
  const [activeStepId, setActiveStepId] = useState<EditorCoachStepId | null>(null);
  const [placeTagBaselineCount, setPlaceTagBaselineCount] = useState(0);
  const [focusTagId, setFocusTagId] = useState<string | null>(null);
  const dragSatisfiedRef = useRef(false);
  const stylePickerOpenedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    void loadCoachCompleted().then((completed) => {
      if (!isMounted) {
        return;
      }

      setIsCompleted(completed);
      setIsReady(true);
      if (!completed) {
        setActiveStepId(null);
        setFocusTagId(null);
        dragSatisfiedRef.current = false;
        stylePickerOpenedRef.current = false;
      }
    });

    return () => {
      isMounted = false;
    };
  }, [tipsResetToken]);

  const completeCoach = useCallback(() => {
    setIsCompleted(true);
    setActiveStepId(null);
    setFocusTagId(null);
    dragSatisfiedRef.current = false;
    stylePickerOpenedRef.current = false;
    void markCoachCompleted();
  }, []);

  const suppressed =
    !isReady ||
    isCompleted ||
    editorMode !== 'tag' ||
    !hasImage ||
    isDraggingTag ||
    isExporting ||
    isPreviewing ||
    hasConfirmModal;

  const hideOverlay =
    suppressed || (activeStepId === 'style-button' && isStylePickerVisible);

  // Start coach on first eligible editor visit.
  useEffect(() => {
    if (suppressed || activeStepId) {
      return;
    }

    setPlaceTagBaselineCount(tagCount);
    setFocusTagId(null);
    dragSatisfiedRef.current = false;
    stylePickerOpenedRef.current = false;
    setActiveStepId(EDITOR_COACH_STEPS[0]!);
  }, [activeStepId, suppressed, tagCount]);

  // Step 1 → 2: user tapped the photo and a NEW draft tag exists.
  useEffect(() => {
    if (activeStepId !== 'place-tag') {
      return;
    }

    if (tagCount <= placeTagBaselineCount) {
      return;
    }

    // Only advance when the brand-new draft tag is created.
    // Using selectedTagId here can accidentally target an old selection.
    if (!draftTagId || !tagIds.includes(draftTagId)) {
      return;
    }

    setFocusTagId(draftTagId);
    setActiveStepId('edit-price');
  }, [activeStepId, draftTagId, placeTagBaselineCount, tagIds, tagCount]);

  // Step 2: save advances; cancel empty draft returns to step 1.
  useEffect(() => {
    if (activeStepId !== 'edit-price' || !focusTagId) {
      return;
    }

    const tagStillExists = tagIds.includes(focusTagId);
    if (!tagStillExists) {
      setPlaceTagBaselineCount(tagCount);
      setFocusTagId(null);
      setActiveStepId('place-tag');
      return;
    }

    const editorClosed = selectedTagId === null && draftTagId === null;
    if (editorClosed) {
      setActiveStepId('drag-tag');
    }
  }, [activeStepId, draftTagId, focusTagId, selectedTagId, tagCount, tagIds]);

  // Step 3: real drag satisfies the step when the gesture ends.
  useEffect(() => {
    if (activeStepId !== 'drag-tag') {
      return;
    }

    if (isDraggingTag) {
      dragSatisfiedRef.current = true;
      return;
    }

    if (dragSatisfiedRef.current) {
      dragSatisfiedRef.current = false;
      setActiveStepId('style-button');
    }
  }, [activeStepId, isDraggingTag]);

  // Step 4: after Style picker was opened (Next or tap), advance when it closes.
  useEffect(() => {
    if (activeStepId !== 'style-button') {
      return;
    }

    if (isStylePickerVisible) {
      stylePickerOpenedRef.current = true;
      return;
    }

    if (stylePickerOpenedRef.current) {
      stylePickerOpenedRef.current = false;
      finishStylePicker();
      setActiveStepId('export');
    }
  }, [activeStepId, finishStylePicker, isStylePickerVisible]);

  // Keep Export tip usable — close picker if it is somehow still open.
  useEffect(() => {
    if (activeStepId !== 'export' || !isStylePickerVisible) {
      return;
    }

    finishStylePicker();
  }, [activeStepId, finishStylePicker, isStylePickerVisible]);

  const goNext = useCallback(() => {
    if (!activeStepId || isCoachActionRequiredStep(activeStepId)) {
      return;
    }

    if (activeStepId === 'drag-tag') {
      dragSatisfiedRef.current = false;
      setActiveStepId('style-button');
      return;
    }

    // Open picker first; advance to Export when the user closes it.
    if (activeStepId === 'style-button') {
      openStylePicker();
      return;
    }

    if (activeStepId === 'export') {
      completeCoach();
    }
  }, [activeStepId, completeCoach, openStylePicker]);

  const goBack = useCallback(() => {
    // Soft-required flow: no reverse navigation — Skip is always available.
  }, []);

  const skip = useCallback(() => {
    if (isStylePickerVisible) {
      finishStylePicker();
    }
    completeCoach();
  }, [completeCoach, finishStylePicker, isStylePickerVisible]);

  const visibleStepId = hideOverlay ? null : activeStepId;

  const canGoBack = false;

  const canGoNext = useMemo(() => {
    if (!visibleStepId) {
      return false;
    }
    if (isCoachActionRequiredStep(visibleStepId)) {
      return false;
    }
    return getNextCoachStep(visibleStepId) !== null || visibleStepId === 'export';
  }, [visibleStepId]);

  return {
    activeStepId: visibleStepId,
    canGoBack,
    canGoNext,
    focusTagId,
    goBack,
    goNext,
    /** True only after storage load and coach finished/skipped — gates contextual tips. */
    isCoachCompleted: isReady && isCompleted,
    skip,
  };
}
