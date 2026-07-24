import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import { getEditorTipMessageKey } from '@/hooks/useEditorTips';
import type { EditorTipId } from '@/types/tips';

type EditorTipPlacement = 'canvas' | 'tag-popup' | 'style' | 'select' | 'zoom' | 'export';

type EditorTipProps = {
  tipId: EditorTipId;
  placement: EditorTipPlacement;
  onDismiss: (tipId: EditorTipId) => void;
};

export function getTipPlacement(tipId: EditorTipId): EditorTipPlacement {
  switch (tipId) {
    case 'add-tag':
    case 'drag-tag':
      return 'canvas';
    case 'tag-popup':
      return 'tag-popup';
    case 'style':
      return 'style';
    case 'select':
      return 'select';
    case 'zoom':
      return 'zoom';
    case 'export':
      return 'export';
    default:
      return 'canvas';
  }
}

export function EditorTip({ tipId, placement, onDismiss }: EditorTipProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const floatingBarOffset = theme.spacing.lg + insets.bottom;
  const isButtonTip =
    placement === 'style' || placement === 'select' || placement === 'zoom' || placement === 'export';
  const bottom = isButtonTip
    ? floatingBarOffset + 64
    : placement === 'tag-popup'
      ? floatingBarOffset + 196
      : floatingBarOffset + 144;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.layer,
        { bottom },
        placement === 'style' && styles.layerStyle,
        placement === 'select' && styles.layerSelect,
        placement === 'zoom' && styles.layerZoom,
        placement === 'export' && styles.layerExport,
      ]}>
      <View accessibilityRole="summary" style={styles.card}>
        <Text style={styles.message}>{t(getEditorTipMessageKey(tipId))}</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => onDismiss(tipId)}
          style={styles.dismissButton}>
          <Text style={styles.dismissText}>{t('editor.tips.gotIt')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    zIndex: 30,
    alignItems: 'center',
  },
  layerStyle: {
    alignItems: 'flex-start',
    paddingLeft: theme.spacing.xs,
  },
  layerSelect: {
    alignItems: 'center',
    transform: [{ translateX: -36 }],
  },
  layerZoom: {
    alignItems: 'center',
    transform: [{ translateX: 36 }],
  },
  layerExport: {
    alignItems: 'flex-end',
    paddingRight: theme.spacing.xs,
  },
  card: {
    maxWidth: 280,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  message: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  dismissButton: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    backgroundColor: theme.buttons.primary.backgroundColor,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  dismissText: {
    ...theme.typography.caption,
    color: theme.buttons.primary.color,
    fontWeight: '700',
  },
});
