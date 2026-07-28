import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { FloatingHistoryActionId } from '@/components/editor/EditorFloatingControls';

const HEADER_HISTORY_ACTIONS = [
  { id: 'undo', labelKey: 'editor.undo', icon: 'undo' },
  { id: 'reset', labelKey: 'editor.reset', icon: 'restart-alt' },
  { id: 'redo', labelKey: 'editor.redo', icon: 'redo' },
] as const;

type EditorHeaderProps = {
  canUndo: boolean;
  canRedo: boolean;
  canReset: boolean;
  showHistoryControls: boolean;
  onBack: () => void;
  onHistoryAction: (actionId: FloatingHistoryActionId) => void;
  onOpenSettings: () => void;
  onLayout?: () => void;
};

export const EditorHeader = forwardRef<View, EditorHeaderProps>(function EditorHeader(
  {
    canUndo,
    canRedo,
    canReset,
    showHistoryControls,
    onBack,
    onHistoryAction,
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

      <View style={styles.historyArea}>
        {showHistoryControls ? (
          <View style={styles.historyRow}>
            {HEADER_HISTORY_ACTIONS.map((item) => {
              const isDisabled =
                (item.id === 'undo' && !canUndo) ||
                (item.id === 'reset' && !canReset) ||
                (item.id === 'redo' && !canRedo);

              return (
                <Pressable
                  accessibilityLabel={t(item.labelKey)}
                  accessibilityRole="button"
                  accessibilityState={isDisabled ? { disabled: true } : undefined}
                  disabled={isDisabled}
                  key={item.id}
                  onPress={() => onHistoryAction(item.id)}
                  style={[styles.historyAction, isDisabled && styles.historyActionDisabled]}>
                  <MaterialIcons
                    color={isDisabled ? theme.colors.textMuted : theme.colors.textPrimary}
                    name={item.icon}
                    size={22}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null}
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
    width: 72,
    justifyContent: 'center',
  },
  backButtonText: {
    ...theme.typography.button,
    color: theme.colors.textPrimary,
  },
  historyArea: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  historyAction: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
  historyActionDisabled: {
    opacity: 0.45,
  },
  headerSettingsButton: {
    minHeight: 44,
    width: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
