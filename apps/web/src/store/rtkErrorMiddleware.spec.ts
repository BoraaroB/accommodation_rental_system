import { createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { selectToken } from './authSlice';
import { makeStore } from './store';

// A request that fails the way RTK Query's do: rejected with the error as the value.
const failingRequest = createAsyncThunk(
  'test/request',
  (error: unknown, { rejectWithValue }) => rejectWithValue(error),
);

const apiError = (statusCode: number) => ({
  status: statusCode,
  data: {
    statusCode,
    error: 'Error',
    code: 'SOME_ERROR',
    message: `failed with ${statusCode}`,
    path: '/api/v1/x',
    timestamp: '2026-09-26T10:00:00.000Z',
    requestId: `req-${statusCode}`,
  },
});

/** The error toasts shown after one failed request. */
async function toastsAfter(error: unknown) {
  const showError = vi.spyOn(toast, 'error').mockImplementation(() => 1);
  await makeStore().dispatch(failingRequest(error));
  return showError.mock.calls;
}

describe('rtkErrorMiddleware', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a permission toast on 403', async () => {
    expect(await toastsAfter(apiError(403))).toEqual([
      ["You don't have permission to do that."],
    ]);
  });

  it('shows the message and request id on 5xx', async () => {
    expect(await toastsAfter(apiError(500))).toEqual([
      ['failed with 500', { description: 'Request id: req-500' }],
    ]);
  });

  it('shows a toast when the server cannot be reached', async () => {
    const [[message]] = await toastsAfter({
      status: 'FETCH_ERROR',
      error: 'offline',
    });
    expect(message).toMatch(/could not be reached/);
  });

  it('shows a toast when a proxy answers 502 with an HTML page', async () => {
    expect(
      await toastsAfter({
        status: 'PARSING_ERROR',
        originalStatus: 502,
        data: '<html>Bad Gateway</html>',
        error: 'SyntaxError: Unexpected token <',
      }),
    ).toEqual([['The request failed (HTTP 502).', undefined]]);
  });

  it.each([400, 404, 409])('leaves %i to the page', async (status) => {
    expect(await toastsAfter(apiError(status))).toEqual([]);
  });

  it('signs out on 401 while signed in: the token expired', async () => {
    const showInfo = vi.spyOn(toast, 'info').mockImplementation(() => 1);
    const store = makeStore({ token: 'expired-token' });
    await store.dispatch(failingRequest(apiError(401)));

    expect(selectToken(store.getState())).toBeNull();
    expect(showInfo.mock.calls).toEqual([
      ['Your session has expired. Sign in again.'],
    ]);
  });

  it('leaves a 401 without a token (a failed sign-in) to the form', async () => {
    const showInfo = vi.spyOn(toast, 'info').mockImplementation(() => 1);
    expect(await toastsAfter(apiError(401))).toEqual([]);
    expect(showInfo).not.toHaveBeenCalled();
  });
});
