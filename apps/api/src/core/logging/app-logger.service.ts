import { ConsoleLogger, Injectable, type LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.schema.js';
import { RequestContextService } from '../request-context/request-context.service.js';
import { logLevelsFrom } from './log-levels.js';

/**
 * The built-in `ConsoleLogger`, configured from the env (`LOG_LEVEL`,
 * `LOG_FORMAT`), that adds the current request id to every line written while
 * a request is handled. JSON lines carry it as a top-level `requestId` field.
 */
@Injectable()
export class AppLoggerService extends ConsoleLogger {
  constructor(
    config: ConfigService<Env, true>,
    private readonly requestContext: RequestContextService,
  ) {
    const json = config.getOrThrow('LOG_FORMAT', { infer: true }) === 'json';
    super({
      logLevels: logLevelsFrom(config.getOrThrow('LOG_LEVEL', { infer: true })),
      json,
      flattenParams: json,
    });
  }

  protected override printMessages(
    messages: unknown[],
    context?: string,
    logLevel?: LogLevel,
    writeStreamType?: 'stdout' | 'stderr',
    errorStack?: unknown,
    params?: Record<string, unknown>,
  ): void {
    const requestId = this.requestContext.requestId;
    super.printMessages(
      messages,
      context,
      logLevel,
      writeStreamType,
      errorStack,
      requestId === undefined ? params : { requestId, ...params },
    );
  }
}
