/**
 * Local lifetime unlock purchase types.
 * Ready for future Google Play / App Store IAP — no billing yet.
 */

export type UnlockStatus = {
  isUnlocked: boolean;
};

export type PurchaseResultStatus =
  | 'purchased'
  | 'restored'
  | 'already_unlocked'
  | 'not_implemented'
  | 'unavailable'
  | 'error'
  | 'cancelled';

export type PurchaseResult = {
  status: PurchaseResultStatus;
  /** Optional detail for error / unavailable cases. */
  message?: string;
};
