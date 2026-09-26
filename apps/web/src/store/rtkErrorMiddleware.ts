import { isRejectedWithValue, type Middleware } from '@reduxjs/toolkit';
import {
  getErrorMessage,
  getErrorStatus,
  getRequestId,
  isServerOrNetworkError,
} from '../api/errors';
import { toastShown } from './uiSlice';

/**
 * Global handling of failed requests. Pages still show their own error state
 * through `QueryState`; this adds a toast for errors the user cannot fix on
 * the page: a missing permission, a server failure or no connection.
 */
export const rtkErrorMiddleware: Middleware = (api) => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const error = action.payload;
    if (getErrorStatus(error) === 403) {
      api.dispatch(
        toastShown({
          tone: 'danger',
          message: "You don't have permission to do that.",
        }),
      );
    } else if (isServerOrNetworkError(error)) {
      api.dispatch(
        toastShown({
          tone: 'danger',
          message: getErrorMessage(error),
          requestId: getRequestId(error),
        }),
      );
    }
  }
  return next(action);
};
