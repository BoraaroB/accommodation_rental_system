import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { apiErrorSchema, type ApiError } from '@ars/shared';

/** What an RTK Query hook or a rejected request carries as `error`. */
export type RequestError = FetchBaseQueryError | SerializedError;

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

export function isFetchBaseQueryError(
  error: unknown,
): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

/** The API's error body (`apiErrorSchema`), when the response carried one. */
export function getApiError(error: unknown): ApiError | undefined {
  if (!isFetchBaseQueryError(error)) {
    return undefined;
  }
  const body = apiErrorSchema.safeParse(error.data);
  return body.success ? body.data : undefined;
}

/** The HTTP status of a failed request; `undefined` when no response arrived. */
export function getErrorStatus(error: unknown): number | undefined {
  if (!isFetchBaseQueryError(error)) {
    return undefined;
  }
  if (typeof error.status === 'number') {
    return error.status;
  }
  // A body that is not JSON (e.g. a proxy's HTML 502 page) cannot be parsed;
  // RTK Query keeps the response status in `originalStatus`.
  return error.status === 'PARSING_ERROR' ? error.originalStatus : undefined;
}

/** The request id to quote to support, when the API answered with an error body. */
export function getRequestId(error: unknown): string | undefined {
  return getApiError(error)?.requestId;
}

/** `true` when the server failed (5xx) or could not be reached at all. */
export function isServerOrNetworkError(error: unknown): boolean {
  if (!isFetchBaseQueryError(error)) {
    return false;
  }
  const status = getErrorStatus(error);
  return status === undefined
    ? error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR'
    : status >= 500;
}

/**
 * A message for the user. The only place that narrows RTK's error union and
 * parses the API's error body.
 */
export function getErrorMessage(error: unknown): string {
  const apiError = getApiError(error);
  if (apiError) {
    return Array.isArray(apiError.message)
      ? apiError.message.join(' ')
      : apiError.message;
  }
  if (isFetchBaseQueryError(error)) {
    if (error.status === 'FETCH_ERROR') {
      return 'The server could not be reached. Check your connection and try again.';
    }
    if (error.status === 'TIMEOUT_ERROR') {
      return 'The server took too long to answer. Please try again.';
    }
    const status = getErrorStatus(error);
    return status !== undefined && status >= 400
      ? `The request failed (HTTP ${status}).`
      : 'The server sent an unexpected response.';
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as SerializedError;
    if (message) {
      return message;
    }
  }
  return FALLBACK_MESSAGE;
}
