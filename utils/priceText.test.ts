import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  extractPriceDigits,
  formatAmountNumber,
  formatPriceDisplay,
  getPriceInlineParts,
} from './priceText.ts';

describe('getPriceInlineParts', () => {
  it('keeps THB symbol as a prefix, not in the amount', () => {
    const parts = getPriceInlineParts('1000', 'symbol', 'THB', 'th');
    assert.deepEqual(parts, { prefix: '฿', amount: '1,000', suffix: '' });
  });

  it('keeps Thai Baht word as a suffix, not in the amount', () => {
    const parts = getPriceInlineParts('1000', 'currency_word', 'THB', 'th');
    assert.deepEqual(parts, { prefix: '', amount: '1,000', suffix: ' บาท' });
  });

  it('keeps English THB word as a suffix', () => {
    const parts = getPriceInlineParts('1000', 'currency_word', 'THB', 'en');
    assert.deepEqual(parts, { prefix: '', amount: '1,000', suffix: ' THB' });
  });

  it('uses number-only amount with no affix', () => {
    const parts = getPriceInlineParts('250', 'number', 'THB', 'th');
    assert.deepEqual(parts, { prefix: '', amount: '250', suffix: '' });
  });

  it('still shows the unit when the amount is empty', () => {
    const symbol = getPriceInlineParts('', 'symbol', 'THB', 'th');
    const word = getPriceInlineParts('', 'currency_word', 'THB', 'th');
    assert.deepEqual(symbol, { prefix: '฿', amount: '', suffix: '' });
    assert.deepEqual(word, { prefix: '', amount: '', suffix: ' บาท' });
  });
});

describe('formatPriceDisplay', () => {
  it('joins inline parts for saved/export text', () => {
    assert.equal(formatPriceDisplay('1000', 'symbol', 'THB', 'th'), '฿1,000');
    assert.equal(formatPriceDisplay('1000', 'currency_word', 'THB', 'th'), '1,000 บาท');
    assert.equal(formatPriceDisplay('1000', 'number', 'THB', 'th'), '1,000');
  });

  it('returns empty when there are no digits', () => {
    assert.equal(formatPriceDisplay('', 'currency_word', 'THB', 'th'), '');
    assert.equal(formatPriceDisplay('บาท', 'currency_word', 'THB', 'th'), '');
  });
});

describe('price inline caret / backspace', () => {
  it('does not change digits when the last suffix character is deleted', () => {
    // Root cause of the jumpy caret: formatted value "1,000 บาท" lives in the
    // TextInput, so Backspace eats "ท" and extractPriceDigits still returns 1000.
    const formatted = formatPriceDisplay('1000', 'currency_word', 'THB', 'th');
    assert.equal(formatted, '1,000 บาท');
    assert.equal(extractPriceDigits(formatted.slice(0, -1)), extractPriceDigits(formatted));
  });

  it('changes digits when backspace hits the amount-only field', () => {
    const { amount } = getPriceInlineParts('1000', 'currency_word', 'THB', 'th');
    assert.equal(amount, '1,000');
    assert.equal(extractPriceDigits(amount.slice(0, -1)), '100');
    assert.equal(formatAmountNumber(extractPriceDigits(amount.slice(0, -1))), '100');
  });
});
