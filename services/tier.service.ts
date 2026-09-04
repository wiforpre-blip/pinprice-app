import { getUnlockStatus } from '@/services/purchase.service';

/**
 * Compatibility facade for existing export/settings callers.
 * RevenueCat entitlement state is the production source of truth.
 */
export async function loadIsUnlocked(): Promise<boolean> {
  const status = await getUnlockStatus();
  return status.isUnlocked;
}
