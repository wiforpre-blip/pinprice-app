import AsyncStorage from '@react-native-async-storage/async-storage';

import { isEditorTipId, type EditorTipId } from '@/types/tips';

const DISMISSED_TIPS_KEY = 'pinprice.editor.dismissedTips';
const COACH_COMPLETED_KEY = 'pinprice.editor.styleCoachCompleted';

function parseDismissedTips(raw: string | null): EditorTipId[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is EditorTipId => typeof value === 'string' && isEditorTipId(value));
  } catch {
    return [];
  }
}

export async function loadDismissedTips(): Promise<EditorTipId[]> {
  try {
    const stored = await AsyncStorage.getItem(DISMISSED_TIPS_KEY);
    return parseDismissedTips(stored);
  } catch {
    return [];
  }
}

export async function dismissEditorTip(tipId: EditorTipId): Promise<void> {
  try {
    const current = await loadDismissedTips();

    if (current.includes(tipId)) {
      return;
    }

    await AsyncStorage.setItem(DISMISSED_TIPS_KEY, JSON.stringify([...current, tipId]));
  } catch {
    // Tip preference write failures should not block UI.
  }
}

export async function loadCoachCompleted(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(COACH_COMPLETED_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

export async function markCoachCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(COACH_COMPLETED_KEY, 'true');
  } catch {
    // Coach preference write failures should not block UI.
  }
}
