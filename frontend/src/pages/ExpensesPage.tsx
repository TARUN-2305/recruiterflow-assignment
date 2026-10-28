import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { usePageHeading } from '../app/usePageHeading';
import { filterByCategory, totalOf, type CategoryFilter } from '../domain/expenses';
import { formatINR } from '../domain/format';
import { CATEGORIES, isCategory, type Expense } from '../domain/types';
import { BalancesList } from '../features/expenses/BalancesList';
import { ExpensesTable } from '../features/expenses/ExpensesTable';
import { expenseDeleted } from '../store/expensesSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectBalances, selectMemberNames, selectSortedExpenses } from '../store/selectors';

/** The one-off message passed by the Add expense page through router state. */
function noticeFrom(state: unknown): string | null {
  return typeof state === 'object' && state !== null && 'notice' in state && typeof state.notice === 'string'
    ? state.notice
    : null;
}

export function ExpensesPage() {
  const headingRef = usePageHeading('Expenses');
  const expensesHeadingRef = useRef<HTMLHeadingElement>(null);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const expenses = useAppSelector(selectSortedExpenses);
  const balances = useAppSelector(selectBalances);
  const memberNames = useAppSelector(selectMemberNames);

  // View-only state lives in the component, not in Redux.
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [notice, setNotice] = useState<string | null>(() => noticeFrom(location.state));

  // Clear the router state once read, so a reload or Back does not show the message again.
  useEffect(() => {
    if (noticeFrom(location.state) !== null) {
      void navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  const shown = useMemo(() => filterByCategory(expenses, category), [expenses, category]);

  const handleDelete = (expense: Expense): void => {
    const confirmed = window.confirm(
      `Delete “${expense.description}” (${formatINR(expense.amount)})? This cannot be undone.`,
    );
    if (!confirmed) return;
    dispatch(expenseDeleted(expense.id));
    setNotice(`Deleted “${expense.description}”.`);
    expensesHeadingRef.current?.focus(); // the focused Delete button no longer exists
  };

  return (
    <div className="page">
      <h1 ref={headingRef} tabIndex={-1}>
        Expenses
      </h1>

      <div className="notice-region" role="status">
        {notice !== null && (
          <p className="notice">
            <span>{notice}</span>
            <button type="button" className="button button--small" onClick={() => { setNotice(null); }}>
              Dismiss
            </button>
          </p>
        )}
      </div>

      <section aria-labelledby="balances-heading" className="card">
        <h2 id="balances-heading">Balances</h2>
        <BalancesList balances={balances} />
      </section>

      <section aria-labelledby="expenses-heading" className="card">
        <div className="section-header">
          <h2 id="expenses-heading" ref={expensesHeadingRef} tabIndex={-1}>
            All expenses
          </h2>
          {expenses.length > 0 && (
            <div className="filter">
              <label htmlFor="category-filter">Category</label>
              <select
                id="category-filter"
                value={category}
                onChange={(e) => {
                  const value = e.target.value;
                  setCategory(isCategory(value) ? value : 'All');
                }}
              >
                <option value="All">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {expenses.length === 0 ? (
          <div className="empty-state">
            <p>No expenses yet.</p>
            <Link to="/expenses/new" className="button button--primary">
              Add the first expense
            </Link>
          </div>
        ) : shown.length === 0 ? (
          <div className="empty-state">
            <p>No expenses in {category}.</p>
            <button type="button" className="button" onClick={() => { setCategory('All'); }}>
              Show all categories
            </button>
          </div>
        ) : (
          <>
            <p className="summary" aria-live="polite">
              Showing {shown.length} {shown.length === 1 ? 'expense' : 'expenses'} · Total{' '}
              <strong>{formatINR(totalOf(shown))}</strong>
            </p>
            <ExpensesTable expenses={shown} memberNames={memberNames} onDelete={handleDelete} />
          </>
        )}
      </section>
    </div>
  );
}
