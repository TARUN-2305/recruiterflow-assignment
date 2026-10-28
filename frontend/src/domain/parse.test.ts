import { describe, expect, it } from 'vitest';
import sampleJson from '../data/sample-data.json';
import { sampleData } from '../test/fixtures';
import { parseExpenses, parseTripData } from './parse';

const { members, expenses } = sampleData();

describe('parseTripData', () => {
  it('accepts the brief’s sample data unchanged', () => {
    expect(parseTripData(sampleJson)).toEqual(sampleJson);
    expect(members).toHaveLength(5);
    expect(expenses).toHaveLength(6);
  });

  it('rejects data without valid members', () => {
    expect(parseTripData(null)).toBeNull();
    expect(parseTripData({ members: [], expenses: [] })).toBeNull();
    expect(parseTripData({ members: [{ id: 'm1', name: 'A' }, { id: 'm1', name: 'B' }], expenses: [] })).toBeNull();
  });
});

describe('parseExpenses rejects any malformed record', () => {
  const valid = () => structuredClone(expenses);
  const withChange = (index: number, change: Record<string, unknown>): unknown => {
    const list: unknown[] = valid();
    list[index] = { ...expenses[index], ...change };
    return list;
  };

  it('accepts a valid list and an empty list', () => {
    expect(parseExpenses(valid(), members)).toEqual(expenses);
    expect(parseExpenses([], members)).toEqual([]);
  });

  it.each([
    ['a non-array', 'nope'],
    ['a non-integer amount', withChange(0, { amount: 100.5 })],
    ['a zero amount', withChange(0, { amount: 0 })],
    ['an amount above the maximum', withChange(0, { amount: 100_000_001 })],
    ['an unknown payer', withChange(0, { paidBy: 'm9' })],
    ['an impossible date', withChange(0, { date: '2026-02-30' })],
    ['an unknown category', withChange(0, { category: 'Snacks' })],
    ['an empty description', withChange(0, { description: ' ' })],
    ['a description over 60 characters', withChange(0, { description: 'x'.repeat(61) })],
    ['an unknown split type', withChange(0, { split: { type: 'weird' } })],
    ['an empty equal split', withChange(0, { split: { type: 'equal', memberIds: [] } })],
    ['a duplicated member', withChange(0, { split: { type: 'equal', memberIds: ['m1', 'm1'] } })],
    ['an unknown split member', withChange(0, { split: { type: 'equal', memberIds: ['m9'] } })],
    ['exact shares that do not sum to the amount', withChange(2, { split: { type: 'exact', shares: { m3: 1 } } })],
    // The shares still add up to the amount (1,050,000), so only the negative value is wrong.
    ['a negative exact share', withChange(2, { split: { type: 'exact', shares: { m3: 1_050_001, m4: -1 } } })],
    ['percentages that do not total 100', withChange(3, { split: { type: 'percent', shares: { m1: 50 } } })],
    ['percentages with 3 decimals', withChange(3, { split: { type: 'percent', shares: { m1: 33.333, m2: 66.667 } } })],
    ['duplicate expense ids', [...valid(), { ...expenses[0] }]],
  ])('rejects %s', (_label, value) => {
    expect(parseExpenses(value, members)).toBeNull();
  });
});
