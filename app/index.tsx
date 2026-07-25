import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecentDraftsSection } from '@/components/home/RecentDraftsSection';
import { SettingsSheet } from '@/components/settings/SettingsSheet';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import { useRecentDrafts } from '@/hooks/useRecentDrafts';
import { isDraftImageAvailable, removeEditorDraft } from '@/services/draft.service';
import type { EditorDraft } from '@/types/draft';
import { formatDraftDisplayTitle, formatDraftUpdatedAt } from '@/utils/draftDisplay';

const ONBOARDING_HERO = require('../assets/images/onboarding-hero.png');

export default function HomeScreen() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const { drafts, refreshDrafts } = useRecentDrafts();
  const [isOpeningPicker, setIsOpeningPicker] = useState(false);
  const [isOpeningDraft, setIsOpeningDraft] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const openEditor = (imageUri: string, options?: { draftId?: string; filename?: string | null }) => {
    const trimmedFilename = options?.filename?.trim();
    const params: { imageUri: string; draftId?: string; filename?: string } = {
      imageUri: encodeURIComponent(imageUri),
    };

    if (options?.draftId) {
      params.draftId = options.draftId;
    }

    if (trimmedFilename) {
      params.filename = encodeURIComponent(trimmedFilename);
    }

    router.push({
      pathname: '/editor',
      params,
    });
  };

  const handleImageResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const selectedUri = asset?.uri;
    if (selectedUri) {
      openEditor(selectedUri, { filename: asset.fileName });
    }
  };

  const openDraft = async (draft: EditorDraft) => {
    if (isOpeningDraft || isOpeningPicker) {
      return;
    }

    setIsOpeningDraft(true);
    setMessage(null);

    try {
      const available = await isDraftImageAvailable(draft.imageUri);

      if (!available) {
        Alert.alert(t('home.draftUnavailableTitle'), t('home.draftUnavailableBody'), [
          {
            text: t('common.ok'),
            onPress: () => {
              void removeEditorDraft(draft.id).then(() => refreshDrafts());
            },
          },
        ]);
        return;
      }

      openEditor(draft.imageUri, { draftId: draft.id, filename: draft.filename });
    } finally {
      setIsOpeningDraft(false);
    }
  };

  const choosePhoto = async () => {
    if (isOpeningPicker || isOpeningDraft) {
      return;
    }

    setIsOpeningPicker(true);
    setMessage(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage(t('home.photoPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
      });

      handleImageResult(result);
    } catch {
      setMessage(t('home.photoPickerError'));
    } finally {
      setIsOpeningPicker(false);
    }
  };

  const takePhoto = async () => {
    if (isOpeningPicker || isOpeningDraft) {
      return;
    }

    setIsOpeningPicker(true);
    setMessage(null);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setMessage(t('home.cameraPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      handleImageResult(result);
    } catch {
      setMessage(t('home.cameraError'));
    } finally {
      setIsOpeningPicker(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.headerSideSlot} />

        <View style={styles.headerTitleArea}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {t('common.appName')}
          </Text>
        </View>

        <Pressable
          accessibilityLabel={t('home.settings')}
          accessibilityRole="button"
          onPress={() => setIsSettingsOpen(true)}
          style={[styles.headerIconButton, styles.headerRightButton]}>
          <MaterialIcons color={theme.colors.textPrimary} name="settings" size={22} />
        </Pressable>
      </View>

      <SettingsSheet onClose={() => setIsSettingsOpen(false)} visible={isSettingsOpen} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <Text style={[styles.headline, language === 'th' && styles.headlineThai]}>
              {t('home.headline')}
            </Text>
            <Text style={[styles.subtitle, language === 'th' && styles.subtitleThai]}>
              {t('home.subtitle')}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isOpeningPicker || isOpeningDraft}
              onPress={choosePhoto}
              style={[
                styles.button,
                styles.primaryButton,
                (isOpeningPicker || isOpeningDraft) && styles.disabledButton,
              ]}>
              <Text style={[styles.buttonText, styles.primaryButtonText]}>{t('home.choosePhoto')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isOpeningPicker || isOpeningDraft}
              onPress={takePhoto}
              style={[
                styles.button,
                styles.secondaryButton,
                (isOpeningPicker || isOpeningDraft) && styles.disabledButton,
              ]}>
              <Text style={[styles.buttonText, styles.secondaryButtonText]}>{t('home.takePhoto')}</Text>
            </Pressable>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>

          <View style={styles.heroImageCard} pointerEvents="none">
            <Image
              accessible={false}
              contentFit="contain"
              source={ONBOARDING_HERO}
              style={styles.heroImage}
            />
          </View>

          <RecentDraftsSection
            drafts={drafts}
            formatDisplayTitle={(draft) => formatDraftDisplayTitle(draft, language)}
            formatUpdatedAt={(iso) => formatDraftUpdatedAt(iso, language)}
            onPressDraft={(draft) => {
              void openDraft(draft);
            }}
            title={t('home.recent')}
            viewAllLabel={t('home.viewAll')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  headerSideSlot: {
    width: 44,
  },
  headerIconButton: {
    minHeight: 44,
    width: 44,
    justifyContent: 'center',
  },
  headerRightButton: {
    alignItems: 'flex-end',
  },
  headerTitleArea: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  headerTitle: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    gap: theme.spacing.lg,
  },
  hero: {
    gap: theme.spacing.sm,
  },
  headline: {
    ...theme.typography.headline,
    color: theme.colors.textPrimary,
    maxWidth: 360,
  },
  headlineThai: {
    // Thai vowel/tone marks need extra vertical room vs Latin.
    lineHeight: 48,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    maxWidth: 360,
  },
  subtitleThai: {
    lineHeight: 26,
  },
  actions: {
    gap: theme.spacing.md,
  },
  button: {
    minHeight: theme.buttons.height,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  buttonText: {
    ...theme.typography.button,
  },
  primaryButton: {
    backgroundColor: theme.buttons.primary.backgroundColor,
    borderColor: theme.buttons.primary.borderColor,
  },
  primaryButtonText: {
    color: theme.buttons.primary.color,
  },
  secondaryButton: {
    backgroundColor: theme.buttons.secondary.backgroundColor,
    borderColor: theme.buttons.secondary.borderColor,
  },
  secondaryButtonText: {
    color: theme.buttons.secondary.color,
  },
  disabledButton: {
    opacity: 0.6,
  },
  message: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  heroImageCard: {
    width: '100%',
    opacity: 0.72,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 10,
  },
});
