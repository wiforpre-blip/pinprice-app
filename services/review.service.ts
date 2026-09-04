import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Linking, Platform } from 'react-native';

import {
  EMPTY_REVIEW_PROMPT_STATE,
  markReviewRequested,
  recordSuccessfulExportJob,
  shouldRequestAutomaticReview,
  type ReviewPromptState,
} from '@/utils/reviewPrompt';

type StoreReviewModule = typeof import('expo-store-review');

/**
 * Load StoreReview only when the native module is linked.
 * A top-level import crashes app start on Android dev clients built before
 * expo-store-review was added. Rebuild the native binary to enable Rate Us.
 */
function loadStoreReview(): StoreReviewModule | null {
  try {
    if (requireOptionalNativeModule('ExpoStoreReview') == null) {
      return null;
    }

    return require('expo-store-review') as StoreReviewModule;
  } catch {
    return null;
  }
}

const REVIEW_STATE_KEY = 'pinprice.review.promptState';

/** Android package used for Play Store listing deep links. */
export const ANDROID_PLAY_STORE_PACKAGE = 'com.pinprice.mobile';

const PLAY_STORE_HTTPS_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PLAY_STORE_PACKAGE}`;
const PLAY_STORE_MARKET_URL = `market://details?id=${ANDROID_PLAY_STORE_PACKAGE}`;

/** Delay after Save success so the native prompt does not stack on the success toast. */
export const REVIEW_PROMPT_DELAY_AFTER_SAVE_MS = 2400;

/** Delay after Share sheet closes before requesting review. */
export const REVIEW_PROMPT_DELAY_AFTER_SHARE_MS = 800;

function parseReviewState(raw: string | null): ReviewPromptState {
  if (!raw) {
    return { ...EMPTY_REVIEW_PROMPT_STATE };
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object') {
      return { ...EMPTY_REVIEW_PROMPT_STATE };
    }

    const record = parsed as Record<string, unknown>;

    return {
      successfulExportCount:
        typeof record.successfulExportCount === 'number' && record.successfulExportCount >= 0
          ? Math.floor(record.successfulExportCount)
          : 0,
      lastReviewRequestAt:
        typeof record.lastReviewRequestAt === 'number' ? record.lastReviewRequestAt : null,
      reviewRequestCount:
        typeof record.reviewRequestCount === 'number' && record.reviewRequestCount >= 0
          ? Math.floor(record.reviewRequestCount)
          : 0,
      exportCountAtLastReviewRequest:
        typeof record.exportCountAtLastReviewRequest === 'number'
          ? Math.floor(record.exportCountAtLastReviewRequest)
          : null,
    };
  } catch {
    return { ...EMPTY_REVIEW_PROMPT_STATE };
  }
}

export async function loadReviewPromptState(): Promise<ReviewPromptState> {
  try {
    const stored = await AsyncStorage.getItem(REVIEW_STATE_KEY);
    return parseReviewState(stored);
  } catch {
    return { ...EMPTY_REVIEW_PROMPT_STATE };
  }
}

async function saveReviewPromptState(state: ReviewPromptState): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(state));
  } catch {
    // Review preference write failures should not block export.
  }
}

/**
 * Counts one successful export job (Save or Share). Caller must dedupe per Preview session.
 */
export async function recordSuccessfulExport(): Promise<ReviewPromptState> {
  const current = await loadReviewPromptState();
  const next = recordSuccessfulExportJob(current);
  await saveReviewPromptState(next);
  return next;
}

/**
 * Android-only: request the native in-app review prompt when eligibility rules pass.
 * Records lastReviewRequestAt / reviewRequestCount immediately after calling the API
 * (OS may suppress UI; we do not try to detect dismiss vs rate).
 */
export async function maybeRequestAutomaticReview(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const current = await loadReviewPromptState();

  if (!shouldRequestAutomaticReview(current)) {
    return false;
  }

  const StoreReview = loadStoreReview();

  if (!StoreReview) {
    return false;
  }

  try {
    const hasAction = await StoreReview.hasAction();

    if (!hasAction) {
      return false;
    }

    await StoreReview.requestReview();
  } catch {
    // Native review failures must not affect export UX.
    return false;
  }

  const next = markReviewRequested(current);
  await saveReviewPromptState(next);
  return true;
}

/**
 * Manual Settings action: open the Play Store listing (not the in-app review API).
 * Android-only for this MVP.
 */
export async function openStoreListingForRating(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const canOpenMarket = await Linking.canOpenURL(PLAY_STORE_MARKET_URL);

    if (canOpenMarket) {
      await Linking.openURL(PLAY_STORE_MARKET_URL);
      return true;
    }

    await Linking.openURL(PLAY_STORE_HTTPS_URL);
    return true;
  } catch {
    return false;
  }
}
