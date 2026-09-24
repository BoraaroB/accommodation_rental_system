import { JwtService } from '@nestjs/jwt';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JwtTokenSigner } from './jwt-token-signer.js';

const SECRET = 'unit-test-signing-key-of-at-least-32-chars';
const user = {
  id: '0b8f7a3e-54c1-4f0e-9d7a-2f1c3b4a5d6e',
  email: 'guest@example.com',
};

function createSigner(secret = SECRET): JwtTokenSigner {
  return new JwtTokenSigner(
    new JwtService({
      secret,
      signOptions: { algorithm: 'HS256', expiresIn: 60 },
      verifyOptions: { algorithms: ['HS256'] },
    }),
  );
}

function claimsOf(token: string): Record<string, unknown> {
  const [, payload = ''] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString()) as Record<
    string,
    unknown
  >;
}

describe('JwtTokenSigner', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('signs a token it verifies back to the same user', async () => {
    const signer = createSigner();
    const token = await signer.sign(user);
    await expect(signer.verify(token)).resolves.toEqual(user);
  });

  it('puts only identity claims in the token, no role', async () => {
    const token = await createSigner().sign(user);
    const claims = claimsOf(token);
    expect(Object.keys(claims).sort()).toEqual(['email', 'exp', 'iat', 'sub']);
    expect(claims).toMatchObject({ sub: user.id, email: user.email });
    expect(Number(claims.exp) - Number(claims.iat)).toBe(60);
  });

  it('rejects a token signed with another secret', async () => {
    const token = await createSigner(`${SECRET}-other`).sign(user);
    await expect(createSigner().verify(token)).resolves.toBeNull();
  });

  it('rejects a tampered token', async () => {
    const signer = createSigner();
    const [header, , signature] = (await signer.sign(user)).split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: user.id, email: 'admin@example.com' }),
    ).toString('base64url');
    await expect(
      signer.verify(`${header}.${forged}.${signature}`),
    ).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    vi.useFakeTimers({ now: new Date('2026-09-25T10:00:00Z') });
    const signer = createSigner();
    const token = await signer.sign(user);

    vi.setSystemTime(new Date('2026-09-25T10:01:01Z'));
    await expect(signer.verify(token)).resolves.toBeNull();
  });

  it('rejects a validly signed token without a user id', async () => {
    const jwt = new JwtService({ secret: SECRET });
    const token = await jwt.signAsync({ email: user.email });
    await expect(createSigner().verify(token)).resolves.toBeNull();
  });

  it.each(['', 'not-a-jwt', 'a.b.c'])('rejects %j', async (token) => {
    await expect(createSigner().verify(token)).resolves.toBeNull();
  });
});
