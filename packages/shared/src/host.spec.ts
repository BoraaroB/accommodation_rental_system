import { describe, expect, it } from 'vitest';
import { hostInputSchema } from './host.js';

const host = {
  email: 'host@example.com',
  name: 'Host',
  password: 'correct-horse',
};

describe('hostInputSchema', () => {
  it('normalizes the e-mail and the name', () => {
    expect(
      hostInputSchema.parse({
        ...host,
        email: ' Host@Example.COM ',
        name: ' Host ',
      }),
    ).toEqual(host);
  });

  it('drops fields that would grant more rights', () => {
    expect(hostInputSchema.parse({ ...host, isSuperadmin: true })).toEqual(
      host,
    );
  });
});
