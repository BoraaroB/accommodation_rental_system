import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { retry } from './retry.js';

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the result of the first successful attempt', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('not ready'))
      .mockResolvedValueOnce('ok');
    const onRetry = vi.fn();

    const result = retry(operation, { attempts: 3, delayMs: 1000, onRetry });
    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledExactlyOnceWith(1, new Error('not ready'));
  });

  it('waits between attempts and throws the last error', async () => {
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValue(new Error('down'));

    const result = retry(operation, { attempts: 3, delayMs: 1000 });
    const assertion = expect(result).rejects.toThrow('down');
    await vi.advanceTimersByTimeAsync(999);
    expect(operation).toHaveBeenCalledTimes(2 - 1);
    await vi.advanceTimersByTimeAsync(2001);

    await assertion;
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
