import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithStore } from '../test/renderWithStore';
import { TOAST_DURATION_MS, Toasts } from './Toasts';
import { toastShown } from '../store/uiSlice';

describe('Toasts', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a toast with its request id and dismisses it on click', async () => {
    const { store } = renderWithStore(<Toasts />);
    act(() => {
      store.dispatch(
        toastShown({
          tone: 'danger',
          message: 'Server error',
          requestId: 'req-1',
        }),
      );
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    expect(screen.getByText('req-1')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('dismisses a toast by itself after a while', () => {
    vi.useFakeTimers();
    const { store } = renderWithStore(<Toasts />);
    act(() => {
      store.dispatch(toastShown({ tone: 'success', message: 'Saved' }));
    });
    expect(screen.getByRole('status')).toHaveTextContent('Saved');

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(store.getState().ui.toasts).toEqual([]);
  });
});
