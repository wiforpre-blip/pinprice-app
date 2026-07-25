import { useCallback, useEffect, useMemo, useState } from 'react';

import { loadCoachCompleted, markCoachCompleted } from '@/services/tips.service';
import {
  EDITOR_COACH_STEPS,
  getNextCoachStep,
  getPreviousCoachStep,
  type EditorCoachStepId,
} from '@/types/tips';
import type { EditorPricingMode } from '@/types/editor';

type UseEditorCoachOptions = {
  editorMode: EditorPricingMode;
  hasConfirmModal: boolean;
  hasImage: boolean;
  isDraggingTag: boolean;
  isExporting: boolean;
  isPreviewing: boolean;
  isStylePickerVisible: boolean;
  tagCount: number;
  openStylePicker: () => void;
  finishStylePicker: () => void;
  closeStylePicker: () => void;
};

export function useEditorCoach({
  editorMode,
  hasConfirmModal,
  hasImage,
  isDraggingTag,
  isExporting,
  isPreviewing,
  isStylePickerVisible,
  tagCount,
  openStylePicker,
  finishStylePicker,
  closeStylePicker,
}: UseEditorCoachOptions) {
  const [isReady, setIsReady] = useState(false);
  const [isCompleted, setIsCompleted] = useState(true);
  const [activeStepId, setActiveStepId] = useState<EditorCoachStepId | null>(null);
  const [placeTagBaselineCount, setPlaceTagBaselineCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    void loadCoachCompleted().then((completed) => {
      if (!isMounted) {
        return;
      }

      setIsCompleted(completed);
      setIsReady(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const completeCoach = useCallback(() => {
    setIsCompleted(true);
    setActiveStepId(null);
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

  // Start coach on first eligible editor visit.
  useEffect(() => {
    if (suppressed || activeStepId) {
      return;
    }

    setActiveStepId(EDITOR_COACH_STEPS[0]!);
  }, [activeStepId, suppressed]);

  // If Style opens during step 1 (learning by doing), advance.
  useEffect(() => {
    if (activeStepId !== 'style-button' || !isStylePickerVisible) {
      return;
    }

    setActiveStepId('style-types');
  }, [activeStepId, isStylePickerVisible]);

  // Keep picker open for type/size steps.
  useEffect(() => {
    if (activeStepId !== 'style-types' && activeStepId !== 'style-size') {
      return;
    }

    if (!isStylePickerVisible) {
      openStylePicker();
    }
  }, [activeStepId, isStylePickerVisible, openStylePicker]);

  // Complete when user places a tag during place-tag step.
  useEffect(() => {
    if (activeStepId !== 'place-tag') {
      return;
    }

    if (tagCount > placeTagBaselineCount) {
      completeCoach();
    }
  }, [activeStepId, completeCoach, placeTagBaselineCount, tagCount]);

  const goNext = useCallback(() => {
    if (!activeStepId) {
      return;
    }

    // Open picker first; step advances when picker is visible so tip/UI stay in sync.
    if (activeStepId === 'style-button') {
      openStylePicker();
      return;
    }

    if (activeStepId === 'style-types') {
      setActiveStepId('style-size');
      return;
    }

    if (activeStepId === 'style-size') {
      finishStylePicker();
      setPlaceTagBaselineCount(tagCount);
      setActiveStepId('place-tag');
      return;
    }

    if (activeStepId === 'place-tag') {
      completeCoach();
    }
  }, [activeStepId, completeCoach, finishStylePicker, openStylePicker, tagCount]);

  const goBack = useCallback(() => {
    if (!activeStepId) {
      return;
    }

    const previous = getPreviousCoachStep(activeStepId);
    if (!previous) {
      return;
    }

    if (activeStepId === 'style-types' && previous === 'style-button') {
      closeStylePicker();
    }

    if (activeStepId === 'place-tag' && previous === 'style-size') {
      openStylePicker();
    }

    setActiveStepId(previous);
  }, [activeStepId, closeStylePicker, openStylePicker]);

  const skip = useCallback(() => {
    completeCoach();
  }, [completeCoach]);

  const visibleStepId = suppressed ? null : activeStepId;

  const canGoBack = useMemo(() => {
    if (!visibleStepId) {
      return false;
    }
    return getPreviousCoachStep(visibleStepId) !== null;
  }, [visibleStepId]);

  const canGoNext = useMemo(() => {
    if (!visibleStepId) {
      return false;
    }
    return getNextCoachStep(visibleStepId) !== null || visibleStepId === 'place-tag';
  }, [visibleStepId]);

  return {
    activeStepId: visibleStepId,
    canGoBack,
    canGoNext,
    goBack,
    goNext,
    skip,
  };
}
