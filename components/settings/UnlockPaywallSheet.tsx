import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { settingsStyles as styles } from '@/components/settings/settings.styles';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  getLifetimeUnlockPriceString,
  getUnlockStatus,
  purchaseLifetimeUnlock,
  restorePurchases,
} from '@/services/purchase.service';
import type { PurchaseResult } from '@/types/purchase';

type UnlockPaywallSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful unlock so Settings can refresh its row. */
  onUnlockChange?: (isUnlocked: boolean) => void;
};

type BusyAction = 'purchase' | 'restore' | null;

function messageForResult(
  result: PurchaseResult,
  t: (key: string) => string,
  kind: 'purchase' | 'restore',
): { text: string; isError: boolean } {
  switch (result.status) {
    case 'purchased':
    case 'restored':
      return { text: t('unlock.success'), isError: false };
    case 'already_unlocked':
      return { text: t('unlock.alreadyUnlocked'), isError: false };
    case 'not_purchased':
      return { text: t('unlock.notPurchased'), isError: true };
    case 'not_implemented':
      return {
        text: kind === 'restore' ? t('unlock.restoreNotImplemented') : t('unlock.notImplemented'),
        isError: true,
      };
    case 'unavailable':
      return { text: t('unlock.unavailable'), isError: true };
    case 'cancelled':
      return { text: t('unlock.cancelled'), isError: false };
    case 'error':
    default:
      return { text: result.message ?? t('unlock.error'), isError: true };
  }
}

export function UnlockPaywallSheet({ visible, onClose, onUnlockChange }: UnlockPaywallSheetProps) {
  const { t } = useTranslation();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [priceString, setPriceString] = useState<string | null>(null);
  const [isPriceLoading, setIsPriceLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let isMounted = true;

    setBusyAction(null);
    setStatusMessage(null);
    setIsError(false);
    setIsStatusLoading(true);
    setPriceString(null);
    setIsPriceLoading(true);

    void (async () => {
      const [status, storePrice] = await Promise.all([
        getUnlockStatus(),
        getLifetimeUnlockPriceString(),
      ]);

      if (!isMounted) {
        return;
      }

      setIsUnlocked(status.isUnlocked);
      setPriceString(status.isUnlocked ? null : storePrice);
      setIsPriceLoading(false);
      setIsStatusLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const applyUnlockResult = (result: PurchaseResult, kind: 'purchase' | 'restore') => {
    const didUnlock =
      result.status === 'purchased' || result.status === 'restored' || result.status === 'already_unlocked';

    if (didUnlock) {
      setIsUnlocked(true);
      onUnlockChange?.(true);
    }

    const message = messageForResult(result, t, kind);

    if (message.text) {
      setStatusMessage(message.text);
      setIsError(message.isError);
    }
  };

  const handlePurchase = async () => {
    if (busyAction !== null || isUnlocked) {
      return;
    }

    setBusyAction('purchase');
    setStatusMessage(null);
    setIsError(false);

    try {
      const result = await purchaseLifetimeUnlock();
      applyUnlockResult(result, 'purchase');
    } catch {
      setStatusMessage(t('unlock.error'));
      setIsError(true);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRestore = async () => {
    if (busyAction !== null) {
      return;
    }

    setBusyAction('restore');
    setStatusMessage(null);
    setIsError(false);

    try {
      const result = await restorePurchases();
      applyUnlockResult(result, 'restore');
    } catch {
      setStatusMessage(t('unlock.error'));
      setIsError(true);
    } finally {
      setBusyAction(null);
    }
  };

  const isBusy = busyAction !== null;

  return (
    <BottomSheetOverlay
      footer={
        isUnlocked || isStatusLoading ? null : (
          <View style={styles.unlockFooter}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isBusy }}
              disabled={isBusy}
              onPress={() => {
                void handlePurchase();
              }}
              style={[styles.unlockPrimaryButton, isBusy && styles.unlockButtonDisabled]}>
              {busyAction === 'purchase' ? (
                <ActivityIndicator color={theme.buttons.primary.color} />
              ) : (
                <Text style={styles.unlockPrimaryButtonText}>{t('unlock.cta')}</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isBusy }}
              disabled={isBusy}
              onPress={() => {
                void handleRestore();
              }}
              style={[styles.unlockSecondaryButton, isBusy && styles.unlockButtonDisabled]}>
              {busyAction === 'restore' ? (
                <ActivityIndicator color={theme.colors.textPrimary} />
              ) : (
                <Text style={styles.unlockSecondaryButtonText}>{t('unlock.restore')}</Text>
              )}
            </Pressable>

            {statusMessage ? (
              <Text style={[styles.unlockStatus, isError && styles.unlockStatusError]}>{statusMessage}</Text>
            ) : null}
          </View>
        )
      }
      onClose={onClose}
      title={t('unlock.title')}
      visible={visible}>
      <View style={styles.unlockBody}>
        {isStatusLoading ? (
          <ActivityIndicator color={theme.colors.textSecondary} />
        ) : isUnlocked ? (
          <>
            <Text style={styles.unlockBenefit}>{t('unlock.unlockedBody')}</Text>
            <View style={styles.unlockBadge}>
              <Text style={styles.unlockBadgeText}>{t('settings.unlocked')}</Text>
            </View>
            {statusMessage ? (
              <Text style={[styles.unlockStatus, isError && styles.unlockStatusError]}>{statusMessage}</Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.unlockBenefit}>{t('unlock.benefit')}</Text>
            {isPriceLoading ? (
              <ActivityIndicator color={theme.colors.textSecondary} />
            ) : (
              priceString ? <Text style={styles.unlockPrice}>{priceString}</Text> : null
            )}
          </>
        )}
      </View>
    </BottomSheetOverlay>
  );
}
