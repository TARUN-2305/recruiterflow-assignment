import { useNavigate } from 'react-router';
import { usePageHeading } from '../app/usePageHeading';
import { localToday } from '../domain/dates';
import { formatINR } from '../domain/format';
import type { Expense } from '../domain/types';
import { AddExpenseForm } from '../features/expenses/AddExpenseForm';
import { expenseAdded } from '../store/expensesSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectMembers } from '../store/selectors';

export function AddExpensePage() {
  const headingRef = usePageHeading('Add expense');
  const members = useAppSelector(selectMembers);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSave = (expense: Expense): void => {
    dispatch(expenseAdded(expense));
    void navigate('/', {
      state: { notice: `Added “${expense.description}” (${formatINR(expense.amount)}).` },
    });
  };

  return (
    <section className="page">
      <h1 ref={headingRef} tabIndex={-1}>
        Add expense
      </h1>
      <AddExpenseForm
        members={members}
        today={localToday()}
        createId={() => crypto.randomUUID()}
        onSave={handleSave}
        onCancel={() => void navigate('/')}
      />
    </section>
  );
}
