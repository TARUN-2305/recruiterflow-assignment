// Ordering, filtering and totals for the Expenses table.

import type { Category, Expense, Paise } from './types';

export type CategoryFilter = Category | 'All';

/**
 * Newest date first. Expenses on the same date keep "most recently added first", using their
 * position in the stored list (which is insertion order), so the order is always deterministic.
 */
export function sortNewestFirst(expenses: readonly Expense[]): Expense[] {
  return expenses
    .map((expense, index) => ({ expense, index }))
    .sort((a, b) =>
      a.expense.date === b.expense.date
        ? b.index - a.index
        : a.expense.date < b.expense.date
          ? 1
          : -1,
    )
    .map(({ expense }) => expense);
}

export function filterByCategory(expenses: readonly Expense[], category: CategoryFilter): Expense[] {
  return category === 'All' ? [...expenses] : expenses.filter((e) => e.category === category);
}

export function totalOf(expenses: readonly Expense[]): Paise {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}
