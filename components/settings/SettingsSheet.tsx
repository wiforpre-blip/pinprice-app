import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { CurrencySelectorSheet } from '@/components/settings/CurrencySelectorSheet';
import { FeedbackSheet } from '@/components/settings/FeedbackSheet';
import { HelpSheet } from '@/components/settings/HelpSheet';
import type { HelpRestoreOutcome } from '@/components/settings/HelpSheet';
import { UnlockDialog } from '@/components/settings/UnlockDialog';
import type { UnlockOutcome } from '@/components/settings/UnlockDialog';
import { settingsStyles as styles } from '@/components/settings/settings.styles';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { ConfirmOverlay } from '@/components/ui/ConfirmOverlay';
import { getAppVersionLabel } from '@/constants/app';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation, type Language } from '@/contexts/LanguageContext';
import { openStoreListingForRating } from '@/services/review.service';
import { loadIsUnlocked } from '@/services/tier.service';
import { resetEditorTips } from '@/services/tips.service';

type SettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Called after tips/coach storage is cleared so an open editor can restart the tutorial. */
  onEditorTipsReset?: () => void;
  /** Called when lifetime unlock changes so an open preview can refresh watermark gating. */
  onUnlockChange?: (isUnlocked: boolean) => void;
};

const LANGUAGE_OPTIONS: Language[] = ['th', 'en'];
const APP_VERSION_LABEL = getAppVersionLabel();

/** Duration (ms) the success pill is shown before auto-dismissing */
const PILL_DURATION_MS = 4000;

