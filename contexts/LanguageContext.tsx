import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import en from '@/locales/en.json';
import th from '@/locales/th.json';
import { loadLanguagePreference, saveLanguagePreference } from '@/services/settings.service';
import type { Language } from '@/types/settings';

export type { Language };

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationTable = { [key: string]: TranslationValue };

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

const translations: Record<Language, TranslationTable> = { en, th };
const LanguageContext = createContext<LanguageContextValue | null>(null);

function getDeviceLanguage(): Language {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();

  return locale.startsWith('th') ? 'th' : 'en';
}

function getTranslationValue(table: TranslationTable, key: string) {
  return key.split('.').reduce<TranslationValue | undefined>((currentValue, keyPart) => {
    if (!currentValue || typeof currentValue === 'string') {
      return undefined;
    }

    return currentValue[keyPart];
  }, table);
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(() => getDeviceLanguage());

  useEffect(() => {
    let isMounted = true;

    void loadLanguagePreference().then((storedLanguage) => {
      if (isMounted && storedLanguage) {
        setLanguageState(storedLanguage);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    void saveLanguagePreference(nextLanguage);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    const t = (key: string) => {
      const translatedValue = getTranslationValue(translations[language], key);
      const fallbackValue = getTranslationValue(translations.en, key);

      if (typeof translatedValue === 'string') {
        return translatedValue;
      }

      return typeof fallbackValue === 'string' ? fallbackValue : key;
    };

    return { language, setLanguage, t };
  }, [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useTranslation must be used within LanguageProvider.');
  }

  return context;
}
