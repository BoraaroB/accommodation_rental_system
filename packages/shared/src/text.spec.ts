import { describe, expect, it } from 'vitest';
import { plainTextSchema } from './text.js';

describe('plainTextSchema', () => {
  it('trims the text', () => {
    expect(plainTextSchema.parse('  Split  ')).toBe('Split');
  });

  it.each(['', '   ', 'a\u0000b', 'a\nb', 'a\tb'])('rejects %j', (text) => {
    expect(plainTextSchema.safeParse(text).success).toBe(false);
  });
});
