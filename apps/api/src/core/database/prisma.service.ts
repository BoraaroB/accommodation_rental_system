import {
  Injectable,
  Logger,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { Env } from '../config/env.schema.js';
import { retry } from './retry.js';

/** How long the API waits for the database at startup: 10 attempts, 1 s apart. */
const CONNECT_ATTEMPTS = 10;
const CONNECT_RETRY_DELAY_MS = 1000;

/**
 * Why a connection failed: the driver or Prisma error code (e.g. ECONNREFUSED,
 * 28P01). With the pg adapter the message is empty, and the code never holds
 * connection details.
 */
function errorCodeOf(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : 'unknown error';
}

/**
 * The app's one Prisma client, connected through the `pg` driver adapter.
 * Repositories inject it; nothing else touches the database.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow('DATABASE_URL', { infer: true }),
      }),
      // Plain messages without colours or a source excerpt. A validation error
      // still prints the query's arguments, so PrismaExceptionFilter logs it
      // without its message.
      errorFormat: 'minimal',
    });
  }

  /**
   * `$connect` only creates the connection pool; the first query opens a
   * connection. It is retried while the database starts, and a database that
   * stays unreachable (or rejects the credentials) fails the boot.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
    try {
      await retry(() => this.$queryRaw`SELECT 1`, {
        attempts: CONNECT_ATTEMPTS,
        delayMs: CONNECT_RETRY_DELAY_MS,
        onRetry: (attempt, error) =>
          this.logger.warn(
            `Database not reachable (${errorCodeOf(error)}), retrying (${attempt}/${CONNECT_ATTEMPTS})`,
          ),
      });
    } catch (error) {
      throw new Error(
        `Database not reachable after ${CONNECT_ATTEMPTS} attempts (${errorCodeOf(error)})`,
        { cause: error },
      );
    }
  }

  /**
   * Runs after the HTTP server has closed, so requests still in flight during
   * shutdown keep their connection.
   */
  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();
  }
}
