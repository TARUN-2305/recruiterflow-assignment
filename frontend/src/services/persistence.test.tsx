import { act, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sampleTripData } from '../data/sampleData';
import type { Expense } from '../domain/types';
import { expenseAdded } from '../store/expensesSlice';
import { MemoryStorage, renderApp } from '../test/renderApp';
import { createAppStore, loadExpenses, saveExpenses, STORAGE_KEY, type KeyValueStorage } from './persistence';

const { members, expenses: sampleExpenses } = sampleTripData();

const extra: Expense = {
  id: 'x1',
  description: 'Sunset cruise',
  amount: 300_000,
  paidBy: 'm3',
  date: '2026-03-16',
  category: 'Activities',
  split: { type: 'equal', memberIds: ['m1', 'm3'] },
};

function storageWith(raw: string): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, raw);
  return storage;
}

describe('loading saved expenses', () => {
  it('round-trips what was saved', () => {
    const storage = new MemoryStorage();
    expect(saveExpenses(storage, [...sampleExpenses, extra])).toBe(true);
    expect(loadExpenses(storage, members)).toEqual([...sampleExpenses, extra]);
  });

  it.each([
    ['nothing saved', null],
    ['corrupt JSON', '{not json'],
    ['an unknown version', JSON.stringify({ version: 99, expenses: [] })],
    ['the wrong shape', JSON.stringify([1, 2, 3])],
    ['an invalid record', JSON.stringify({ version: 1, expenses: [{ ...extra, amount: -5 }] })],
    ['an unknown member', JSON.stringify({ version: 1, expenses: [{ ...extra, paidBy: 'm99' }] })],
  ])('falls back to the sample data when there is %s', (_label, raw) => {
    const storage = raw === null ? new MemoryStorage() : storageWith(raw);
    expect(loadExpenses(storage, members)).toBeNull();
    expect(createAppStore(storage).getState().expenses.items).toEqual(sampleExpenses);
  });

  it('keeps a saved empty list (all expenses deleted) instead of restoring the sample', () => {
    const storage = storageWith(JSON.stringify({ version: 1, expenses: [] }));
    expect(createAppStore(storage).getState().expenses.items).toEqual([]);
  });

  it('copes with storage that throws on read and on write', () => {
    const broken: KeyValueStorage = {
      getItem: () => { throw new Error('SecurityError'); },
      setItem: () => { throw new Error('QuotaExceededError'); },
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const store = createAppStore(broken);
    expect(store.getState().expenses.items).toEqual(sampleExpenses);

    store.dispatch(expenseAdded(extra));
    expect(store.getState().expenses.items).toHaveLength(7); // still works in memory
    expect(warn).toHaveBeenCalledOnce();
  });

  it('works with no storage at all', () => {
    expect(createAppStore(null).getState().expenses.items).toEqual(sampleExpenses);
  });
});

describe('surviving a reload', () => {
  it('shows an added expense again after the app is mounted from scratch', () => {
    const storage = new MemoryStorage();
    const first = renderApp({ storage });
    act(() => {
      first.store.dispatch(expenseAdded(extra));
    });
    expect(screen.getByText('Sunset cruise')).toBeInTheDocument();
    first.unmount();

    // A "reload": a brand-new store and app reading the same storage.
    renderApp({ storage });
    expect(screen.getByText('Sunset cruise')).toBeInTheDocument();
    expect(screen.getByText(/Showing 7 expenses/)).toBeInTheDocument();
  });
});
