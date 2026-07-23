import type { Language, CurrencyCode } from '@/types/settings';
import type { PriceTextFormat } from '@/types/tag';

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  THB: '฿',
  SGD: 'S$',
  MYR: 'RM',
  JPY: '¥',
};

const CURRENCY_WORDS: Record<CurrencyCode, Record<Language, string>> = {
  THB: { th: 'บาท', en: 'THB' },
  SGD: { th: 'SGD', en: 'SGD' },
  MYR: { th: 'MYR', en: 'MYR' },
  JPY: { th: 'เยน', en: 'JPY' },
};

/** Price text styles available for each currency setting. */
const PRICE_TEXT_FORMATS_BY_CURRENCY: Record<CurrencyCode, readonly PriceTextFormat[]> = {
  THB: ['symbol', 'currency_word', 'number'],
  SGD: ['symbol', 'currency_word', 'number'],
  MYR: ['symbol', 'number'],
  JPY: ['symbol'],
};

export function getCurrencySymbol(currency: CurrencyCode) {
  return CURRENCY_SYMBOLS[currency];
}

export function getCurrencyWord(currency: CurrencyCode, language: Language) {
  return CURRENCY_WORDS[currency][language];
}

/** Formats shown in the price tag popup / style cycle for the active currency. */
export function getPriceTextFormatsForCurrency(currency: CurrencyCode): readonly PriceTextFormat[] {
  return PRICE_TEXT_FORMATS_BY_CURRENCY[currency];
}

/** Keep a stored/selected format valid for the active currency (falls back to first allowed). */
export function clampPriceTextFormat(currency: CurrencyCode, format?: PriceTextFormat): PriceTextFormat {
  const allowed = getPriceTextFormatsForCurrency(currency);
  if (format && allowed.includes(format)) {
    return format;
  }

  return allowed[0] ?? 'symbol';
}

export function extractPriceDigits(text: string) {
  return text.replace(/\D/g, '');
}

export function formatAmountNumber(digits: string) {
  if (!digits) {
    return '';
  }

  return Number(digits).toLocaleString('en-US');
}

/** Build price display text from digits + format + settings. */
export function formatPriceDisplay(
  rawAmount: string,
  format: PriceTextFormat,
  currency: CurrencyCode,
  language: Language,
) {
  const digits = extractPriceDigits(rawAmount);
  const amount = formatAmountNumber(digits);
  const resolvedFormat = clampPriceTextFormat(currency, format);

  if (!amount) {
    return '';
  }

  switch (resolvedFormat) {
    case 'symbol':
      return `${getCurrencySymbol(currency)}${amount}`;
    case 'currency_word':
      return `${amount} ${getCurrencyWord(currency, language)}`;
    case 'number':
      return amount;
  }
}

/** Legacy input helper — keeps digits-only entry compatible with older callers. */
export function formatPriceText(text: string) {
  const digits = extractPriceDigits(text);

  if (!digits) {
    return text;
  }

  return `THB ${formatAmountNumber(digits)}`;
}
