import { env } from '../config/env';

export interface ErrorReportInfo {
  /** React's component stack, when the error happened while rendering. */
  componentStack?: string | null;
}

/**
 * The single place client-side errors are reported: the React root error
 * hooks and the widget `ErrorBoundary` call it. A monitoring service (e.g.
 * Sentry) would be hooked in here.
 */
export function reportError(error: unknown, info?: ErrorReportInfo): void {
  if (env.isDevelopment && info?.componentStack) {
    console.error(error, info.componentStack);
    return;
  }
  console.error(error);
}
