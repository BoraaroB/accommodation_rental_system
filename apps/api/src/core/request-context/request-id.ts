import type { ServerResponse } from 'node:http';

export const REQUEST_ID_HEADER = 'x-request-id';

/** The request id assigned by `RequestIdMiddleware`, read back from the response header. */
export function readRequestId(res: ServerResponse): string | undefined {
  const value = res.getHeader(REQUEST_ID_HEADER);
  return typeof value === 'string' ? value : undefined;
}
