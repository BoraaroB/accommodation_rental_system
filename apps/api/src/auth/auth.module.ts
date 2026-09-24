import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../core/config/env.schema.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { BcryptPasswordHasher } from './bcrypt-password-hasher.js';
import { JwtTokenSigner } from './jwt-token-signer.js';
import { PASSWORD_HASHER } from './password-hasher.js';
import { TOKEN_SIGNER } from './token-signer.js';

/**
 * "Who you are" (D-007): registration, sign-in, access tokens and the global
 * `AuthGuard`, so every route needs a signed-in user unless it is `@Public()`.
 */
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.getOrThrow('JWT_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.getOrThrow('JWT_EXPIRES_IN', { infer: true }),
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: PASSWORD_HASHER, useClass: BcryptPasswordHasher },
    { provide: TOKEN_SIGNER, useClass: JwtTokenSigner },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
