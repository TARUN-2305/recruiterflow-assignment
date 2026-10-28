import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/renderApp';

const rows = () => screen.getAllByRole('row').slice(1); // skip the header row
const descriptions = () => rows().map((row) => within(row).getAllByRole('cell')[1]?.textContent);

describe('Expenses page with the sample data', () => {
  it('shows every member’s balance in the brief’s wording', () => {
    renderApp();
    const balances = within(screen.getByRole('region', { name: 'Balances' }));
    expect(balances.getByText('Aarav').nextSibling).toHaveTextContent('gets back ₹18,554.20');
    expect(balances.getByText('Diya').nextSibling).toHaveTextContent('owes ₹3,695.78');
    expect(balances.getByText('Kabir').nextSibling).toHaveTextContent('gets back ₹554.08');
    expect(balances.getByText('Meera').nextSibling).toHaveTextContent('owes ₹8,112.50');
    expect(balances.getByText('Rohan').nextSibling).toHaveTextContent('owes ₹7,300.00');
  });

  it('lists expenses newest first with all the required columns', () => {
    renderApp();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Date', 'Description', 'Category', 'Paid by', 'Amount', 'Split', 'Actions',
    ]);
    expect(descriptions()).toEqual([
      'Airport cab', 'Groceries', 'Scooter rental', 'Scuba diving', 'Beach shack dinner', 'Villa booking',
    ]);
    const cab = rows()[0];
    if (cab === undefined) throw new Error('missing row');
    expect(within(cab).getAllByRole('cell').map((c) => c.textContent).slice(0, 6)).toEqual([
      '15 Mar 2026', 'Airport cab', 'Travel', 'Aarav', '₹1,499.99', 'Percentages, 3 people',
    ]);
    expect(screen.getByText('Equally, 4 people')).toBeInTheDocument();
    expect(screen.getByText('Exact amounts, 3 people')).toBeInTheDocument();
    expect(screen.getByText(/Showing 6 expenses/)).toHaveTextContent('Total ₹42,249.99');
  });

  it('filters by category and totals only what is shown', async () => {
    const { user } = renderApp();
    await user.selectOptions(screen.getByLabelText('Category'), 'Food');
    expect(descriptions()).toEqual(['Groceries', 'Beach shack dinner']);
    expect(screen.getByText(/Showing 2 expenses/)).toHaveTextContent('Total ₹4,250.00');
  });

  it('shows an empty state when no expense is in the chosen category', async () => {
    const { user } = renderApp();
    await user.selectOptions(screen.getByLabelText('Category'), 'Other');
    expect(screen.getByText('No expenses in Other.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Show all categories' }));
    expect(rows()).toHaveLength(6);
  });
});

describe('deleting an expense', () => {
  it('does nothing if the user does not confirm', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { user, store } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Delete Groceries' }));

    expect(confirm).toHaveBeenCalledWith('Delete “Groceries” (₹1,000.00)? This cannot be undone.');
    expect(store.getState().expenses.items).toHaveLength(6);
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('removes the expense after confirmation and updates balances straight away', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user, store } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Delete Groceries' }));

    expect(screen.queryByText('Groceries')).not.toBeInTheDocument();
    expect(store.getState().expenses.items).toHaveLength(5);
    expect(screen.getByRole('status')).toHaveTextContent('Deleted “Groceries”.');
    // Meera paid for the groceries; without them she owes ₹1,000 more.
    expect(screen.getByText('owes ₹9,112.50')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'All expenses' })).toHaveFocus();
  });

  it('shows the empty state once every expense is deleted, and everyone is settled up', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { user } = renderApp();
    for (const name of ['Villa booking', 'Beach shack dinner', 'Scuba diving', 'Scooter rental', 'Groceries', 'Airport cab']) {
      await user.click(screen.getByRole('button', { name: `Delete ${name}` }));
    }
    expect(screen.getByText('No expenses yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add the first expense' })).toHaveAttribute('href', '/expenses/new');
    expect(screen.getAllByText('settled up')).toHaveLength(5);
  });
});
