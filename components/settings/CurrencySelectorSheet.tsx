import { Pressable, Text } from 'react-native';

import { settingsStyles as styles } from '@/components/settings/settings.styles';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';
import { CURRENCY_OPTIONS } from '@/constants/currencies';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useTranslation } from '@/contexts/LanguageContext';
import type { CurrencyCode } from '@/types/settings';
import { getCurrencySymbol } from '@/utils/priceText';

type CurrencySelectorSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export function CurrencySelectorSheet({ visible, onClose }: CurrencySelectorSheetProps) {
  const { currency, setCurrency } = useCurrency();
  const { t } = useTranslation();

  const handleSelect = (code: CurrencyCode) => {
    setCurrency(code);
    onClose();
  };

  return (
    <BottomSheetOverlay onClose={onClose} title={t('settings.currency')} visible={visible}>
      {CURRENCY_OPTIONS.map((option) => {
        const isActive = option.code === currency;
        const symbol = getCurrencySymbol(option.code);

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={isActive ? { selected: true } : undefined}
            key={option.code}
            onPress={() => handleSelect(option.code)}
            style={[styles.currencyOptionRow, isActive && styles.currencyOptionRowActive]}>
            <Text style={[styles.currencyOptionLabel, isActive && styles.currencyOptionLabelActive]}>
              {`${symbol}  ${t(option.nameKey)} · ${option.code}`}
            </Text>
          </Pressable>
        );
      })}
    </BottomSheetOverlay>
  );
}
