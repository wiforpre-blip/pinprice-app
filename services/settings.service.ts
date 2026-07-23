import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_CURRENCY } from '@/constants/currencies';
import type { CurrencyCode, Language } from '@/types/settings';

const LANGUAGE_KEY = 'pinprice.settings.language';
const CURRENCY_KEY = 'pinprice.settings.currency';

const VALID_LANGUAGES: Language[] = ['th', 'en'];
const VALID_CURRENCIES: CurrencyCode[] = ['THB', 'SGD', 'MYR', 'JPY'];

function isLanguage(value: string | null): value is Language {
  return value !== null && VALID_LANGUAGES.includes(value as Language);
}

function isCurrencyCode(value: string | null): value is CurrencyCode {
  return value !== null && VALID_CURRENCIES.includes(value as CurrencyCode);
}

export async function loadLanguagePreference(): Promise<Language | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

export async function saveLanguagePreference(language: Language): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Preference write failures should not block UI.
  }
}

export async function loadCurrencyPreference(): Promise<CurrencyCode> {
  try {
    const stored = await AsyncStorage.getItem(CURRENCY_KEY);
    return isCurrencyCode(stored) ? stored : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export async function saveCurrencyPreference(currency: CurrencyCode): Promise<void> {
  try {
    await AsyncStorage.setItem(CURRENCY_KEY, currency);
  } catch {
    // Preference write failures should not block UI.
  }
}
