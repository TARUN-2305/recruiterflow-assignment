import { describe, expect, it } from 'vitest';
import { sampleData } from '../test/fixtures';
import { createRandom } from '../test/random';
import { sharesFor } from './allocation';
import { computeBalances, describeBalance } from './balances';
import { basisPointsToPercent } from './money';
import type { Expense, Member, Split } from './types';

const total = (balances: { balance: number }[]) => balances.reduce((s, b) => s + b.balance, 0);

describe('computeBalances on the sample data', () => {
  const { members, expenses } = sampleData();

  it('matches the hand-checked balances', () => {
    expect(computeBalances(members, expenses)).toEqual([
      { memberId: 'm1', name: 'Aarav', balance: 1_855_420 },
      { memberId: 'm2', name: 'Diya', balance: -369_578 },
      { memberId: 'm3', name: 'Kabir', balance: 55_408 },
      { memberId: 'm4', name: 'Meera', balance: -811_250 },
      { memberId: 'm5', name: 'Rohan', balance: -730_000 },
    ]);
  });

  it('adds up to exactly ₹0', () => {
    expect(total(computeBalances(members, expenses))).toBe(0);
  });

  it('credits a payer who is not part of the split (Meera buys groceries)', () => {
    const groceries = expenses.filter((e) => e.id === 'e5');
    expect(computeBalances(members, groceries)).toEqual([
      { memberId: 'm1', name: 'Aarav', balance: -33_334 },
      { memberId: 'm2', name: 'Diya', balance: -33_333 },
      { memberId: 'm3', name: 'Kabir', balance: -33_333 },
      { memberId: 'm4', name: 'Meera', balance: 100_000 },
      { memberId: 'm5', name: 'Rohan', balance: 0 },
    ]);
  });

  it('is all zero with no expenses', () => {
    expect(computeBalances(members, []).every((b) => b.balance === 0)).toBe(true);
  });
});

describe('balance invariant on generated trips', () => {
  const members: Member[] = ['A', 'B', 'C', 'D', 'E'].map((name, i) => ({ id: `m${String(i + 1)}`, name }));
  const ids = members.map((m) => m.id);
  const random = createRandom(42);

  function randomSubset(): string[] {
    const subset = ids.filter(() => random.int(0, 1) === 1);
    return subset.length > 0 ? subset : [ids[random.int(0, ids.length - 1)] ?? 'm1'];
  }

  function randomSplit(amount: number): Split {
    const people = randomSubset();
    const kind = random.int(0, 2);
    if (kind === 0) return { type: 'equal', memberIds: people };
    // Random positive integer weights, then scaled to the exact total (paise) or to 10000 bp.
    const target = kind === 1 ? amount : 10_000;
    const cuts = people.map(() => random.int(1, 1000));
    const cutSum = cuts.reduce((a, b) => a + b, 0);
    const parts = cuts.map((c) => Math.floor((c * target) / cutSum));
    parts[0] = (parts[0] ?? 0) + target - parts.reduce((a, b) => a + b, 0);
    const shares: Record<string, number> = {};
    people.forEach((id, i) => {
      const part = parts[i] ?? 0;
      shares[id] = kind === 1 ? part : basisPointsToPercent(part);
    });
    return kind === 1 ? { type: 'exact', shares } : { type: 'percent', shares };
  }

  it('every expense splits to its exact amount and balances sum to 0 (500 trips)', () => {
    for (let trip = 0; trip < 500; trip += 1) {
      const expenses: Expense[] = Array.from({ length: random.int(1, 12) }, (_, i) => {
        const amount = random.int(1, 100_000_000);
        return {
          id: `e${String(i)}`,
          description: 'Generated',
          amount,
          paidBy: ids[random.int(0, ids.length - 1)] ?? 'm1',
          date: '2026-03-12',
          category: 'Other',
          split: randomSplit(amount),
        };
      });
      for (const e of expenses) {
        expect(Object.values(sharesFor(e, ids)).reduce((a, b) => a + b, 0)).toBe(e.amount);
      }
      expect(total(computeBalances(members, expenses))).toBe(0);
    }
  });
});

describe('describeBalance', () => {
  it('uses the wording from the brief', () => {
    expect(describeBalance(1_855_420)).toBe('gets back ₹18,554.20');
    expect(describeBalance(-369_578)).toBe('owes ₹3,695.78');
    expect(describeBalance(0)).toBe('settled up');
  });
});
