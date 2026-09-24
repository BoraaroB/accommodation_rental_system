import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REQUEST_ID_HEADER } from '../request-context/request-id.js';
import { RequestLoggerMiddleware } from './request-logger.middleware.js';

function finishRequest(
  statusCode: number,
  finished = true,
  user?: { id: string; email: string },
) {
  const middleware = new RequestLoggerMiddleware();
  const req = {
    method: 'GET',
    originalUrl: '/api/v1/t/adriatic/listings?page=2',
    headers: { authorization: 'Bearer secret-token' },
    user,
  } as unknown as Request;
  const res = Object.assign(new EventEmitter(), {
    statusCode,
    writableFinished: finished,
    getHeader: (name: string) =>
      name === REQUEST_ID_HEADER ? 'req-7' : undefined,
  });
  const next = vi.fn();

  middleware.use(req, res as unknown as Response, next);
  res.emit('close');
  return { next };
}

describe('RequestLoggerMiddleware', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    [200, 'log'],
    [304, 'log'],
    [404, 'warn'],
    [500, 'error'],
    [503, 'error'],
  ] as const)('logs a %i response as %s', (statusCode, level) => {
    const spy = vi
      .spyOn(Logger.prototype, level)
      .mockImplementation(() => undefined);

    const { next } = finishRequest(statusCode);

    expect(next).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledOnce();
    const [line, params] = spy.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(line).toMatch(
      new RegExp(`^GET /api/v1/t/adriatic/listings ${statusCode} \\d+ms$`),
    );
    expect(params).toEqual({ requestId: 'req-7' });
  });

  it('logs a request the client aborted as a warning', () => {
    const spy = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    finishRequest(200, false);

    expect(spy).toHaveBeenCalledWith(
      expect.stringMatching(
        /^GET \/api\/v1\/t\/adriatic\/listings aborted by the client \d+ms$/,
      ),
      { requestId: 'req-7' },
    );
  });

  it("adds the signed-in user's id, and nothing else about the user", () => {
    const spy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    finishRequest(200, true, { id: 'user-42', email: 'guest@example.com' });

    expect(spy).toHaveBeenCalledWith(expect.any(String), {
      requestId: 'req-7',
      userId: 'user-42',
    });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('guest@example.com');
  });

  it('never logs request headers or the query string', () => {
    const spies = (['log', 'warn', 'error'] as const).map((level) =>
      vi.spyOn(Logger.prototype, level).mockImplementation(() => undefined),
    );

    finishRequest(401);

    const written = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(written).not.toContain('secret-token');
    expect(written).not.toContain('page=2');
  });
});
