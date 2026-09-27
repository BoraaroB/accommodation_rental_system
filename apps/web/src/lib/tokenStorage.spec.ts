import { afterEach, describe, expect, it, vi } from 'vitest';
import { TOKEN_KEY, tokenStorage } from './tokenStorage';

describe('tokenStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps, reads and clears the token', () => {
    tokenStorage.save('token-1');
    expect(tokenStorage.read()).toBe('token-1');
    tokenStorage.clear();
    expect(tokenStorage.read()).toBeNull();
  });

  it('reads an empty value as no token', () => {
    localStorage.setItem(TOKEN_KEY, '');
    expect(tokenStorage.read()).toBeNull();
  });

  it('works without localStorage (private mode, blocked site data)', () => {
    const unavailable = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(unavailable);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(unavailable);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(unavailable);

    expect(() => tokenStorage.save('token-1')).not.toThrow();
    expect(tokenStorage.read()).toBeNull();
    expect(() => tokenStorage.clear()).not.toThrow();
  });
});
