import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QueryState, type QueryStateQuery } from './query-state';

function renderQuery(query: QueryStateQuery<string[]>) {
  return render(
    <QueryState query={query} isEmpty={(items) => items.length === 0}>
      {(items) => (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </QueryState>,
  );
}

const idle = { isError: false, refetch: vi.fn() };

describe('QueryState', () => {
  it('shows the loading state until data arrives', () => {
    const { container } = renderQuery(idle);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('shows the error with its request id and retries', async () => {
    const refetch = vi.fn();
    renderQuery({
      isError: true,
      refetch,
      error: {
        status: 500,
        data: {
          statusCode: 500,
          error: 'Internal Server Error',
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
          path: '/api/v1/tenants',
          timestamp: '2026-09-26T10:00:00.000Z',
          requestId: 'req-9',
        },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Internal server error',
    );
    expect(screen.getByText('req-9')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('keeps the data when a refresh for the same arguments fails', () => {
    renderQuery({
      isError: true,
      refetch: vi.fn(),
      error: { status: 'FETCH_ERROR', error: 'offline' },
      data: ['Belgrade'],
      currentData: ['Belgrade'],
    });
    expect(screen.getByRole('listitem')).toHaveTextContent('Belgrade');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the error, not the previous results, when new arguments fail', () => {
    renderQuery({
      isError: true,
      refetch: vi.fn(),
      error: { status: 'FETCH_ERROR', error: 'offline' },
      data: ['Belgrade'],
    });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('shows the empty state for empty data', () => {
    renderQuery({ ...idle, data: [] });
    expect(screen.getByText('Nothing to show yet')).toBeInTheDocument();
  });

  it('renders the data', () => {
    renderQuery({ ...idle, data: ['Belgrade', 'Split'] });
    expect(
      screen.getAllByRole('listitem').map((item) => item.textContent),
    ).toEqual(['Belgrade', 'Split']);
  });
});
