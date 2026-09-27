import { vi } from 'vitest';
import { env } from '../config/env';

/**
 * Stubbed responses by `"<METHOD> <path>"`, the path relative to the API base
 * URL. A value is a body (sent as 200 JSON), a `Response`, or a function of
 * the request URL (and the request, e.g. for its headers or body) that
 * returns either, or a promise of either.
 */
export type StubRoutes = Record<string, unknown>;

export interface StubbedApi {
  /** The query of the last request to `path`, e.g. `{ city: 'Split' }`. */
  lastQuery(path: string): Record<string, string> | undefined;
  /** How many requests went to `path`. */
  requestCount(path: string): number;
}

const basePath = new URL(env.apiBaseUrl).pathname;
let unexpectedRequests: string[] = [];

/** A JSON response with a status, e.g. an API error body. */
export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** An error body in the API's format (`apiErrorSchema`). */
export function apiErrorBody(
  statusCode: number,
  code: string,
  message: string,
) {
  return {
    statusCode,
    error: 'Error',
    code,
    message,
    path: '/api/v1/test',
    timestamp: '2026-09-26T10:00:00.000Z',
    requestId: 'req-test',
  };
}

function relativePath(url: URL): string {
  return url.pathname.startsWith(basePath)
    ? url.pathname.slice(basePath.length)
    : url.pathname;
}

/**
 * Replaces `fetch` with `routes`; a request to any other route is recorded
 * as unexpected and fails the test after it ends.
 */
export function stubApi(routes: StubRoutes): StubbedApi {
  const requests: URL[] = [];

  vi.stubGlobal(
    'fetch',
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const url = new URL(request.url);
      const route = `${request.method} ${relativePath(url)}`;
      requests.push(url);

      if (!(route in routes)) {
        unexpectedRequests.push(route);
        return jsonResponse(500, apiErrorBody(500, 'UNSTUBBED', route));
      }
      const handler = routes[route];
      const result =
        typeof handler === 'function' ? await handler(url, request) : handler;
      return result instanceof Response ? result : jsonResponse(200, result);
    },
  );

  const requestsTo = (path: string) =>
    requests.filter((url) => relativePath(url) === path);

  return {
    lastQuery: (path) => {
      const last = requestsTo(path).at(-1);
      return last && Object.fromEntries(last.searchParams);
    },
    requestCount: (path) => requestsTo(path).length,
  };
}

/** Every test starts with an API that has no routes. */
export function resetApiStub(): void {
  unexpectedRequests = [];
  stubApi({});
}

/** Fails the test that sent a request no route answers. */
export function assertNoUnexpectedRequests(): void {
  const unexpected = unexpectedRequests;
  unexpectedRequests = [];
  if (unexpected.length > 0) {
    throw new Error(
      `Requests without a stubbed route: ${unexpected.join(', ')}`,
    );
  }
}
