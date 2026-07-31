import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet } from 'react-native';

import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';

type CropRotateButtonProps = {
  disabled?: boolean;
  onRotateLeft: () => void;
};

/** Single counterclockwise rotate control — sits above the aspect ratio section. */
export function CropRotateButton({ disabled = false, onRotateLeft }: CropRotateButtonProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityLabel={t('crop.rotateLeft')}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onRotateLeft}
      style={[styles.button, disabled && styles.disabled]}>
      <MaterialIcons color={theme.colors.textPrimary} name="rotate-left" size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    zIndex: 5,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  disabled: {
    opacity: 0.45,
  },
});
