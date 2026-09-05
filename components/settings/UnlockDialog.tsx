import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { settingsStyles as sharedStyles } from '@/components/settings/settings.styles';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import {
  getLifetimeUnlockPriceString,
  getUnlockStatus,
  purchaseLifetimeUnlock,
} from '@/services/purchase.service';
import type { PurchaseResult, PurchaseResultStatus } from '@/types/purchase';

export type UnlockOutcome = {
  kind: PurchaseResultStatus;
};

type UnlockDialogProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * Called when a purchase / restore / already_unlocked result is confirmed.
   * Caller is responsible for calling onUnlockChange(true) and showing a snackbar.
   */
  onSuccess: (outcome: UnlockOutcome) => void;
};

type BusyAction = 'purchase' | null;

/** Error to show inline — never exposes raw SDK strings */
function getInlineError(result: PurchaseResult, t: (key: string) => string): string | null {
  switch (result.status) {
    case 'purchased':
    case 'restored':
    case 'already_unlocked':
    case 'cancelled':
      return null;
    case 'not_purchased':
      return t('unlock.notPurchased');
    case 'not_implemented':
      return t('unlock.notImplemented');
    case 'unavailable':
      return t('unlock.unavailable');
    case 'error':
    default:
      return t('unlock.error');
  }
}

export function UnlockDialog({ visible, onClose, onSuccess }: UnlockDialogProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Round-trip guard: each time the dialog opens we increment a generation counter.
  // Async callbacks from previous open cycles are ignored.
  const generationRef = useRef(0);

  const [isPriceLoading, setIsPriceLoading] = useState(true);
  const [priceString, setPriceString] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);

  // Reset state and reload price each time the dialog becomes visible
  // Stable ref for onSuccess so the open-cycle effect can reference it without
  // triggering a re-run every time the parent re-renders.
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (!visible) {
      // Reset fully so next open starts fresh
      setBusyAction(null);
      setInlineError(null);
      return;
    }

    const gen = ++generationRef.current;
    setBusyAction(null);
    setInlineError(null);
    setIsPriceLoading(true);
    setPriceString(null);

    void (async () => {
      const [status, storePrice] = await Promise.all([
        getUnlockStatus(),
        getLifetimeUnlockPriceString(),
      ]);

      if (generationRef.current !== gen) {
        return;
      }

      // If already unlocked when opening, fire success immediately and let caller close
      if (status.isUnlocked) {
        onSuccessRef.current({ kind: 'already_unlocked' });
        return;
      }

      setPriceString(storePrice);
      setIsPriceLoading(false);
    })();
  }, [visible]);

  const loadPrice = () => {
    if (busyAction !== null || !visible) {
      return;
    }
    const gen = ++generationRef.current;
    setIsPriceLoading(true);
    setPriceString(null);
    setInlineError(null);

    void (async () => {
      const storePrice = await getLifetimeUnlockPriceString();
      if (generationRef.current !== gen) {
        return;
      }
      setPriceString(storePrice);
      setIsPriceLoading(false);
    })();
  };

  const handlePurchase = async () => {
    if (busyAction !== null || priceString === null) {
      return;
    }

    // In-flight guard — lock immediately before any await to prevent double-tap
    setBusyAction('purchase');
    setInlineError(null);

    try {
      const result = await purchaseLifetimeUnlock();

      if (result.status === 'cancelled') {
        // Silently return to idle — no sticky message
        return;
      }

      const error = getInlineError(result, t);
      if (error) {
        setInlineError(error);
        return;
      }

      // Success paths: purchased / already_unlocked
      onSuccess({ kind: result.status });
    } catch {
      setInlineError(t('unlock.error'));
    } finally {
      setBusyAction(null);
    }
  };


  const handleClose = () => {
    if (busyAction !== null) {
      // Block close while purchase is in flight
      return;
    }
    onClose();
  };

  const isBusy = busyAction !== null;
  const canPurchase = !isBusy && priceString !== null && !isPriceLoading;

  const paddingBottom = Math.max(insets.bottom, theme.spacing.xl);

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={[localStyles.backdrop, { paddingBottom }]}>
        <View style={localStyles.card}>
          {/* Header */}
          <View style={sharedStyles.dialogHeader}>
            <Text numberOfLines={2} style={sharedStyles.dialogTitle}>
              {t('unlock.title')}
            </Text>
            <Pressable
              accessibilityLabel={t('tag.cancel')}
              accessibilityRole="button"
              accessibilityState={{ disabled: isBusy }}
              disabled={isBusy}
              onPress={handleClose}
              style={sharedStyles.dialogCloseButton}>
              <MaterialIcons
                color={isBusy ? theme.colors.textMuted : theme.colors.textSecondary}
                name="close"
                size={22}
              />
            </Pressable>
          </View>

          {/* Scrollable body */}
          <ScrollView
            bounces={false}
            contentContainerStyle={sharedStyles.dialogScrollContent}
            showsVerticalScrollIndicator={false}>
            <Text style={sharedStyles.unlockBenefit}>{t('unlock.benefit')}</Text>

            {/* Price area */}
            {isPriceLoading ? (
              <ActivityIndicator color={theme.colors.textSecondary} />
            ) : priceString !== null ? (
              <Text style={sharedStyles.unlockPrice}>{priceString}</Text>
            ) : (
              <View style={localStyles.priceUnavailableRow}>
                <Text style={sharedStyles.unlockPriceUnavailable}>
                  {t('unlock.priceUnavailable')}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isBusy }}
                  disabled={isBusy}
                  onPress={loadPrice}
                  style={localStyles.retryButton}>
                  <Text style={localStyles.retryButtonText}>{t('unlock.retryPrice')}</Text>
                </Pressable>
              </View>
            )}

            {/* Inline error */}
            {inlineError ? (
              <Text style={sharedStyles.unlockStatusError}>{inlineError}</Text>
            ) : null}
          </ScrollView>

          {/* Actions */}
          <View style={sharedStyles.dialogActions}>
            {/* Primary: Purchase */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canPurchase }}
              disabled={!canPurchase}
              onPress={() => {
                void handlePurchase();
              }}
              style={[
                sharedStyles.unlockPrimaryButton,
                !canPurchase && sharedStyles.unlockButtonDisabled,
              ]}>
              {busyAction === 'purchase' ? (
                <ActivityIndicator color={theme.buttons.primary.color} />
              ) : (
                <Text style={sharedStyles.unlockPrimaryButtonText}>
                  {t('unlock.cta')}
                  {priceString ? `  ${priceString}` : ''}
                </Text>
              )}
            </Pressable>

          </View>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  priceUnavailableRow: {
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  retryButton: {
    minHeight: 44,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  retryButtonText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
});
