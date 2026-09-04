import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  EMPTY_REVIEW_PROMPT_STATE,
  REVIEW_COOLDOWN_MS,
  REVIEW_EXPORTS_BETWEEN_REQUESTS,
  REVIEW_FIRST_EXPORT_THRESHOLD,
  REVIEW_MAX_AUTOMATIC_REQUESTS,
  markReviewRequested,
  recordSuccessfulExportJob,
  shouldRequestAutomaticReview,
  type ReviewPromptState,
} from './reviewPrompt.ts';

function stateAfterExports(count: number, base: ReviewPromptState = EMPTY_REVIEW_PROMPT_STATE): ReviewPromptState {
  let next = base;
  for (let i = 0; i < count; i += 1) {
    next = recordSuccessfulExportJob(next);
  }
  return next;
}

describe('recordSuccessfulExportJob', () => {
  it('increments the counter from empty state', () => {
    const next = recordSuccessfulExportJob(EMPTY_REVIEW_PROMPT_STATE);
    assert.equal(next.successfulExportCount, 1);
  });

  it('increments once per call (caller owns Save/Share dedupe)', () => {
    const once = recordSuccessfulExportJob(EMPTY_REVIEW_PROMPT_STATE);
    const twice = recordSuccessfulExportJob(once);
    assert.equal(twice.successfulExportCount, 2);
  });
});

describe('shouldRequestAutomaticReview — threshold', () => {
  it('does not prompt after 1–2 successful exports', () => {
    assert.equal(shouldRequestAutomaticReview(stateAfterExports(1)), false);
    assert.equal(shouldRequestAutomaticReview(stateAfterExports(2)), false);
  });

  it('prompts at the first threshold when never requested', () => {
    assert.equal(
      shouldRequestAutomaticReview(stateAfterExports(REVIEW_FIRST_EXPORT_THRESHOLD)),
      true,
    );
  });

  it('still prompts above threshold before the first request', () => {
    assert.equal(shouldRequestAutomaticReview(stateAfterExports(5)), true);
  });
});

describe('shouldRequestAutomaticReview — cooldown and +N exports', () => {
  const now = 1_700_000_000_000;

  it('does not prompt again within 90 days', () => {
    let state = stateAfterExports(REVIEW_FIRST_EXPORT_THRESHOLD);
    state = markReviewRequested(state, now);
    state = stateAfterExports(REVIEW_EXPORTS_BETWEEN_REQUESTS, state);

    assert.equal(shouldRequestAutomaticReview(state, now + REVIEW_COOLDOWN_MS - 1), false);
  });

  it('does not prompt after cooldown until +3 more exports', () => {
    let state = stateAfterExports(REVIEW_FIRST_EXPORT_THRESHOLD);
    state = markReviewRequested(state, now);
    state = stateAfterExports(REVIEW_EXPORTS_BETWEEN_REQUESTS - 1, state);

    assert.equal(shouldRequestAutomaticReview(state, now + REVIEW_COOLDOWN_MS), false);
  });

  it('prompts the second time after cooldown and +3 exports', () => {
    let state = stateAfterExports(REVIEW_FIRST_EXPORT_THRESHOLD);
    state = markReviewRequested(state, now);
    state = stateAfterExports(REVIEW_EXPORTS_BETWEEN_REQUESTS, state);

    assert.equal(shouldRequestAutomaticReview(state, now + REVIEW_COOLDOWN_MS), true);
  });
});

describe('shouldRequestAutomaticReview — max requests', () => {
  it('never prompts after the automatic max', () => {
    const now = 1_700_000_000_000;
    let state = stateAfterExports(REVIEW_FIRST_EXPORT_THRESHOLD);
    state = markReviewRequested(state, now);

    state = stateAfterExports(REVIEW_EXPORTS_BETWEEN_REQUESTS, state);
    state = markReviewRequested(state, now + REVIEW_COOLDOWN_MS);

    state = stateAfterExports(REVIEW_EXPORTS_BETWEEN_REQUESTS, state);

    assert.equal(state.reviewRequestCount, REVIEW_MAX_AUTOMATIC_REQUESTS);
    assert.equal(
      shouldRequestAutomaticReview(state, now + REVIEW_COOLDOWN_MS * 2),
      false,
    );
  });
});

describe('markReviewRequested', () => {
  it('stores timestamp, bumps request count, and snapshots export count', () => {
    const now = 1_700_000_000_000;
    const before = stateAfterExports(4);
    const after = markReviewRequested(before, now);

    assert.equal(after.lastReviewRequestAt, now);
    assert.equal(after.reviewRequestCount, 1);
    assert.equal(after.exportCountAtLastReviewRequest, 4);
    assert.equal(after.successfulExportCount, 4);
  });
});

describe('preview-session dedupe contract', () => {
  it('counts Save+Share as one job when the caller records once', () => {
    // Mirrors useEditorExport: first success in a Preview session records; second skips.
    let state = EMPTY_REVIEW_PROMPT_STATE;
    let countedThisPreviewJob = false;

    const onExportSuccess = () => {
      if (countedThisPreviewJob) {
        return;
      }
      countedThisPreviewJob = true;
      state = recordSuccessfulExportJob(state);
    };

    onExportSuccess(); // Save
    onExportSuccess(); // Share same Preview

    assert.equal(state.successfulExportCount, 1);
  });

  it('counts a new job after the Preview session resets', () => {
    let state = EMPTY_REVIEW_PROMPT_STATE;
    let countedThisPreviewJob = false;

    const onExportSuccess = () => {
      if (countedThisPreviewJob) {
        return;
      }
      countedThisPreviewJob = true;
      state = recordSuccessfulExportJob(state);
    };

    onExportSuccess();
    countedThisPreviewJob = false; // openPreview / new Preview session
    onExportSuccess();

    assert.equal(state.successfulExportCount, 2);
  });
});
