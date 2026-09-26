import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reportError } from '../../lib/logger';
import { ErrorBoundary } from './ErrorBoundary';

vi.mock('../../lib/logger', () => ({ reportError: vi.fn() }));

function Broken(): never {
  throw new Error('Calendar failed');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the error this test throws on purpose.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders its children when nothing fails', () => {
    render(
      <ErrorBoundary fallback={<p>Fallback</p>}>
        <p>Calendar</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(reportError).not.toHaveBeenCalled();
  });

  it('shows the fallback and reports the error when a child throws', () => {
    render(
      <>
        <h1>Listing</h1>
        <ErrorBoundary fallback={<p>Calendar unavailable</p>}>
          <Broken />
        </ErrorBoundary>
      </>,
    );
    expect(screen.getByText('Calendar unavailable')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Listing' }),
    ).toBeInTheDocument();
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Calendar failed' }),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });
});
