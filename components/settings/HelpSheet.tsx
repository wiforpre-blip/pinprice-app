import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Pressable, Text, View } from 'react-native';

import { settingsStyles as styles } from '@/components/settings/settings.styles';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { PRIVACY_POLICY_URL } from '@/constants/app';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';

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

const BULLET_SLIDE_OFFSET = -14;
const BULLET_STAGGER_MS = 55;
const BULLET_DURATION_MS = 220;

type HowToBulletProps = {
  index: number;
  text: string;
  visible: boolean;
};

function HowToBullet({ index, text, visible }: HowToBulletProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(BULLET_SLIDE_OFFSET)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      translateY.setValue(BULLET_SLIDE_OFFSET);
      return;
    }

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: BULLET_DURATION_MS,
        delay: index * BULLET_STAGGER_MS,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: BULLET_DURATION_MS,
        delay: index * BULLET_STAGGER_MS,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [index, opacity, translateY, visible]);

  return (
    <Animated.View style={[styles.helpBulletRow, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.helpBulletMark}>•</Text>
      <Text style={styles.helpBulletText}>{text}</Text>
    </Animated.View>
  );
}

export function HelpSheet({ visible, onClose }: HelpSheetProps) {
  const { t } = useTranslation();
  const [isHowToOpen, setIsHowToOpen] = useState(false);
  const hasPrivacyPolicyUrl = PRIVACY_POLICY_URL.trim().length > 0;

  useEffect(() => {
    if (!visible) {
      setIsHowToOpen(false);
    }
  }, [visible]);

  const handleOpenPrivacyPolicy = () => {
    if (!hasPrivacyPolicyUrl) {
      return;
    }

    void Linking.openURL(PRIVACY_POLICY_URL);
  };

  return (
    <BottomSheetOverlay onClose={onClose} title={t('settings.help.title')} visible={visible}>
      <View style={styles.helpBody}>
        <View style={styles.helpMenuList}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isHowToOpen }}
            onPress={() => setIsHowToOpen((current) => !current)}
            style={styles.helpMenuRow}>
            <Text style={styles.helpMenuLabel}>{t('settings.help.howToTitle')}</Text>
            <MaterialIcons
              color={theme.colors.textMuted}
              name={isHowToOpen ? 'expand-less' : 'expand-more'}
              size={22}
            />
          </Pressable>

          {isHowToOpen ? (
            <View style={styles.helpHowToPanel}>
              {HOW_TO_KEYS.map((key, index) => (
                <HowToBullet index={index} key={key} text={t(key)} visible={isHowToOpen} />
              ))}
            </View>
          ) : null}

          <View style={styles.helpMenuDivider} />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !hasPrivacyPolicyUrl }}
            disabled={!hasPrivacyPolicyUrl}
            onPress={handleOpenPrivacyPolicy}
            style={styles.helpMenuRow}>
            <Text style={[styles.helpMenuLabel, !hasPrivacyPolicyUrl && styles.helpMenuLabelDisabled]}>
              {t('settings.help.privacyPolicy')}
            </Text>
            {hasPrivacyPolicyUrl ? (
              <MaterialIcons color={theme.colors.textMuted} name="open-in-new" size={18} />
            ) : (
              <Text style={styles.rowValueMuted}>{t('settings.help.privacyPolicyComingSoon')}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </BottomSheetOverlay>
  );
}
