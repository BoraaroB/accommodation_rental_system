import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { REQUEST_ID_HEADER } from './request-id.js';
import { RequestIdMiddleware } from './request-id.middleware.js';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function handle(incomingId?: string) {
  const req = {
    header: vi.fn().mockReturnValue(incomingId),
  } as unknown as Request;
  const res = { setHeader: vi.fn() };
  const next = vi.fn();
  new RequestIdMiddleware().use(
    req,
    res as unknown as Response,
    next as unknown as NextFunction,
  );
  expect(next).toHaveBeenCalledOnce();
  return res.setHeader.mock.calls[0] as [string, string] | undefined;
}

describe('RequestIdMiddleware', () => {
  it('keeps a well-formed id sent by the client', () => {
    expect(handle('client-trace-42')).toEqual([
      REQUEST_ID_HEADER,
      'client-trace-42',
    ]);
  });

  it.each([undefined, '', 'has spaces', 'line\nbreak', 'x'.repeat(129)])(
    'generates a UUID when the client sends %j',
    (incomingId) => {
      const header = handle(incomingId);
      expect(header?.[0]).toBe(REQUEST_ID_HEADER);
      expect(header?.[1]).toMatch(UUID);
    },
  );
});
