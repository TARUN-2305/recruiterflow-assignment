import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

describe('navigation', () => {
  it('marks Expenses as the current page on /', () => {
    renderApp({ route: '/' });
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(screen.getByRole('heading', { level: 1, name: 'Expenses' })).toBeInTheDocument();
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Expenses');
    expect(screen.getByRole('link', { name: 'Expenses' })).toHaveClass('nav-link--active');
    expect(screen.getByRole('link', { name: 'Add expense' })).not.toHaveClass('nav-link--active');
  });

  it('marks Add expense as the current page on /expenses/new', () => {
    renderApp({ route: '/expenses/new' });
    expect(screen.getByRole('heading', { level: 1, name: 'Add expense' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add expense' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Expenses' })).not.toHaveAttribute('aria-current');
  });

  it('moves between pages with the navbar links', async () => {
    const { user } = renderApp({ route: '/' });
    await user.click(screen.getByRole('link', { name: 'Add expense' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Add expense' })).toHaveFocus();
    await user.click(screen.getByRole('link', { name: 'Expenses' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Expenses' })).toBeInTheDocument();
  });

  it('shows Page not found for any other URL, with a link back to Expenses', async () => {
    const { user } = renderApp({ route: '/no/such/page' });
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Back to Expenses' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Expenses' })).toBeInTheDocument();
  });
});
