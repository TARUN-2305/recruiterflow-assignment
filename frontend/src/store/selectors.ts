// Derived data is computed from members + expenses and never stored, so it cannot go stale.
// createSelector memoises: balances are only recomputed when expenses or members change.

import { createSelector } from '@reduxjs/toolkit';
import { computeBalances } from '../domain/balances';
import { sortNewestFirst } from '../domain/expenses';
import type { RootState } from './index';

export const selectMembers = (state: RootState) => state.members.list;
export const selectExpenses = (state: RootState) => state.expenses.items;

export const selectSortedExpenses = createSelector([selectExpenses], (expenses) =>
  sortNewestFirst(expenses),
);

export const selectBalances = createSelector([selectMembers, selectExpenses], (members, expenses) =>
  computeBalances(members, expenses),
);

export const selectMemberNames = createSelector(
  [selectMembers],
  (members) => new Map(members.map((m) => [m.id, m.name])),
);
