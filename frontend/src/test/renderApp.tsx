import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { App } from '../app/App';
import { createAppStore, type KeyValueStorage } from '../services/persistence';

/** In-memory stand-in for localStorage. */
export class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

/** Renders the whole app exactly as main.tsx does, but with a memory router and storage. */
export function renderApp({ route = '/', storage = new MemoryStorage() }: { route?: string; storage?: KeyValueStorage | null } = {}) {
  const store = createAppStore(storage);
  const user = userEvent.setup();
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <App />
      </MemoryRouter>
    </Provider>,
  );
  return { ...view, store, storage, user };
}
