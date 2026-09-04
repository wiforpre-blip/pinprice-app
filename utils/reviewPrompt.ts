/** Minimum successful export jobs before the first automatic review prompt. */
export const REVIEW_FIRST_EXPORT_THRESHOLD = 3;

/** Extra successful export jobs required between automatic prompts. */
export const REVIEW_EXPORTS_BETWEEN_REQUESTS = 3;

/** Maximum automatic native review prompts. */
export const REVIEW_MAX_AUTOMATIC_REQUESTS = 2;

/** Cooldown after a review request before another automatic prompt is allowed. */
export const REVIEW_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

export type ReviewPromptState = {
  successfulExportCount: number;
  lastReviewRequestAt: number | null;
  reviewRequestCount: number;
  /** Export count when the last automatic prompt was recorded (for +N exports rule). */
  exportCountAtLastReviewRequest: number | null;
};

export const EMPTY_REVIEW_PROMPT_STATE: ReviewPromptState = {
  successfulExportCount: 0,
  lastReviewRequestAt: null,
  reviewRequestCount: 0,
  exportCountAtLastReviewRequest: null,
};

/**
 * Increments the successful-export job counter.
 * Call once per Preview session job (Save+Share from the same Preview count as one).
 */
export function recordSuccessfulExportJob(state: ReviewPromptState): ReviewPromptState {
  return {
    ...state,
    successfulExportCount: state.successfulExportCount + 1,
  };
}

/**
 * Whether an automatic native review prompt is allowed right now.
 * Does not inspect OS UI or whether the user actually rated.
 */
export function shouldRequestAutomaticReview(
  state: ReviewPromptState,
  nowMs: number = Date.now(),
): boolean {
  if (state.reviewRequestCount >= REVIEW_MAX_AUTOMATIC_REQUESTS) {
    return false;
  }

  if (state.successfulExportCount < REVIEW_FIRST_EXPORT_THRESHOLD) {
    return false;
  }

  if (state.reviewRequestCount === 0) {
    return true;
  }

  if (state.lastReviewRequestAt == null) {
    return false;
  }

  if (nowMs - state.lastReviewRequestAt < REVIEW_COOLDOWN_MS) {
    return false;
  }

  const baseline =
    state.exportCountAtLastReviewRequest ?? REVIEW_FIRST_EXPORT_THRESHOLD;

  return state.successfulExportCount >= baseline + REVIEW_EXPORTS_BETWEEN_REQUESTS;
}

/**
 * Records that a native review prompt was requested (or attempted).
 * Always bump count + timestamp even if the OS suppresses the UI.
 */
export function markReviewRequested(
  state: ReviewPromptState,
  nowMs: number = Date.now(),
): ReviewPromptState {
  return {
    ...state,
    lastReviewRequestAt: nowMs,
    reviewRequestCount: state.reviewRequestCount + 1,
    exportCountAtLastReviewRequest: state.successfulExportCount,
  };
}
