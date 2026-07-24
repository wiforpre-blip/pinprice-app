import { loadIsUnlocked, saveIsUnlocked } from '@/services/tier.service';
import type { PurchaseResult, UnlockStatus } from '@/types/purchase';

/**
 * Purchase / restore facade for lifetime watermark unlock.
 * Wraps local tier storage for now. Swap internals for real IAP later —
 * do not add billing libraries until that task is approved.
 */

/**
 * Current unlock flag from local storage (source of truth for export gating).
 */
export async function getUnlockStatus(): Promise<UnlockStatus> {
  const isUnlocked = await loadIsUnlocked();
  return { isUnlocked };
}

/**
 * Attempt a lifetime unlock purchase.
 * Placeholder: returns not_implemented until store billing is wired.
 */
export async function purchaseLifetimeUnlock(): Promise<PurchaseResult> {
  try {
    const isUnlocked = await loadIsUnlocked();

    if (isUnlocked) {
      return { status: 'already_unlocked' };
    }

    // Future: Google Play Billing / App Store IAP purchase flow here.
    return { status: 'not_implemented' };
  } catch {
    return { status: 'error' };
  }
}

/**
 * Restore prior lifetime unlock purchases from the store.
 * Placeholder: returns not_implemented until store billing is wired.
 */
export async function restorePurchases(): Promise<PurchaseResult> {
  try {
    const isUnlocked = await loadIsUnlocked();

    if (isUnlocked) {
      return { status: 'already_unlocked' };
    }

    // Future: query Play / App Store for owned lifetime unlock product.
    return { status: 'not_implemented' };
  } catch {
    return { status: 'error' };
  }
}

/**
 * Dev/test-only unlock. Sets the same local flag export uses.
 * No-op outside __DEV__ so production builds cannot unlock via this path.
 */
export async function devMockUnlock(): Promise<PurchaseResult> {
  if (!__DEV__) {
    return { status: 'unavailable' };
  }

  try {
    const isUnlocked = await loadIsUnlocked();

    if (isUnlocked) {
      return { status: 'already_unlocked' };
    }

    await saveIsUnlocked(true);
    return { status: 'purchased' };
  } catch {
    return { status: 'error' };
  }
}
