import { combineReducers, configureStore } from '@reduxjs/toolkit';
import expensesReducer from './expensesSlice';
import membersReducer from './membersSlice';

const rootReducer = combineReducers({
  members: membersReducer,
  expenses: expensesReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState });
}

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
