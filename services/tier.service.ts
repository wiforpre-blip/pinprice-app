import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local unlock / Pro flag for export watermark gating.
 * No payment, subscription, or backend — storage only for future monetization.
 */
const UNLOCKED_KEY = 'pinprice.tier.unlocked';

/**
 * Returns whether the user has unlocked Pro locally.
 * Defaults to free tier (false) when unset or on read failure.
 */
export async function loadIsUnlocked(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(UNLOCKED_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
}

/**
 * Persists the local unlock flag. Ready for a future purchase / unlock flow.
 */
export async function saveIsUnlocked(isUnlocked: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(UNLOCKED_KEY, isUnlocked ? 'true' : 'false');
  } catch {
    // Unlock write failures should not block export UI.
  }
}
