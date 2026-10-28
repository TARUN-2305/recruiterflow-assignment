import { describe, expect, it } from 'vitest';
import { createRandom } from '../test/random';
import { describeSplit, formatDate, formatINR, formatPercent } from './format';

describe('formatINR', () => {
  it.each([
    [0, '₹0.00'],
    [1, '₹0.01'],
    [50, '₹0.50'],
    [100_000, '₹1,000.00'],
    [125_050, '₹1,250.50'],
    [4_224_999, '₹42,249.99'],
    [10_000_000, '₹1,00,000.00'],
    [100_000_000, '₹10,00,000.00'],
    [1_234_567_890, '₹1,23,45,678.90'],
    [-369_578, '-₹3,695.78'],
  ])('formats %i paise as %s', (paise, expected) => {
    expect(formatINR(paise)).toBe(expected);
  });

  it('agrees with Intl en-IN formatting on 1,000 generated amounts', () => {
    const intl = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
    const random = createRandom(7);
    for (let n = 0; n < 1000; n += 1) {
      const paise = random.int(0, 9_999_999_999);
      // Intl needs a float; used here only as an independent check of our integer formatter.
      expect(formatINR(paise)).toBe(intl.format(paise / 100));
    }
  });
});

describe('describeSplit', () => {
  it('describes each split type with the number of people', () => {
    expect(describeSplit({ type: 'equal', memberIds: ['m1', 'm2', 'm3', 'm4'] })).toBe('Equally, 4 people');
    expect(describeSplit({ type: 'exact', shares: { m3: 1, m4: 1, m5: 1 } })).toBe('Exact amounts, 3 people');
    expect(describeSplit({ type: 'percent', shares: { m1: 100 } })).toBe('Percentages, 1 person');
  });
});

describe('formatPercent and formatDate', () => {
  it('formats basis points without trailing zeros', () => {
    expect(formatPercent(10_000)).toBe('100');
    expect(formatPercent(3333)).toBe('33.33');
    expect(formatPercent(9050)).toBe('90.5');
    expect(formatPercent(9005)).toBe('90.05');
  });

  it('formats ISO dates for display', () => {
    expect(formatDate('2026-03-05')).toBe('5 Mar 2026');
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});
