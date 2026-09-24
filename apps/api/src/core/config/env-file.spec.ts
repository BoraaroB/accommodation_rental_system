import { describe, expect, it } from 'vitest';
import { envFilePathFor } from './env-file.js';

describe('envFilePathFor', () => {
  it.each([
    ['test', '.env.test'],
    ['development', '.env'],
    ['production', '.env'],
    [undefined, '.env'],
  ])('NODE_ENV=%s loads %s', (nodeEnv, file) => {
    expect(envFilePathFor(nodeEnv)).toBe(file);
  });
});
