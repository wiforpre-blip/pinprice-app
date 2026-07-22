import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';

type EditorHeaderProps = {
  filename: string;
  draftFilename: string;
  isEditingFilename: boolean;
  onBack: () => void;
  onStartFilenameEdit: () => void;
  onChangeDraftFilename: (text: string) => void;
  onConfirmFilenameEdit: () => void;
  onCancelFilenameEdit: () => void;
  onOpenSettings: () => void;
  onLayout?: () => void;
};

export const EditorHeader = forwardRef<View, EditorHeaderProps>(function EditorHeader(
  {
    filename,
    draftFilename,
    isEditingFilename,
    onBack,
    onStartFilenameEdit,
    onChangeDraftFilename,
    onConfirmFilenameEdit,
    onCancelFilenameEdit,
    onOpenSettings,
    onLayout,
  },
  ref,
) {
  const { t } = useTranslation();

  return (
    <View ref={ref} style={styles.header} onLayout={onLayout}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>{t('editor.back')}</Text>
      </Pressable>

      <View style={styles.filenameArea}>
        {isEditingFilename ? (
          <View style={styles.filenameEditor}>
            <TextInput
              accessibilityLabel={t('editor.editFilename')}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={onChangeDraftFilename}
              returnKeyType="done"
              onSubmitEditing={onConfirmFilenameEdit}
              selectTextOnFocus
              style={styles.filenameInput}
              value={draftFilename}
            />
            <Pressable accessibilityLabel={t('editor.cancelFilenameEdit')} accessibilityRole="button" onPress={onCancelFilenameEdit} style={styles.iconButton}>
              <MaterialIcons color={theme.colors.sold} name="close" size={20} />
            </Pressable>
            <Pressable accessibilityLabel={t('editor.confirmFilenameEdit')} accessibilityRole="button" onPress={onConfirmFilenameEdit} style={styles.iconButton}>
              <MaterialIcons color={theme.colors.success} name="check" size={20} />
            </Pressable>
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={t('editor.editFilename')} onPress={onStartFilenameEdit} style={styles.filenameButton}>
            <Text numberOfLines={1} style={styles.filenameText}>
              {filename}
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable
        accessibilityLabel={t('home.settings')}
        accessibilityRole="button"
        onPress={onOpenSettings}
        style={styles.headerSettingsButton}>
        <MaterialIcons color={theme.colors.textPrimary} name="settings" size={22} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    minHeight: 44,
    width: 72,
    justifyContent: 'center',
  },
  backButtonText: {
    ...theme.typography.button,
    color: theme.colors.textPrimary,
  },
  filenameArea: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  filenameButton: {
    minHeight: 44,
    maxWidth: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  filenameText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  filenameEditor: {
    minHeight: 44,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  filenameInput: {
    minHeight: 40,
    flex: 1,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.sm,
    ...theme.typography.caption,
  },
  iconButton: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerSettingsButton: {
    minHeight: 44,
    width: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
