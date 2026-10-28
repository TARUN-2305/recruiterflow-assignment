import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { sampleTripData } from '../data/sampleData';
import type { Expense } from '../domain/types';

export interface ExpensesState {
  /** In insertion order; the newest-first view is derived by a selector. */
  items: Expense[];
}

const initialState: ExpensesState = { items: sampleTripData().expenses };

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    /** The payload is an expense that has already passed validateExpenseDraft. */
    expenseAdded(state, action: PayloadAction<Expense>) {
      state.items.push(action.payload);
    },
    expenseDeleted(state, action: PayloadAction<string>) {
      state.items = state.items.filter((expense) => expense.id !== action.payload);
    },
  },
});

export const { expenseAdded, expenseDeleted } = expensesSlice.actions;
export default expensesSlice.reducer;
