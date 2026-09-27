import { isRejectedWithValue, type Middleware } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import {
  getErrorMessage,
  getErrorStatus,
  getRequestId,
  isServerOrNetworkError,
} from '../api/errors';
import { selectToken, signedOut } from './authSlice';

/**
 * Global handling of failed requests. Pages still show their own error state
 * through `QueryState`; this adds a toast for errors the user cannot fix on
 * the page: a missing permission, a server failure or no connection. A 401
 * while signed in means the token expired or its user is gone: the user is
 * signed out, and protected pages send them to sign in again. A 401 from a
 * sign-in attempt comes without a token and is left to the form.
 */
export const rtkErrorMiddleware: Middleware = (api) => (next) => (action) => {
  // The failed request reaches the store first; a sign-out then clears it
  // with the rest of the cache.
  const result = next(action);
  if (isRejectedWithValue(action)) {
    const error = action.payload;
    const status = getErrorStatus(error);
    if (status === 401 && selectToken(api.getState()) !== null) {
      api.dispatch(signedOut());
      toast.info('Your session has expired. Sign in again.');
    } else if (status === 403) {
      toast.error("You don't have permission to do that.");
    } else if (isServerOrNetworkError(error)) {
      const requestId = getRequestId(error);
      toast.error(
        getErrorMessage(error),
        requestId ? { description: `Request id: ${requestId}` } : undefined,
      );
    }
  }
  return result;
};
