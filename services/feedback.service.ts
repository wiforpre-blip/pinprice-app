import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { Linking, Platform } from 'react-native';

import type { FeedbackPayload, FeedbackType } from '@/types/settings';

export const FEEDBACK_EMAIL = 'pinprice.app@gmail.com';

const FEEDBACK_CATEGORY_LABEL: Record<FeedbackType, string> = {
  bug: 'Bug',
  suggestion: 'Suggestion',
  other: 'Other',
};

export type FeedbackSubmitResult =
  | { ok: true }
  | { ok: false; reason: 'no_mail_app' | 'unexpected' };

function getAppVersion(): string {
  return Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? 'unknown';
}

function buildFeedbackBody(message: string): string {
  return [
    message,
    '',
    '---',
    `App version: ${getAppVersion()}`,
    `Platform: ${Platform.OS}`,
    `OS version: ${String(Platform.Version)}`,
  ].join('\n');
}

function buildMailtoUrl(payload: FeedbackPayload): string {
  const category = FEEDBACK_CATEGORY_LABEL[payload.type];
  const subject = `[Feedback - ${category}]`;
  const body = buildFeedbackBody(payload.message);

  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Opens the device mail app with a prefilled feedback message.
 * Local-first: no backend. Falls back to clipboard when mailto is unavailable.
 */
export async function submitFeedback(payload: FeedbackPayload): Promise<FeedbackSubmitResult> {
  try {
    const mailtoUrl = buildMailtoUrl(payload);
    const canOpen = await Linking.canOpenURL(mailtoUrl);

    if (!canOpen) {
      return { ok: false, reason: 'no_mail_app' };
    }

    await Linking.openURL(mailtoUrl);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unexpected' };
  }
}

export async function copyFeedbackEmail(): Promise<void> {
  await Clipboard.setStringAsync(FEEDBACK_EMAIL);
}
