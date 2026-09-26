import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { makeStore, type AppStore } from '../store/store';

/** Renders `ui` inside a fresh Redux store and returns both. */
export function renderWithStore(
  ui: ReactElement,
  store: AppStore = makeStore(),
) {
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}
