import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

import type { PurchaseResult, UnlockStatus } from '@/types/purchase';

/** RevenueCat entitlement attached to the lifetime watermark product. */
const REMOVE_WATERMARK_ENTITLEMENT = 'remove_watermark';

/** Public RevenueCat keys are injected at build time; never put secret keys here. */
const IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? '';
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? '';

let configurePromise: Promise<boolean> | null = null;

function getPlatformApiKey(): string | null {
  if (Platform.OS === 'ios') {
    return IOS_API_KEY || null;
  }

  if (Platform.OS === 'android') {
    return ANDROID_API_KEY || null;
  }

  return null;
}

/**
 * Initialize RevenueCat once. Missing keys are an expected pre-store-config
 * state and must not crash the app or unlock export.
 */
export async function initializePurchases(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  if (configurePromise) {
    return configurePromise;
  }

  configurePromise = (async () => {
    const apiKey = getPlatformApiKey();

    if (!apiKey) {
      return false;
    }

    try {
      if (!(await Purchases.isConfigured())) {
        Purchases.configure({ apiKey });
      }

      if (__DEV__) {
        await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      return true;
    } catch {
      return false;
    }
  })();

  return configurePromise;
}

function hasRemoveWatermarkEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[REMOVE_WATERMARK_ENTITLEMENT]?.isActive === true;
}

async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!(await initializePurchases())) {
    return null;
  }

  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' && message ? message : undefined;
  }

  return undefined;
}

function isPurchaseCancelled(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const purchaseError = error as { code?: unknown; userCancelled?: unknown };
  return (
    purchaseError.userCancelled === true ||
    purchaseError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

async function getLifetimePackage(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const currentOffering = offerings.current;

  if (!currentOffering) {
    return null;
  }

  return (
    currentOffering.lifetime ??
    currentOffering.availablePackages.find(
      (availablePackage) => availablePackage.packageType === PACKAGE_TYPE.LIFETIME,
    ) ??
    null
  );
}

/**
 * Store-formatted price for the current lifetime package (e.g. "฿59", "SGD 2.99").
 * Returns null when RevenueCat/store offerings are unavailable — never invent a price.
 */
export async function getLifetimeUnlockPriceString(): Promise<string | null> {
  if (!(await initializePurchases())) {
    return null;
  }

  try {
    const lifetimePackage = await getLifetimePackage();
    const priceString = lifetimePackage?.product.priceString?.trim();
    return priceString ? priceString : null;
  } catch {
    return null;
  }
}

export async function getUnlockStatus(): Promise<UnlockStatus> {
  const customerInfo = await getCustomerInfo();
  return { isUnlocked: customerInfo ? hasRemoveWatermarkEntitlement(customerInfo) : false };
}

/**
 * Purchase the lifetime package from the current RevenueCat offering.
 * Unlock only after the returned CustomerInfo has the expected entitlement.
 */
export async function purchaseLifetimeUnlock(): Promise<PurchaseResult> {
  if ((await getUnlockStatus()).isUnlocked) {
    return { status: 'already_unlocked' };
  }

  if (!(await initializePurchases())) {
    return { status: 'not_implemented' };
  }

  try {
    const lifetimePackage = await getLifetimePackage();

    if (!lifetimePackage) {
      return { status: 'unavailable', message: 'Lifetime package is not configured.' };
    }

    const { customerInfo } = await Purchases.purchasePackage(lifetimePackage);

    if (hasRemoveWatermarkEntitlement(customerInfo)) {
      return { status: 'purchased' };
    }

    return { status: 'error', message: 'Purchase completed without an active entitlement.' };
  } catch (error) {
    if (isPurchaseCancelled(error)) {
      return { status: 'cancelled' };
    }

    return { status: 'error', message: getErrorMessage(error) };
  }
}

/** Restore a prior lifetime purchase from an explicit user action. */
export async function restorePurchases(): Promise<PurchaseResult> {
  if (!(await initializePurchases())) {
    return { status: 'not_implemented' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();

    if (hasRemoveWatermarkEntitlement(customerInfo)) {
      return { status: 'restored' };
    }

    return { status: 'not_purchased' };
  } catch (error) {
    if (isPurchaseCancelled(error)) {
      return { status: 'cancelled' };
    }

    return { status: 'error', message: getErrorMessage(error) };
  }
}
