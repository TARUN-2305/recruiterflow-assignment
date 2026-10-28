import { describe, expect, it } from 'vitest';
import { createRandom } from '../test/random';
import { allocate, sharesFor } from './allocation';
import type { Expense } from './types';

const ORDER = ['m1', 'm2', 'm3', 'm4', 'm5'];
const equal = (...ids: string[]) => ids.map((memberId) => ({ memberId, weight: 1 }));
const sum = (shares: Record<string, number>) => Object.values(shares).reduce((a, b) => a + b, 0);

function expense(amount: number, split: Expense['split']): Expense {
  return { id: 'x', description: 'Test', amount, paidBy: 'm1', date: '2026-03-12', category: 'Food', split };
}

describe('allocate', () => {
  it('splits ₹100 equally between 3 people as 33.34 + 33.33 + 33.33', () => {
    expect(allocate(10_000, equal('m1', 'm2', 'm3'))).toEqual({ m1: 3334, m2: 3333, m3: 3333 });
  });

  it('gives leftover paise to the earliest members in trip order', () => {
    expect(allocate(2, equal('m1', 'm2', 'm3'))).toEqual({ m1: 1, m2: 1, m3: 0 });
    expect(allocate(1, equal('m3', 'm4', 'm5'))).toEqual({ m3: 1, m4: 0, m5: 0 });
  });

  it('gives leftover paise to the largest remainders first in a percentage split', () => {
    // ₹1,499.99 at 33.33 / 33.33 / 33.34 (sample expense e6)
    expect(allocate(149_999, [
      { memberId: 'm1', weight: 3333 },
      { memberId: 'm2', weight: 3333 },
      { memberId: 'm3', weight: 3334 },
    ])).toEqual({ m1: 49_995, m2: 49_995, m3: 50_009 });
  });

  it('splits evenly divisible amounts exactly', () => {
    expect(allocate(2_400_000, equal(...ORDER))).toEqual({ m1: 480_000, m2: 480_000, m3: 480_000, m4: 480_000, m5: 480_000 });
  });

  it('handles a zero-weight participant and a zero total', () => {
    expect(allocate(100, [{ memberId: 'm1', weight: 0 }, { memberId: 'm2', weight: 1 }])).toEqual({ m1: 0, m2: 100 });
    expect(allocate(0, equal('m1', 'm2'))).toEqual({ m1: 0, m2: 0 });
  });

  it('rejects invalid input instead of guessing', () => {
    expect(() => allocate(10.5, equal('m1'))).toThrow(RangeError);
    expect(() => allocate(-1, equal('m1'))).toThrow(RangeError);
    expect(() => allocate(100, [])).toThrow(RangeError);
    expect(() => allocate(100, [{ memberId: 'm1', weight: 0.5 }])).toThrow(RangeError);
  });

  it('never loses or invents a paisa (2,000 generated cases)', () => {
    const random = createRandom(20260328);
    for (let n = 0; n < 2000; n += 1) {
      const total = random.int(0, 100_000_000);
      const people = random.int(1, 5);
      const weights = ORDER.slice(0, people).map((memberId) => ({ memberId, weight: random.int(0, 10_000) }));
      if (weights.every((w) => w.weight === 0)) weights[0] = { memberId: 'm1', weight: 1 };
      const shares = allocate(total, weights);
      expect(sum(shares)).toBe(total);
      expect(Object.values(shares).every((s) => Number.isInteger(s) && s >= 0)).toBe(true);
    }
  });
});

describe('sharesFor', () => {
  it('uses trip member order, not the order of keys in the JSON', () => {
    // Sample e4 lists shares as m5, m1, m2.
    const e = expense(200_000, { type: 'percent', shares: { m5: 50, m1: 25, m2: 25 } });
    expect(sharesFor(e, ORDER)).toEqual({ m1: 50_000, m2: 50_000, m5: 100_000 });
    const odd = expense(1, { type: 'percent', shares: { m5: 50, m1: 50 } });
    expect(sharesFor(odd, ORDER)).toEqual({ m1: 1, m5: 0 });
  });

  it('applies the same rule to equal splits regardless of memberIds order', () => {
    const e = expense(10_000, { type: 'equal', memberIds: ['m3', 'm2', 'm1'] });
    expect(sharesFor(e, ORDER)).toEqual({ m1: 3334, m2: 3333, m3: 3333 });
  });

  it('returns exact shares as entered', () => {
    const e = expense(1_050_000, { type: 'exact', shares: { m3: 350_000, m4: 350_000, m5: 350_000 } });
    expect(sharesFor(e, ORDER)).toEqual({ m3: 350_000, m4: 350_000, m5: 350_000 });
  });

  it('refuses expenses that reference unknown members', () => {
    const e = expense(100, { type: 'equal', memberIds: ['m1', 'ghost'] });
    expect(() => sharesFor(e, ORDER)).toThrow(/unknown members: ghost/);
  });
});
