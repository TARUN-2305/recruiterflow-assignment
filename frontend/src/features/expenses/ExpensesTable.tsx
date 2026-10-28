import { describeSplit, formatDate, formatINR } from '../../domain/format';
import type { Expense, MemberId } from '../../domain/types';

interface ExpensesTableProps {
  expenses: Expense[];
  memberNames: ReadonlyMap<MemberId, string>;
  onDelete: (expense: Expense) => void;
}

export function ExpensesTable({ expenses, memberNames, onDelete }: ExpensesTableProps) {
  return (
    // Scrolls sideways on narrow screens; focusable so keyboard users can scroll it too.
    <div className="table-scroll" role="region" aria-label="Expenses table" tabIndex={0}>
      <table className="expenses-table">
        <caption className="visually-hidden">Expenses, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Description</th>
            <th scope="col">Category</th>
            <th scope="col">Paid by</th>
            <th scope="col" className="num">
              Amount
            </th>
            <th scope="col">Split</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td>
                <time dateTime={expense.date}>{formatDate(expense.date)}</time>
              </td>
              <td>{expense.description}</td>
              <td>{expense.category}</td>
              <td>{memberNames.get(expense.paidBy) ?? expense.paidBy}</td>
              <td className="num">{formatINR(expense.amount)}</td>
              <td>{describeSplit(expense.split)}</td>
              <td>
                <button
                  type="button"
                  className="button button--small button--danger"
                  aria-label={`Delete ${expense.description}`}
                  onClick={() => { onDelete(expense); }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
