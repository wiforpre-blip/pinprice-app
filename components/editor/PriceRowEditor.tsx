import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { PinPriceTheme as theme } from '@/constants/theme';
import { useTranslation } from '@/contexts/LanguageContext';
import type { PanelMarker } from '@/types/pricePanel';
import { formatPriceText } from '@/utils/priceText';

type PriceRowEditorProps = {
  confirmLabel: string;
  marker: PanelMarker | null;
  onCancel: () => void;
  onSave: (markerId: string, priceText: string) => void;
  visible: boolean;
};

export function PriceRowEditor({ confirmLabel, marker, onCancel, onSave, visible }: PriceRowEditorProps) {
  const { t } = useTranslation();
  const [priceText, setPriceText] = useState('');

  useEffect(() => {
    if (visible && marker) {
      setPriceText(marker.priceText);
    }
  }, [marker, visible]);

  const savePrice = () => {
    if (!marker) {
      return;
    }

    onSave(marker.id, priceText.trim());
  };

  return (
    <BottomSheetOverlay onClose={onCancel} title={t('pricePanel.editPriceTitle')} visible={visible}>
      <TextInput
        key={marker?.id ?? 'empty'}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
        keyboardType="number-pad"
        onChangeText={(nextText) => setPriceText(formatPriceText(nextText))}
        placeholder={t('pricePanel.enterPrice')}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="done"
        style={styles.input}
        value={priceText}
      />

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={savePrice} style={[styles.button, styles.saveButton]}>
          <Text style={[styles.buttonText, styles.saveButtonText]}>{confirmLabel}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.button, styles.cancelButton]}>
          <Text style={[styles.buttonText, styles.cancelButtonText]}>{t('tag.cancel')}</Text>
        </Pressable>
      </View>
    </BottomSheetOverlay>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    ...theme.typography.body,
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
  buttonText: {
    ...theme.typography.button,
  },
  saveButton: {
    borderColor: theme.buttons.primary.borderColor,
    backgroundColor: theme.buttons.primary.backgroundColor,
  },
  saveButtonText: {
    color: theme.buttons.primary.color,
  },
  cancelButton: {
    borderColor: theme.buttons.secondary.borderColor,
    backgroundColor: theme.buttons.secondary.backgroundColor,
  },
  cancelButtonText: {
    color: theme.buttons.secondary.color,
  },
});
