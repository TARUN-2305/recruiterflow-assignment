import { describe, expect, it } from 'vitest';
import { sampleData } from '../test/fixtures';
import { validateExpenseDraft, type ExpenseDraft } from './validation';

const { members } = sampleData();
const TODAY = '2026-03-20';

function draft(overrides: Partial<ExpenseDraft> = {}): ExpenseDraft {
  return {
    description: 'Dinner',
    amount: '1200',
    paidBy: 'm1',
    date: '2026-03-15',
    category: 'Food',
    splitType: 'equal',
    equalSelected: { m1: true, m2: true, m3: true },
    exactInputs: {},
    percentInputs: {},
    ...overrides,
  };
}

const errorsOf = (d: ExpenseDraft) => {
  const result = validateExpenseDraft(d, members, TODAY, 'new-id');
  return result.ok ? {} : result.errors;
};

describe('a valid draft', () => {
  it('becomes an expense in integer paise with members in trip order', () => {
    const result = validateExpenseDraft(
      draft({ description: '  Dinner  ', amount: '1250.5', equalSelected: { m3: true, m1: true } }),
      members,
      TODAY,
      'new-id',
    );
    expect(result).toEqual({
      ok: true,
      expense: {
        id: 'new-id',
        description: 'Dinner',
        amount: 125_050,
        paidBy: 'm1',
        date: '2026-03-15',
        category: 'Food',
        split: { type: 'equal', memberIds: ['m1', 'm3'] },
      },
    });
  });

  it('allows the payer to be outside the split and a date of today', () => {
    expect(errorsOf(draft({ paidBy: 'm4', date: TODAY }))).toEqual({});
  });
});

describe('every invalid field is reported at once', () => {
  it('reports all errors together and saves nothing', () => {
    const result = validateExpenseDraft(
      draft({ description: '', amount: '', paidBy: '', date: '', category: '', equalSelected: {} }),
      members,
      TODAY,
      'new-id',
    );
    expect(result).toEqual({
      ok: false,
      errors: {
        description: 'Description is required',
        amount: 'Amount is required',
        paidBy: 'Choose who paid',
        date: 'Date is required',
        category: 'Choose a category',
        split: 'Select at least one member to split between',
      },
    });
  });
});

describe('description', () => {
  it('accepts exactly 60 characters and rejects 61', () => {
    expect(errorsOf(draft({ description: 'x'.repeat(60) })).description).toBeUndefined();
    expect(errorsOf(draft({ description: 'x'.repeat(61) })).description).toBe(
      'Description must be at most 60 characters',
    );
  });

  it('treats whitespace-only as missing', () => {
    expect(errorsOf(draft({ description: '   ' })).description).toBe('Description is required');
  });
});

describe('amount', () => {
  it.each([
    ['-5', 'Amount must be more than ₹0'],
    ['0', 'Amount must be more than ₹0'],
    ['0.00', 'Amount must be more than ₹0'],
    ['1.234', 'Amount can have at most 2 decimal places'],
    ['1000000.01', 'Amount must be at most ₹10,00,000.00'],
    ['abc', 'Enter an amount in rupees, for example 1250.50'],
  ])('%j -> %s', (amount, message) => {
    expect(errorsOf(draft({ amount })).amount).toBe(message);
  });

  it('accepts the smallest and largest allowed amounts', () => {
    expect(errorsOf(draft({ amount: '0.01' })).amount).toBeUndefined();
    expect(errorsOf(draft({ amount: '1000000' })).amount).toBeUndefined();
  });
});

describe('payer, date and category', () => {
  it('rejects an unknown payer, an impossible date, a future date and an unknown category', () => {
    expect(errorsOf(draft({ paidBy: 'm9' })).paidBy).toBe('Choose who paid');
    expect(errorsOf(draft({ date: '2026-02-30' })).date).toBe('Enter a valid date');
    expect(errorsOf(draft({ date: '2026-03-21' })).date).toBe('Date cannot be in the future');
    expect(errorsOf(draft({ category: 'Snacks' })).category).toBe('Choose a category');
  });
});

describe('exact split', () => {
  const exact = (inputs: Record<string, string>, amount = '100') =>
    draft({ amount, splitType: 'exact', exactInputs: inputs });

  it('shows how much is left to assign', () => {
    expect(errorsOf(exact({ m1: '50', m2: '37.50' })).split).toBe('₹12.50 left to assign');
  });

  it('shows how much is over the total', () => {
    expect(errorsOf(exact({ m1: '60', m2: '45' })).split).toBe('₹5.00 over the total');
  });

  it('flags negative and malformed shares next to the member', () => {
    expect(errorsOf(exact({ m1: '-10', m2: '1.005' })).shares).toEqual({
      m1: 'Must be ₹0 or more',
      m2: 'At most 2 decimal places',
    });
  });

  it('saves only members with a non-zero share, as integer paise', () => {
    const result = validateExpenseDraft(exact({ m2: '60.25', m1: '39.75', m3: '0' }), members, TODAY, 'id');
    expect(result.ok && result.expense.split).toEqual({ type: 'exact', shares: { m1: 3975, m2: 6025 } });
  });

  it('cannot check the total while the amount itself is invalid', () => {
    const errors = errorsOf(exact({ m1: '50' }, ''));
    expect(errors.amount).toBe('Amount is required');
    expect(errors.split).toBeUndefined();
  });
});

describe('percentage split', () => {
  const percent = (inputs: Record<string, string>) => draft({ splitType: 'percent', percentInputs: inputs });

  it('requires a total of exactly 100', () => {
    expect(errorsOf(percent({ m1: '33.33', m2: '33.33', m3: '33.33' })).split).toBe(
      'Percentages add up to 99.99%; they must total exactly 100%',
    );
    expect(errorsOf(percent({ m1: '60', m2: '50' })).split).toBe(
      'Percentages add up to 110%; they must total exactly 100%',
    );
  });

  it('rejects values outside 0-100 or with more than 2 decimals', () => {
    expect(errorsOf(percent({ m1: '101', m2: '-1', m3: '10.125' })).shares).toEqual({
      m1: 'Must be between 0 and 100',
      m2: 'Must be between 0 and 100',
      m3: 'At most 2 decimal places',
    });
  });

  it('saves percentages in the brief’s number format', () => {
    const result = validateExpenseDraft(percent({ m1: '33.33', m2: '33.33', m3: '33.34' }), members, TODAY, 'id');
    expect(result.ok && result.expense.split).toEqual({
      type: 'percent',
      shares: { m1: 33.33, m2: 33.33, m3: 33.34 },
    });
  });
});
