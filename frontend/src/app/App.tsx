import { Route, Routes } from 'react-router';
import { AddExpensePage } from '../pages/AddExpensePage';
import { ExpensesPage } from '../pages/ExpensesPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { Layout } from './Layout';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ExpensesPage />} />
        <Route path="expenses/new" element={<AddExpensePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
