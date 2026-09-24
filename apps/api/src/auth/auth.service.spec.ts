import type { UserProfile } from '@ars/shared';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  USERS_REPOSITORY,
  type NewUser,
  type UserCredentials,
  type UsersRepository,
} from '../users/users.repository.js';
import { AuthService } from './auth.service.js';
import { PASSWORD_HASHER, type PasswordHasher } from './password-hasher.js';
import { TOKEN_SIGNER, type TokenSigner } from './token-signer.js';

const existing: UserCredentials & { name: string } = {
  id: '0b8f7a3e-54c1-4f0e-9d7a-2f1c3b4a5d6e',
  email: 'guest@example.com',
  passwordHash: 'hashed:correct-horse',
  name: 'Guest',
};

function profileOf(user: { id: string; email: string; name: string }) {
  return { ...user, isSuperadmin: false, hostOf: [] } satisfies UserProfile;
}

async function createService() {
  const created: NewUser[] = [];
  const users: UsersRepository = {
    findByEmail: (email) =>
      Promise.resolve(email === existing.email ? existing : null),
    findProfileById: (id) =>
      Promise.resolve(id === existing.id ? profileOf(existing) : null),
    findAccess: vi.fn(),
    create: (user) => {
      created.push(user);
      return Promise.resolve(
        profileOf({ id: 'new-user-id', email: user.email, name: user.name }),
      );
    },
  };
  const passwords: PasswordHasher = {
    hash: (password) => Promise.resolve(`hashed:${password}`),
    verify: (password, passwordHash) =>
      Promise.resolve(passwordHash === `hashed:${password}`),
  };
  const tokens: TokenSigner = {
    sign: vi.fn((user) => Promise.resolve(`token-for:${user.id}`)),
    verify: vi.fn(),
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: USERS_REPOSITORY, useValue: users },
      { provide: PASSWORD_HASHER, useValue: passwords },
      { provide: TOKEN_SIGNER, useValue: tokens },
    ],
  }).compile();
  return { service: moduleRef.get(AuthService), created, tokens };
}

describe('AuthService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('creates a client with a hashed password and returns the profile', async () => {
      const { service, created } = await createService();

      const profile = await service.register({
        email: 'new@example.com',
        password: 'secret-pass',
        name: 'New Guest',
      });

      expect(created).toEqual([
        {
          email: 'new@example.com',
          name: 'New Guest',
          passwordHash: 'hashed:secret-pass',
        },
      ]);
      expect(profile).toEqual({
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New Guest',
        isSuperadmin: false,
        hostOf: [],
      });
    });

    it('answers an e-mail in use with 409 EMAIL_TAKEN', async () => {
      const { service, created } = await createService();

      await expect(
        service.register({
          email: existing.email,
          password: 'secret-pass',
          name: 'Twin',
        }),
      ).rejects.toMatchObject({ status: 409, errorCode: 'EMAIL_TAKEN' });
      expect(created).toEqual([]);
    });
  });

  describe('login', () => {
    it('returns a token for the right password', async () => {
      const { service, tokens } = await createService();

      await expect(
        service.login({ email: existing.email, password: 'correct-horse' }),
      ).resolves.toEqual({ accessToken: `token-for:${existing.id}` });
      expect(tokens.sign).toHaveBeenCalledWith({
        id: existing.id,
        email: existing.email,
      });
    });

    it.each([
      ['a wrong password', existing.email, 'wrong-horse'],
      ['an unknown e-mail', 'nobody@example.com', 'correct-horse'],
    ])(
      'answers %s with the same 401 and logs the e-mail only',
      async (_case, email, password) => {
        const warn = vi
          .spyOn(Logger.prototype, 'warn')
          .mockImplementation(() => undefined);
        const { service, tokens } = await createService();

        await expect(service.login({ email, password })).rejects.toMatchObject({
          status: 401,
          errorCode: 'INVALID_CREDENTIALS',
          message: 'Invalid e-mail or password',
        });
        expect(tokens.sign).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(`Failed sign-in for ${email}`);
        expect(JSON.stringify(warn.mock.calls)).not.toContain(password);
      },
    );
  });

  describe('me', () => {
    it('returns the profile of the signed-in user', async () => {
      const { service } = await createService();
      await expect(service.me(existing.id)).resolves.toEqual(
        profileOf(existing),
      );
    });

    it('answers a deleted user with 401 INVALID_TOKEN', async () => {
      const { service } = await createService();
      await expect(service.me('deleted-user-id')).rejects.toMatchObject({
        status: 401,
        errorCode: 'INVALID_TOKEN',
      });
    });
  });
});
