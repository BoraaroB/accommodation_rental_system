import { describe, expect, it } from 'vitest';
import { logLevelsFrom } from './log-levels.js';

describe('logLevelsFrom', () => {
  it.each([
    ['fatal', ['fatal']],
    ['warn', ['fatal', 'error', 'warn']],
    ['log', ['fatal', 'error', 'warn', 'log']],
    ['verbose', ['fatal', 'error', 'warn', 'log', 'debug', 'verbose']],
  ] as const)('%s enables %j', (minimum, levels) => {
    expect(logLevelsFrom(minimum)).toEqual(levels);
  });
});
