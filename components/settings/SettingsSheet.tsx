import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';

import { CurrencySelectorSheet } from '@/components/settings/CurrencySelectorSheet';
import { FeedbackSheet } from '@/components/settings/FeedbackSheet';
import { HelpSheet } from '@/components/settings/HelpSheet';
import { settingsStyles as styles } from '@/components/settings/settings.styles';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { ConfirmOverlay } from '@/components/ui/ConfirmOverlay';
import { getAppVersionLabel } from '@/constants/app';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation, type Language } from '@/contexts/LanguageContext';
import { loadIsUnlocked, saveIsUnlocked } from '@/services/tier.service';
import { resetEditorTips } from '@/services/tips.service';
import { shouldRenderWatermark } from '@/utils/watermark';

type SettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Called after tips/coach storage is cleared so an open editor can restart the tutorial. */
  onEditorTipsReset?: () => void;
};

const LANGUAGE_OPTIONS: Language[] = ['th', 'en'];
const APP_VERSION_LABEL = getAppVersionLabel();

export function SettingsSheet({ visible, onClose, onEditorTipsReset }: SettingsSheetProps) {
  const { currency } = useCurrency();
  const { language, setLanguage, t } = useTranslation();
  const [isCurrencySelectorOpen, setIsCurrencySelectorOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isResetTipsModalVisible, setIsResetTipsModalVisible] = useState(false);
  /** Free-tier default: watermark on. Mirrors export gating via local unlock flag. */
  const [showWatermark, setShowWatermark] = useState(true);

  useEffect(() => {
    if (!visible) {
      setIsResetTipsModalVisible(false);
      return;
    }

    let isMounted = true;

    void loadIsUnlocked().then((isUnlocked) => {
      if (isMounted) {
        setShowWatermark(shouldRenderWatermark(isUnlocked));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const handleWatermarkToggle = (enabled: boolean) => {
    setShowWatermark(enabled);
    // Unlocked = no watermark on export (same flag preview/export already check).
    void saveIsUnlocked(!enabled);
  };

  const handleClose = () => {
    setIsCurrencySelectorOpen(false);
    setIsHelpOpen(false);
    setIsFeedbackOpen(false);
    setIsResetTipsModalVisible(false);
    onClose();
  };

  const handleConfirmResetTips = () => {
    setIsResetTipsModalVisible(false);
    void resetEditorTips().then(() => {
      onEditorTipsReset?.();
      setIsCurrencySelectorOpen(false);
      setIsHelpOpen(false);
      setIsFeedbackOpen(false);
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

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsResetTipsModalVisible(true)}
            style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.showTipsAgain')}</Text>
          </Pressable>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.exportWatermark')}</Text>
            <Switch
              accessibilityLabel={t('settings.exportWatermark')}
              accessibilityRole="switch"
              onValueChange={handleWatermarkToggle}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
              value={showWatermark}
            />
          </View>

          <View style={styles.divider} />

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

      <HelpSheet onClose={() => setIsHelpOpen(false)} visible={visible && isHelpOpen} />

      <FeedbackSheet onClose={() => setIsFeedbackOpen(false)} visible={visible && isFeedbackOpen} />

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
