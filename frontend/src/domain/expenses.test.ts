import { describe, expect, it } from 'vitest';
import { sampleData } from '../test/fixtures';
import { isValidIsoDate, localToday } from './dates';
import { filterByCategory, sortNewestFirst, totalOf } from './expenses';

const { expenses } = sampleData();

describe('sortNewestFirst', () => {
  it('orders by date, newest first, and same-date expenses newest-added first', () => {
    // e3/e4 share 2026-03-13 and e1/e2 share 2026-03-12.
    expect(sortNewestFirst(expenses).map((e) => e.id)).toEqual(['e6', 'e5', 'e4', 'e3', 'e2', 'e1']);
  });

  it('does not modify the input array', () => {
    const before = expenses.map((e) => e.id);
    sortNewestFirst(expenses);
    expect(expenses.map((e) => e.id)).toEqual(before);
  });
});

describe('filterByCategory and totalOf', () => {
  it('filters to one category and totals what is shown', () => {
    const food = filterByCategory(expenses, 'Food');
    expect(food.map((e) => e.id)).toEqual(['e2', 'e5']);
    expect(totalOf(food)).toBe(425_000);
  });

  it('returns everything for All, and nothing for an unused category', () => {
    expect(totalOf(filterByCategory(expenses, 'All'))).toBe(4_224_999);
    expect(filterByCategory(expenses, 'Other')).toEqual([]);
  });
});

describe('dates', () => {
  it('accepts real calendar dates only', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('1900-02-29')).toBe(false);
    expect(isValidIsoDate('2000-02-29')).toBe(true);
    expect(isValidIsoDate('2026-04-31')).toBe(false);
    expect(isValidIsoDate('2026-3-1')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
  });

  it('formats the local date as YYYY-MM-DD', () => {
    expect(localToday(new Date(2026, 2, 5, 23, 59))).toBe('2026-03-05');
  });
});
