import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';

type ConfirmOverlayVariant = 'primary' | 'destructive';

type ConfirmOverlayProps = {
  body?: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmVariant?: ConfirmOverlayVariant;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

export function ConfirmOverlay({
  body,
  cancelLabel,
  confirmLabel,
  confirmVariant = 'primary',
  onCancel,
  onConfirm,
  title,
  visible,
}: ConfirmOverlayProps) {
  const isDestructive = confirmVariant === 'destructive';

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="summary" onPress={(event) => event.stopPropagation()} style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.button, styles.cancelButton]}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={[styles.button, isDestructive ? styles.destructiveButton : styles.primaryButton]}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.overlayBackdrop,
    paddingHorizontal: theme.spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  title: {
    ...theme.typography.button,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  button: {
    minHeight: theme.buttons.height,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    paddingHorizontal: theme.spacing.sm,
  },
  cancelButton: {
    borderColor: theme.buttons.secondary.borderColor,
    backgroundColor: theme.buttons.secondary.backgroundColor,
  },
  primaryButton: {
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.buttons.primary.backgroundColor,
  },
  destructiveButton: {
    borderColor: theme.colors.sold,
    backgroundColor: theme.colors.sold,
  },
  cancelText: {
    ...theme.typography.button,
    color: theme.buttons.secondary.color,
  },
  confirmText: {
    ...theme.typography.button,
    color: theme.buttons.primary.color,
  },
});
