import { Controller, type ExecutionContext, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedRequest, AuthUser } from './auth-user.js';
import { AuthGuard } from './auth.guard.js';
import { Public } from './public.decorator.js';
import type { TokenSigner } from './token-signer.js';

const user: AuthUser = {
  id: '0b8f7a3e-54c1-4f0e-9d7a-2f1c3b4a5d6e',
  email: 'guest@example.com',
};

@Controller()
class RoutesController {
  @Get()
  private(): void {}

  @Public()
  @Get()
  open(): void {}
}

@Public()
@Controller()
class PublicController {
  @Get()
  any(): void {}
}

function contextFor(
  request: AuthenticatedRequest,
  controller: new () => object,
  handler: string,
): ExecutionContext {
  return {
    getHandler: () => controller.prototype[handler as keyof object],
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function createGuard() {
  const tokens: TokenSigner = {
    sign: vi.fn(),
    verify: vi.fn((token: string) =>
      Promise.resolve(token === 'valid-token' ? user : null),
    ),
  };
  return { guard: new AuthGuard(new Reflector(), tokens), tokens };
}

describe('AuthGuard', () => {
  it.each([
    ['a @Public() handler', RoutesController, 'open'],
    ['a handler of a @Public() controller', PublicController, 'any'],
  ])('lets %s through without a token', async (_case, controller, handler) => {
    const { guard, tokens } = createGuard();
    const request: AuthenticatedRequest = { headers: {} };

    await expect(
      guard.canActivate(contextFor(request, controller, handler)),
    ).resolves.toBe(true);
    expect(tokens.verify).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it.each([
    ['no Authorization header', undefined],
    ['an empty header', ''],
    ['another scheme', 'Basic dXNlcjpwYXNz'],
    ['a scheme without a token', 'Bearer'],
  ])(
    'answers %s with 401 AUTHENTICATION_REQUIRED',
    async (_case, authorization) => {
      const { guard } = createGuard();
      await expect(
        guard.canActivate(
          contextFor(
            { headers: { authorization } },
            RoutesController,
            'private',
          ),
        ),
      ).rejects.toMatchObject({
        status: 401,
        errorCode: 'AUTHENTICATION_REQUIRED',
      });
    },
  );

  it('answers a token that does not verify with 401 INVALID_TOKEN', async () => {
    const { guard } = createGuard();
    await expect(
      guard.canActivate(
        contextFor(
          { headers: { authorization: 'Bearer forged-token' } },
          RoutesController,
          'private',
        ),
      ),
    ).rejects.toMatchObject({ status: 401, errorCode: 'INVALID_TOKEN' });
  });

  it.each(['Bearer valid-token', 'bearer valid-token'])(
    'puts the user of a valid token (%j) on the request',
    async (authorization) => {
      const { guard } = createGuard();
      const request: AuthenticatedRequest = { headers: { authorization } };

      await expect(
        guard.canActivate(contextFor(request, RoutesController, 'private')),
      ).resolves.toBe(true);
      expect(request.user).toEqual(user);
    },
  );
});
