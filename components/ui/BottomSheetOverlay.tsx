import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinPriceTheme as theme } from '@/constants/theme';

type BottomSheetOverlayProps = {
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  title: string;
  visible: boolean;
};

const SHEET_TOP_GAP = theme.spacing.xl;

function getKeyboardOverlap(event: KeyboardEvent) {
  const screenHeight = Dimensions.get('screen').height;
  const windowHeight = Dimensions.get('window').height;
  const fromScreenY = screenHeight - event.endCoordinates.screenY;
  const fromWindowY = windowHeight - event.endCoordinates.screenY;

  // Android edge-to-edge often under-reports height alone; use the largest overlap signal.
  return Math.max(0, event.endCoordinates.height, fromScreenY, fromWindowY);
}

export function BottomSheetOverlay({ children, footer, onClose, title, visible }: BottomSheetOverlayProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      setKeyboardHeight(getKeyboardOverlap(event));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (keyboardHeight <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timer);
  }, [keyboardHeight]);

  const windowHeight = Dimensions.get('window').height;
  const bottomSpacer = keyboardHeight > 0 ? keyboardHeight : insets.bottom;
  const availableHeight = Math.max(200, windowHeight - bottomSpacer - SHEET_TOP_GAP);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.root}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdrop} />

        <View style={[styles.sheetWrap, { paddingBottom: bottomSpacer }]}>
          <View style={[styles.sheet, { maxHeight: availableHeight }]}>
            <View style={styles.header}>
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
              <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
                <MaterialIcons color={theme.colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>

            <ScrollView
              bounces={false}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              style={styles.scroll}>
              {children}
            </ScrollView>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.textMuted,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.lg,
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
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  content: {
    gap: theme.spacing.md,
  },
  footer: {
    gap: theme.spacing.md,
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
    lineHeight: 24,
    paddingVertical: 2,
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
