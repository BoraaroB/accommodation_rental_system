import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './auth-user.js';
import {
  AuthenticationRequiredError,
  InvalidTokenError,
} from './auth.errors.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { TOKEN_SIGNER, type TokenSigner } from './token-signer.js';

const BEARER = /^Bearer +(\S+) *$/i;

/**
 * "Who you are": the global guard. Every route needs a valid Bearer token
 * unless it is marked `@Public()`; the token's user goes on the request. It
 * says nothing about what the user may do — that is `PermissionsGuard`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_SIGNER) private readonly tokens: TokenSigner,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = BEARER.exec(request.headers.authorization ?? '')?.[1];
    if (token === undefined) {
      throw new AuthenticationRequiredError();
    }
    const user = await this.tokens.verify(token);
    if (user === null) {
      throw new InvalidTokenError();
    }
    request.user = user;
    return true;
  }
}