export function SettingsSheet({ visible, onClose, onEditorTipsReset, onUnlockChange }: SettingsSheetProps) {
  const { currency } = useCurrency();
  const { language, setLanguage, t } = useTranslation();
  const [isCurrencySelectorOpen, setIsCurrencySelectorOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isResetTipsModalVisible, setIsResetTipsModalVisible] = useState(false);
  const [isUnlockDialogOpen, setIsUnlockDialogOpen] = useState(false);
  /** Free-tier default. Mirrors the RevenueCat-backed export entitlement. */
  const [isUnlocked, setIsUnlocked] = useState(false);

  /**
   * Dark pill message shown inside Settings after unlock/restore.
   * Displayed only once, auto-dismissed after PILL_DURATION_MS.
   */
  const [pillMessage, setPillMessage] = useState<string | null>(null);
  const pillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dismiss pill and clear its timer
  const clearPill = () => {
    if (pillTimerRef.current !== null) {
      clearTimeout(pillTimerRef.current);
      pillTimerRef.current = null;
    }
    setPillMessage(null);
  };

  // Show a pill message for PILL_DURATION_MS then auto-dismiss
  const showPill = (message: string) => {
    clearPill();
    setPillMessage(message);
    pillTimerRef.current = setTimeout(() => {
      setPillMessage(null);
      pillTimerRef.current = null;
    }, PILL_DURATION_MS);
  };

  useEffect(() => {
    if (!visible) {
      setIsResetTipsModalVisible(false);
      setIsUnlockDialogOpen(false);
      clearPill();
      return;
    }

    let isMounted = true;

    void loadIsUnlocked().then((unlocked) => {
      if (isMounted) {
        setIsUnlocked(unlocked);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Cleanup pill timer on unmount
  useEffect(() => {
    return () => {
      if (pillTimerRef.current !== null) {
        clearTimeout(pillTimerRef.current);
      }
    };
  }, []);

  /**
   * Called by UnlockDialog when purchase / restore / already_unlocked succeeds.
   * Dialog has already closed itself via the caller closing it; we update state
   * and show the pill after the dialog dismisses.
   */
  const handleUnlockSuccess = (outcome: UnlockOutcome) => {
    setIsUnlockDialogOpen(false);
    setIsUnlocked(true);
    onUnlockChange?.(true);

    if (outcome.kind === 'purchased') {
      showPill(t('unlock.success'));
    } else if (outcome.kind === 'restored') {
      showPill(t('unlock.restoreSuccess'));
    }
    // already_unlocked: update state silently, no pill
  };

  /**
   * Called by HelpSheet when restore succeeds.
   * HelpSheet closes itself; we update state and show pill in Settings.
   */
  const handleHelpRestoreSuccess = (outcome: HelpRestoreOutcome) => {
    setIsUnlocked(true);
    onUnlockChange?.(true);

    if (outcome.kind === 'restored') {
      showPill(t('unlock.restoreSuccess'));
    }
    // already_unlocked via Help: silent state update
  };

  const handleClose = () => {
    setIsCurrencySelectorOpen(false);
    setIsHelpOpen(false);
    setIsFeedbackOpen(false);
    setIsResetTipsModalVisible(false);
    setIsUnlockDialogOpen(false);
    clearPill();
    onClose();
  };

  const handleConfirmResetTips = () => {
    setIsResetTipsModalVisible(false);
    void resetEditorTips().then(() => {
      onEditorTipsReset?.();
      setIsCurrencySelectorOpen(false);
      setIsHelpOpen(false);
      setIsFeedbackOpen(false);
      setIsUnlockDialogOpen(false);
      clearPill();
      onClose();
    });
  };

  return (
    <>
      <BottomSheetOverlay onClose={handleClose} title={t('settings.title')} visible={visible}>
        <View style={styles.list}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.language')}</Text>
            <View style={styles.languageToggle}>
              {LANGUAGE_OPTIONS.map((languageOption) => {
                const isActive = languageOption === language;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={isActive ? { selected: true } : undefined}
                    key={languageOption}
                    onPress={() => setLanguage(languageOption)}
                    style={[styles.languageToggleButton, isActive && styles.activeLanguageToggleButton]}>
                    <Text style={[styles.languageToggleText, isActive && styles.activeLanguageToggleText]}>
                      {languageOption === 'th' ? t('language.thai') : t('language.english')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsCurrencySelectorOpen(true)}
            style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.currency')}</Text>
            <View style={styles.rowTrailing}>
              <Text style={styles.rowValue}>{currency}</Text>
              <MaterialIcons color={theme.colors.textMuted} name="chevron-right" size={22} />
            </View>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsHelpOpen(true)}
            style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.help.title')}</Text>
            <View style={styles.rowTrailing}>
              <MaterialIcons color={theme.colors.textMuted} name="chevron-right" size={22} />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsFeedbackOpen(true)}
            style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.contact')}</Text>
          </Pressable>

          {Platform.OS === 'android' ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void openStoreListingForRating();
              }}
              style={styles.row}>
              <Text style={styles.rowLabel}>{t('settings.rateUs')}</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsResetTipsModalVisible(true)}
            style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.showTipsAgain')}</Text>
          </Pressable>

          {isUnlocked ? (
            /* Unlocked row: status only, not tappable */
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('settings.removeWatermark')}</Text>
              <Text style={styles.rowValueUnlocked}>{t('settings.unlocked')}</Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsUnlockDialogOpen(true)}
              style={styles.row}>
              <Text style={styles.rowLabel}>{t('settings.removeWatermark')}</Text>
              <View style={styles.rowTrailing}>
                <MaterialIcons color={theme.colors.textMuted} name="chevron-right" size={22} />
              </View>
            </Pressable>
          )}

          <View style={styles.divider} />

          {/* Dark pill snackbar — shown inside Settings after unlock/restore */}
          {pillMessage ? (
            <View
              accessibilityLiveRegion="polite"
              style={styles.settingsPill}>
              <Text style={styles.settingsPillText}>{pillMessage}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={[styles.rowLabel, styles.rowLabelDisabled]}>{t('settings.version')}</Text>
            <Text style={styles.rowValueMuted}>{APP_VERSION_LABEL}</Text>
          </View>
        </View>
      </BottomSheetOverlay>

      <CurrencySelectorSheet
        onClose={() => setIsCurrencySelectorOpen(false)}
        visible={visible && isCurrencySelectorOpen}
      />

      <HelpSheet
        onClose={() => setIsHelpOpen(false)}
        onRestoreSuccess={handleHelpRestoreSuccess}
        visible={visible && isHelpOpen}
      />

      <FeedbackSheet onClose={() => setIsFeedbackOpen(false)} visible={visible && isFeedbackOpen} />

      {/* UnlockDialog: shown one at a time, no backdrop stack */}
      <UnlockDialog
        onClose={() => setIsUnlockDialogOpen(false)}
        onSuccess={handleUnlockSuccess}
        visible={visible && isUnlockDialogOpen}
      />

      <ConfirmOverlay
        body={t('settings.resetTipsBody')}
        cancelLabel={t('tag.cancel')}
        confirmLabel={t('settings.resetTipsConfirm')}
        onCancel={() => setIsResetTipsModalVisible(false)}
        onConfirm={handleConfirmResetTips}
        title={t('settings.resetTipsTitle')}
        visible={visible && isResetTipsModalVisible}
      />
    </>
  );
}
