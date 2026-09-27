import { isRejectedWithValue, type Middleware } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import {
  getErrorMessage,
  getErrorStatus,
  getRequestId,
  isServerOrNetworkError,
} from '../api/errors';

/**
 * Global handling of failed requests. Pages still show their own error state
 * through `QueryState`; this adds a toast for errors the user cannot fix on
 * the page: a missing permission, a server failure or no connection.
 */
export const rtkErrorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const error = action.payload;
    if (getErrorStatus(error) === 403) {
      toast.error("You don't have permission to do that.");
    } else if (isServerOrNetworkError(error)) {
      const requestId = getRequestId(error);
      toast.error(
        getErrorMessage(error),
        requestId ? { description: `Request id: ${requestId}` } : undefined,
      );
    }
  }
  return next(action);
};
