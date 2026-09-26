import { isRouteErrorResponse } from 'react-router';
import { env } from '../../config/env';

export interface RouteErrorDescription {
  isNotFound: boolean;
  message: string;
}

const GENERIC_MESSAGE = 'An unexpected error occurred.';

/**
 * Turns whatever a route threw (a response, an `Error`, anything) into text.
 * An exception's own message is shown only in development.
 */
export function describeRouteError(error: unknown): RouteErrorDescription {
  if (isRouteErrorResponse(error)) {
    return {
      isNotFound: error.status === 404,
      message: `${error.status} ${error.statusText}`.trim(),
    };
  }
  if (env.isDevelopment && error instanceof Error && error.message) {
    return { isNotFound: false, message: error.message };
  }
  return { isNotFound: false, message: GENERIC_MESSAGE };
}
