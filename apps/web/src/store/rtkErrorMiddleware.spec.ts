import { createAsyncThunk } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import { makeStore } from './store';
import { MAX_TOASTS } from './uiSlice';

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

async function toastsAfter(error: unknown) {
  const store = makeStore();
  await store.dispatch(failingRequest(error));
  return store.getState().ui.toasts;
}

describe('rtkErrorMiddleware', () => {
  it('shows a permission toast on 403', async () => {
    expect(await toastsAfter(apiError(403))).toEqual([
      expect.objectContaining({
        tone: 'danger',
        message: "You don't have permission to do that.",
      }),
    ]);
  });

  it('shows the message and request id on 5xx', async () => {
    expect(await toastsAfter(apiError(500))).toEqual([
      expect.objectContaining({
        message: 'failed with 500',
        requestId: 'req-500',
      }),
    ]);
  });

  it('shows a toast when the server cannot be reached', async () => {
    const [toast] = await toastsAfter({
      status: 'FETCH_ERROR',
      error: 'offline',
    });
    expect(toast.message).toMatch(/could not be reached/);
  });

  it('shows a toast when a proxy answers 502 with an HTML page', async () => {
    const [toast] = await toastsAfter({
      status: 'PARSING_ERROR',
      originalStatus: 502,
      data: '<html>Bad Gateway</html>',
      error: 'SyntaxError: Unexpected token <',
    });
    expect(toast.message).toBe('The request failed (HTTP 502).');
  });

  it.each([400, 404, 409])('leaves %i to the page', async (status) => {
    expect(await toastsAfter(apiError(status))).toEqual([]);
  });

  it(`keeps at most ${MAX_TOASTS} toasts, the newest`, async () => {
    const store = makeStore();
    for (const status of [500, 501, 502, 503]) {
      await store.dispatch(failingRequest(apiError(status)));
    }
    expect(store.getState().ui.toasts.map((toast) => toast.requestId)).toEqual([
      'req-501',
      'req-502',
      'req-503',
    ]);
  });
});
