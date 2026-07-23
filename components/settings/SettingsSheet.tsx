import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CurrencySelectorSheet } from '@/components/settings/CurrencySelectorSheet';
import { FeedbackSheet } from '@/components/settings/FeedbackSheet';
import { settingsStyles as styles } from '@/components/settings/settings.styles';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { APP_VERSION } from '@/constants/app';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation, type Language } from '@/contexts/LanguageContext';

type SettingsSheetProps = {
  visible: boolean;
  onClose: () => void;
};

const LANGUAGE_OPTIONS: Language[] = ['th', 'en'];

export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
  const { currency } = useCurrency();
  const { language, setLanguage, t } = useTranslation();
  const [isCurrencySelectorOpen, setIsCurrencySelectorOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const handleClose = () => {
    setIsCurrencySelectorOpen(false);
    setIsFeedbackOpen(false);
    onClose();
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

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.help')}</Text>
            <Text style={styles.rowValueMuted}>{t('settings.comingSoon')}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setIsFeedbackOpen(true)}
            style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.contact')}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            style={styles.row}>
            <Text style={[styles.rowLabel, styles.rowLabelDisabled]}>{t('settings.removeAds')}</Text>
            <Text style={styles.rowValueMuted}>{t('settings.comingSoon')}</Text>
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={[styles.rowLabel, styles.rowLabelDisabled]}>{t('settings.version')}</Text>
            <Text style={styles.rowValueMuted}>{APP_VERSION}</Text>
          </View>
        </View>
      </BottomSheetOverlay>

      <CurrencySelectorSheet
        onClose={() => setIsCurrencySelectorOpen(false)}
        visible={visible && isCurrencySelectorOpen}
      />

      <FeedbackSheet onClose={() => setIsFeedbackOpen(false)} visible={visible && isFeedbackOpen} />
    </>
  );
}
