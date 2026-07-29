export const EDITOR_COACH_STEPS = [
  'place-tag',
  'edit-price',
  'drag-tag',
  'style-button',
  'export',
] as const;

export type EditorCoachStepId = (typeof EDITOR_COACH_STEPS)[number];

export const EDITOR_COACH_STEP_COUNT = EDITOR_COACH_STEPS.length;

export type EditorCoachProgress = {
  step: number;
  total: number;
  stepId: EditorCoachStepId;
};

export function getEditorCoachProgress(stepId: EditorCoachStepId): EditorCoachProgress {
  const index = EDITOR_COACH_STEPS.indexOf(stepId);
  return {
    step: index + 1,
    total: EDITOR_COACH_STEP_COUNT,
    stepId,
  };
}

export function getNextCoachStep(stepId: EditorCoachStepId): EditorCoachStepId | null {
  const index = EDITOR_COACH_STEPS.indexOf(stepId);
  if (index < 0 || index >= EDITOR_COACH_STEPS.length - 1) {
    return null;
  }
  return EDITOR_COACH_STEPS[index + 1]!;
}

export function getPreviousCoachStep(stepId: EditorCoachStepId): EditorCoachStepId | null {
  const index = EDITOR_COACH_STEPS.indexOf(stepId);
  if (index <= 0) {
    return null;
  }
  return EDITOR_COACH_STEPS[index - 1]!;
}

/** Steps that require a real action — Next must not skip them. */
export function isCoachActionRequiredStep(stepId: EditorCoachStepId): boolean {
  return stepId === 'place-tag' || stepId === 'edit-price';
}

/** @deprecated Legacy tip ids retained for AsyncStorage parse safety. */
export const EDITOR_TIP_IDS = [
  'add-tag',
  'drag-tag',
  'style',
  'tag-popup',
  'select',
  'zoom',
  'export',
] as const;

export type EditorTipId = (typeof EDITOR_TIP_IDS)[number];

export function isEditorTipId(value: string): value is EditorTipId {
  return (EDITOR_TIP_IDS as readonly string[]).includes(value);
}
