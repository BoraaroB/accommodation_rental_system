import type { LogLevel } from '@nestjs/common';

/** Nest log levels, from the most to the least severe. */
export const LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
] as const satisfies readonly LogLevel[];

/** The levels written when `minimum` is the least severe one enabled. */
export function logLevelsFrom(minimum: LogLevel): LogLevel[] {
  return LOG_LEVELS.slice(0, LOG_LEVELS.indexOf(minimum) + 1);
}
