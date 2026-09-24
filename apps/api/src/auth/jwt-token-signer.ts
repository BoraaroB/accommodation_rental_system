import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';
import type { AuthUser } from './auth-user.js';
import type { TokenSigner } from './token-signer.js';

/** The claims of an access token: identity only, never a role (D-007). */
const tokenPayloadSchema = z.object({
  sub: z.uuid(),
  email: z.string().min(1),
});

/**
 * Access tokens as JWTs (HS256), signed with `JWT_SECRET` and valid for
 * `JWT_EXPIRES_IN` seconds (`JwtModule` in `AuthModule`).
 */
@Injectable()
export class JwtTokenSigner implements TokenSigner {
  constructor(private readonly jwt: JwtService) {}

  // Possible improvement (not in the plan): refresh tokens and revocation;
  // today a token stays valid until it expires.
  sign(user: AuthUser): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, email: user.email });
  }

  async verify(token: string): Promise<AuthUser | null> {
    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      // Bad signature, expired, malformed: every reason is the same 401.
      return null;
    }
    const claims = tokenPayloadSchema.safeParse(payload);
    return claims.success
      ? { id: claims.data.sub, email: claims.data.email }
      : null;
  }
}
