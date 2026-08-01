import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';

type CropHeaderProps = {
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  isBaking: boolean;
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onNext: () => void;
};

export function CropHeader({
  canUndo,
  canRedo,
  canReset,
  isBaking,
  onBack,
  onUndo,
  onRedo,
  onReset,
  onNext,
}: CropHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>{t('crop.back')}</Text>
      </Pressable>

      <View style={styles.historyRow}>
        <Pressable
          accessibilityLabel={t('crop.undo')}
          accessibilityRole="button"
          disabled={!canUndo || isBaking}
          onPress={onUndo}
          style={[styles.historyAction, (!canUndo || isBaking) && styles.disabled]}>
          <MaterialIcons
            color={!canUndo || isBaking ? theme.colors.textMuted : theme.colors.textPrimary}
            name="undo"
            size={22}
          />
        </Pressable>
        <Pressable
          accessibilityLabel={t('crop.reset')}
          accessibilityRole="button"
          disabled={!canReset || isBaking}
          onPress={onReset}
          style={[styles.resetAction, (!canReset || isBaking) && styles.disabled]}>
          <Text
            style={[
              styles.resetText,
              (!canReset || isBaking) && styles.resetTextDisabled,
            ]}>
            {t('crop.reset')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={t('crop.redo')}
          accessibilityRole="button"
          disabled={!canRedo || isBaking}
          onPress={onRedo}
          style={[styles.historyAction, (!canRedo || isBaking) && styles.disabled]}>
          <MaterialIcons
            color={!canRedo || isBaking ? theme.colors.textMuted : theme.colors.textPrimary}
            name="redo"
            size={22}
          />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isBaking}
        onPress={onNext}
        style={[styles.nextButton, isBaking && styles.nextButtonDisabled]}>
        {isBaking ? (
          <ActivityIndicator color={theme.buttons.primary.color} size="small" />
        ) : (
          <Text style={styles.nextButtonText}>{t('crop.next')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  backButton: {
    minHeight: 44,
    minWidth: 64,
    justifyContent: 'center',
  },
  backButtonText: {
    ...theme.typography.button,
    color: theme.colors.textPrimary,
  },
  historyRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  historyAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetAction: {
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    ...theme.typography.button,
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
  resetTextDisabled: {
    color: theme.colors.textMuted,
  },
  disabled: {
    opacity: 0.45,
  },
  nextButton: {
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.buttons.primary.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    ...theme.typography.button,
    color: theme.buttons.primary.color,
  },
});
