import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinPriceTheme as theme } from '@/constants/theme';

type BottomSheetOverlayProps = {
  children: ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
};

export function BottomSheetOverlay({ children, onClose, title, visible }: BottomSheetOverlayProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop}>
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <Pressable accessibilityRole="summary" onPress={(event) => event.stopPropagation()} style={styles.sheet}>
            <View style={styles.header}>
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <MaterialIcons color={theme.colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>
            {children}
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.lg,
  },
  safeArea: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  title: {
    flex: 1,
    ...theme.typography.button,
    color: theme.colors.textPrimary,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
  },
});
