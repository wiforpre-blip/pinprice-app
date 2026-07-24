import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
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

export default function HomeScreen() {
  const router = useRouter();
  const { language, t } = useTranslation();
  const { drafts, refreshDrafts } = useRecentDrafts();
  const [isOpeningPicker, setIsOpeningPicker] = useState(false);
  const [isOpeningDraft, setIsOpeningDraft] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const openEditor = (imageUri: string, draftId?: string) => {
    router.push({
      pathname: '/editor',
      params: draftId
        ? { imageUri: encodeURIComponent(imageUri), draftId }
        : { imageUri: encodeURIComponent(imageUri) },
    });
  };

  const handleImageResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) {
      return;
    }

    const selectedUri = result.assets[0]?.uri;
    if (selectedUri) {
      openEditor(selectedUri);
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

      openEditor(draft.imageUri, draft.id);
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

          <View style={styles.previewCard}>
            <View style={styles.photoMock}>
              <View style={[styles.productBlock, styles.productBlockLarge]} />
              <View style={[styles.productBlock, styles.productBlockTop]} />
              <View style={[styles.productBlock, styles.productBlockBottom]} />

              <View style={[styles.tag, styles.priceTag, styles.priceTagPosition]}>
                <Text style={[styles.tagText, styles.priceTagText]}>THB 1,250</Text>
              </View>
              <View style={[styles.tag, styles.soldTag, styles.soldTagPosition]}>
                <Text style={[styles.tagText, styles.soldTagText]}>SOLD</Text>
              </View>
            </View>
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
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    ...theme.shadows.card,
  },
  photoMock: {
    aspectRatio: 16 / 10,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.photoMockBackground,
    overflow: 'hidden',
  },
  productBlock: {
    position: 'absolute',
    backgroundColor: theme.colors.photoMockItem,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.photoMockItemBorder,
  },
  productBlockLarge: {
    width: '43%',
    height: '48%',
    left: '8%',
    top: '16%',
  },
  productBlockTop: {
    width: '30%',
    height: '36%',
    right: '10%',
    top: '14%',
  },
  productBlockBottom: {
    width: '33%',
    height: '34%',
    right: '18%',
    bottom: '10%',
  },
  tag: {
    position: 'absolute',
    minHeight: 28,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.tag,
  },
  tagText: {
    ...theme.typography.tag,
  },
  priceTag: {
    backgroundColor: theme.tags.price.backgroundColor,
    borderColor: theme.tags.price.borderColor,
  },
  priceTagText: {
    color: theme.tags.price.color,
  },
  priceTagPosition: {
    left: '12%',
    top: '59%',
  },
  soldTag: {
    backgroundColor: theme.tags.sold.backgroundColor,
    borderColor: theme.tags.sold.borderColor,
  },
  soldTagText: {
    color: theme.tags.sold.color,
  },
  soldTagPosition: {
    right: '12%',
    top: '42%',
  },
});
