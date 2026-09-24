import { stripVTControlCharacters } from 'node:util';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../config/env.schema.js';
import { RequestContextService } from '../request-context/request-context.service.js';
import { AppLoggerService } from './app-logger.service.js';

function createLogger(env: Pick<Env, 'LOG_LEVEL' | 'LOG_FORMAT'>) {
  const requestContext = new RequestContextService();
  const config = new ConfigService<Env, true>(env);
  return {
    logger: new AppLoggerService(config, requestContext),
    requestContext,
  };
}

function captureStdout() {
  return vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
}

function jsonLines(
  spy: ReturnType<typeof captureStdout>,
): Record<string, unknown>[] {
  return spy.mock.calls.map(
    ([chunk]) => JSON.parse(String(chunk)) as Record<string, unknown>,
  );
}

describe('AppLoggerService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds the request id to every line written during a request', () => {
    const { logger, requestContext } = createLogger({
      LOG_LEVEL: 'log',
      LOG_FORMAT: 'json',
    });
    const stdout = captureStdout();

    requestContext.run({ requestId: 'req-1' }, () => {
      logger.log('Tenant created', { tenantId: 't-1' }, 'TenantsService');
    });

    expect(jsonLines(stdout)).toEqual([
      expect.objectContaining({
        level: 'log',
        message: 'Tenant created',
        context: 'TenantsService',
        requestId: 'req-1',
        tenantId: 't-1',
      }),
    ]);
  });

  it('writes no request id outside a request', () => {
    const { logger } = createLogger({ LOG_LEVEL: 'log', LOG_FORMAT: 'json' });
    const stdout = captureStdout();

    logger.log('Listening', 'Bootstrap');

    expect(jsonLines(stdout)[0]).not.toHaveProperty('requestId');
  });

  it('skips levels below LOG_LEVEL', () => {
    const { logger } = createLogger({ LOG_LEVEL: 'warn', LOG_FORMAT: 'json' });
    const stdout = captureStdout();

    logger.log('not written');
    logger.debug('not written');
    logger.warn('written');

    expect(jsonLines(stdout).map((line) => line.message)).toEqual(['written']);
  });

  it('writes plain text in the pretty format', () => {
    const { logger, requestContext } = createLogger({
      LOG_LEVEL: 'log',
      LOG_FORMAT: 'pretty',
    });
    const stdout = captureStdout();

    requestContext.run({ requestId: 'req-2' }, () =>
      logger.log('Hello', 'Test'),
    );

    const line = stripVTControlCharacters(String(stdout.mock.calls[0]?.[0]));
    expect(line).toContain('Hello');
    expect(line).toContain("requestId: 'req-2'");
  });
});
