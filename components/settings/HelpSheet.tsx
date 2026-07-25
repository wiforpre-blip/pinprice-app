import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Alert, Linking, Pressable, Text, View } from 'react-native';

import { settingsStyles as styles } from '@/components/settings/settings.styles';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { PRIVACY_POLICY_URL } from '@/constants/app';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import { resetEditorTips } from '@/services/tips.service';

type HelpSheetProps = {
  visible: boolean;
  onClose: () => void;
};

const HOW_TO_KEYS = [
  'settings.help.howTo.tapAdd',
  'settings.help.howTo.tapEdit',
  'settings.help.howTo.longPressSold',
  'settings.help.howTo.dragMove',
  'settings.help.howTo.undo',
  'settings.help.howTo.preview',
] as const;

const PRIVACY_KEYS = [
  'settings.help.privacy.localFirst',
  'settings.help.privacy.onDevice',
  'settings.help.privacy.noAccount',
  'settings.help.privacy.noCloud',
  'settings.help.privacy.noMarketplace',
  'settings.help.privacy.permissions',
] as const;

export function HelpSheet({ visible, onClose }: HelpSheetProps) {
  const { t } = useTranslation();
  const [isResettingTips, setIsResettingTips] = useState(false);
  const hasPrivacyPolicyUrl = PRIVACY_POLICY_URL.trim().length > 0;

  const handleOpenPrivacyPolicy = () => {
    if (!hasPrivacyPolicyUrl) {
      return;
    }

    void Linking.openURL(PRIVACY_POLICY_URL);
  };

  const handleResetTips = () => {
    if (isResettingTips) {
      return;
    }

    Alert.alert(t('settings.help.resetTipsTitle'), t('settings.help.resetTipsBody'), [
      { text: t('leave.cancel'), style: 'cancel' },
      {
        text: t('settings.help.resetTipsConfirm'),
        onPress: () => {
          void (async () => {
            setIsResettingTips(true);
            try {
              await resetEditorTips();
              Alert.alert(t('settings.help.resetTipsDone'));
            } finally {
              setIsResettingTips(false);
            }
          })();
        },
      },
    ]);
  };

  return (
    <BottomSheetOverlay onClose={onClose} title={t('settings.help.title')} visible={visible}>
      <View style={styles.helpBody}>
        <Text style={styles.helpSectionTitle}>{t('settings.help.howToTitle')}</Text>
        {HOW_TO_KEYS.map((key) => (
          <View key={key} style={styles.helpBulletRow}>
            <Text style={styles.helpBulletMark}>•</Text>
            <Text style={styles.helpBulletText}>{t(key)}</Text>
          </View>
        ))}

        <View style={styles.helpSectionGap} />

        <Text style={styles.helpSectionTitle}>{t('settings.help.privacyTitle')}</Text>
        {PRIVACY_KEYS.map((key) => (
          <View key={key} style={styles.helpBulletRow}>
            <Text style={styles.helpBulletMark}>•</Text>
            <Text style={styles.helpBulletText}>{t(key)}</Text>
          </View>
        ))}

        <View style={styles.helpSectionGap} />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasPrivacyPolicyUrl }}
          disabled={!hasPrivacyPolicyUrl}
          onPress={handleOpenPrivacyPolicy}
          style={styles.helpLinkRow}>
          <Text style={[styles.helpLinkLabel, !hasPrivacyPolicyUrl && styles.helpLinkLabelDisabled]}>
            {t('settings.help.privacyPolicy')}
          </Text>
          {hasPrivacyPolicyUrl ? (
            <MaterialIcons color={theme.colors.textMuted} name="open-in-new" size={18} />
          ) : (
            <Text style={styles.rowValueMuted}>{t('settings.help.privacyPolicyComingSoon')}</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isResettingTips }}
          disabled={isResettingTips}
          onPress={handleResetTips}
          style={[styles.helpActionButton, isResettingTips && styles.helpActionButtonDisabled]}>
          <Text style={styles.helpActionButtonText}>{t('settings.help.showTipsAgain')}</Text>
        </Pressable>
      </View>
    </BottomSheetOverlay>
  );
}
