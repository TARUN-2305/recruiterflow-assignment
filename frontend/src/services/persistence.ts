// The only place that touches localStorage.
//  - Read once, when the store is created: saved expenses are validated, and anything
//    missing or unreadable falls back to the sample data.
//  - Written by one store subscriber whenever the expenses list changes.
// Components and reducers never read or write storage themselves.

import { sampleTripData } from '../data/sampleData';
import { parseExpenses } from '../domain/parse';
import type { Expense, Member } from '../domain/types';
import { makeStore, type AppStore } from '../store';

export const STORAGE_KEY = 'trip-splitter:v1';
const STORAGE_VERSION = 1;

/** The part of the Web Storage API we use; tests pass an in-memory fake. */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Saved expenses, or null if nothing valid is saved (missing, corrupt, old format, bad record). */
export function loadExpenses(storage: KeyValueStorage, members: readonly Member[]): Expense[] | null {
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage can throw when it is disabled by the browser
  }
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || !('version' in parsed) || !('expenses' in parsed)) {
    return null;
  }
  return parsed.version === STORAGE_VERSION ? parseExpenses(parsed.expenses, members) : null;
}

export function saveExpenses(storage: KeyValueStorage, expenses: readonly Expense[]): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, expenses }));
    return true;
  } catch {
    return false; // e.g. quota exceeded: the app keeps working in memory
  }
}

/** Save whenever the expenses list changes. Returns the unsubscribe function. */
export function startPersistence(store: AppStore, storage: KeyValueStorage): () => void {
  let saved = store.getState().expenses.items;
  return store.subscribe(() => {
    const current = store.getState().expenses.items;
    if (current === saved) return; // unchanged (Redux returns the same array reference)
    saved = current;
    if (!saveExpenses(storage, current)) {
      console.warn('Trip Splitter: could not save to localStorage; changes will be lost on reload.');
    }
  });
}

/** The browser's localStorage, or null where accessing it throws (some privacy modes). */
export function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Build the app's store: saved expenses if valid, otherwise the sample data. */
export function createAppStore(storage: KeyValueStorage | null): AppStore {
  const sample = sampleTripData();
  const saved = storage === null ? null : loadExpenses(storage, sample.members);
  const store = makeStore({
    members: { list: sample.members },
    expenses: { items: saved ?? sample.expenses },
  });
  if (storage !== null) startPersistence(store, storage);
  return store;
}
