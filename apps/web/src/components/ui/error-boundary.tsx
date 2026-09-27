import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../../lib/logger';

export interface ErrorBoundaryProps {
  /** Shown instead of `children` after one of them throws while rendering. */
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Keeps a failing widget (a calendar, a table) from taking down the page.
 * React requires a class for this. It does not catch errors in event handlers
 * or async code; request errors go through `QueryState`.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportError(error, info);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
