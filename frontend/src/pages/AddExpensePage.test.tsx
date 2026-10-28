import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../services/persistence';
import { MemoryStorage, renderApp } from '../test/renderApp';

function savedExpenseCount(storage: MemoryStorage): number {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return 0;
  const parsed: unknown = JSON.parse(raw);
  return typeof parsed === 'object' && parsed !== null && 'expenses' in parsed && Array.isArray(parsed.expenses)
    ? parsed.expenses.length
    : -1;
}

describe('Add expense form: invalid input', () => {
  it('shows an error next to every invalid field and saves nothing', async () => {
    const storage = new MemoryStorage();
    const { user, store } = renderApp({ route: '/expenses/new', storage });

    await user.type(screen.getByLabelText('Amount (₹)'), '-5');
    for (const name of ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan']) {
      await user.click(screen.getByRole('checkbox', { name }));
    }
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Nothing has been saved yet');
    expect(screen.getByLabelText('Description')).toHaveAccessibleDescription(
      'Up to 60 characters. Description is required',
    );
    expect(screen.getByLabelText('Amount (₹)')).toHaveAccessibleDescription('Amount must be more than ₹0');
    expect(screen.getByLabelText('Paid by')).toHaveAccessibleDescription('Choose who paid');
    expect(screen.getByLabelText('Category')).toHaveAccessibleDescription('Choose a category');
    expect(screen.getByRole('group', { name: 'Split' })).toHaveAccessibleDescription(
      'Select at least one member to split between',
    );
    for (const field of ['Description', 'Amount (₹)', 'Paid by', 'Category']) {
      expect(screen.getByLabelText(field)).toHaveAttribute('aria-invalid', 'true');
    }

    // Focus goes to the first invalid field; nothing reached the store or storage.
    expect(screen.getByLabelText('Description')).toHaveFocus();
    expect(store.getState().expenses.items).toHaveLength(6);
    expect(savedExpenseCount(storage)).toBe(0);
    expect(screen.getByRole('heading', { level: 1, name: 'Add expense' })).toBeInTheDocument();
  });

  it('clears an error as soon as the field is fixed', async () => {
    const { user } = renderApp({ route: '/expenses/new' });
    await user.click(screen.getByRole('button', { name: 'Save expense' }));
    expect(screen.getByText('Description is required')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Description'), 'Ferry tickets');
    expect(screen.queryByText('Description is required')).not.toBeInTheDocument();
  });

  it('shows how much is left to assign for an exact split', async () => {
    const { user } = renderApp({ route: '/expenses/new' });
    await user.type(screen.getByLabelText('Amount (₹)'), '100');
    await user.click(screen.getByRole('radio', { name: 'Exact amounts' }));
    await user.type(screen.getByLabelText('Aarav (₹)'), '50');
    await user.type(screen.getByLabelText('Diya (₹)'), '37.50');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(screen.getByText('₹12.50 left to assign')).toBeInTheDocument();
  });

  it('flags a percentage over 100 next to that member', async () => {
    const { user } = renderApp({ route: '/expenses/new' });
    await user.click(screen.getByRole('radio', { name: 'Percentages' }));
    await user.type(screen.getByLabelText('Kabir (%)'), '120');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(screen.getByLabelText('Kabir (%)')).toHaveAccessibleDescription('Must be between 0 and 100');
  });
});

describe('Add expense form: valid input', () => {
  it('saves the expense, returns to Expenses with a message, and updates balances', async () => {
    const storage = new MemoryStorage();
    const { user, store } = renderApp({ route: '/expenses/new', storage });

    await user.type(screen.getByLabelText('Description'), 'Dinner at Thalassa');
    await user.type(screen.getByLabelText('Amount (₹)'), '1500');
    await user.selectOptions(screen.getByLabelText('Paid by'), 'Diya');
    await user.selectOptions(screen.getByLabelText('Category'), 'Food');
    // Equal split: everyone is selected by default.
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Expenses' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Added “Dinner at Thalassa” (₹1,500.00).');

    // Dated today, so it is the newest row.
    const firstRow = screen.getAllByRole('row')[1];
    if (firstRow === undefined) throw new Error('expected at least one expense row');
    expect(within(firstRow).getByText('Dinner at Thalassa')).toBeInTheDocument();
    expect(within(firstRow).getByText('Equally, 5 people')).toBeInTheDocument();

    // Diya paid ₹1,500 and owes ₹300 of it: -₹3,695.78 + ₹1,200 = owes ₹2,495.78.
    expect(screen.getByText('owes ₹2,495.78')).toBeInTheDocument();

    const added = store.getState().expenses.items.at(-1);
    expect(added).toMatchObject({
      description: 'Dinner at Thalassa',
      amount: 150_000,
      paidBy: 'm2',
      category: 'Food',
      split: { type: 'equal', memberIds: ['m1', 'm2', 'm3', 'm4', 'm5'] },
    });
    expect(savedExpenseCount(storage)).toBe(7);
  });

  it('saves a percentage split in the brief’s number format', async () => {
    const { user, store } = renderApp({ route: '/expenses/new' });
    await user.type(screen.getByLabelText('Description'), 'Boat trip');
    await user.type(screen.getByLabelText('Amount (₹)'), '1499.99');
    await user.selectOptions(screen.getByLabelText('Paid by'), 'Rohan');
    await user.selectOptions(screen.getByLabelText('Category'), 'Activities');
    await user.click(screen.getByRole('radio', { name: 'Percentages' }));
    await user.type(screen.getByLabelText('Aarav (%)'), '33.33');
    await user.type(screen.getByLabelText('Diya (%)'), '33.33');
    await user.type(screen.getByLabelText('Kabir (%)'), '33.34');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(store.getState().expenses.items.at(-1)?.split).toEqual({
      type: 'percent',
      shares: { m1: 33.33, m2: 33.33, m3: 33.34 },
    });
  });

  it('Cancel goes back to Expenses without saving', async () => {
    const { user, store } = renderApp({ route: '/expenses/new' });
    await user.type(screen.getByLabelText('Description'), 'Not saved');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Expenses' })).toBeInTheDocument();
    expect(store.getState().expenses.items).toHaveLength(6);
    expect(screen.queryByText('Not saved')).not.toBeInTheDocument();
  });
});
