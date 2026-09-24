import { describe, expect, it } from 'vitest';
import { pathOf } from './request-path.js';

describe('pathOf', () => {
  it.each([
    ['/api/v1/t/adriatic/listings', '/api/v1/t/adriatic/listings'],
    [
      '/api/v1/t/adriatic/listings?city=Split&page=2',
      '/api/v1/t/adriatic/listings',
    ],
    ['/api/nope?token=abc', '/api/nope'],
    ['/api?', '/api'],
  ])('%s → %s', (url, path) => {
    expect(pathOf(url)).toBe(path);
  });
});
