import type { CurrencyCode } from '@/types/settings';

export type CurrencyOption = {
  code: CurrencyCode;
  nameKey: string;
};

/** Display order for Settings currency selector. Add new codes at the end. */
export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'THB', nameKey: 'currency.thb' },
  { code: 'SGD', nameKey: 'currency.sgd' },
  { code: 'MYR', nameKey: 'currency.myr' },
  { code: 'JPY', nameKey: 'currency.jpy' },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'THB';
