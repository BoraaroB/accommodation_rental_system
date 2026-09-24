import {
  loginSchema,
  registerSchema,
  type AccessToken,
  type LoginInput,
  type RegisterInput,
  type UserProfile,
} from '@ars/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import type { AuthUser } from './auth-user.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { Public } from './public.decorator.js';

// Possible improvement (not in the plan): rate-limit register and login.
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Always creates a client (D-008); the client signs in afterwards. */
  @Public()
  @Post('register')
  register(
    @Body({ schema: registerSchema }) input: RegisterInput,
  ): Promise<UserProfile> {
    return this.auth.register(input);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body({ schema: loginSchema }) input: LoginInput,
  ): Promise<AccessToken> {
    return this.auth.login(input);
  }

  /**
   * Needs a signed-in user but no permission: it answers "who you are". The
   * web app uses `isSuperadmin` and `hostOf` for UI gating only.
   */
  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<UserProfile> {
    return this.auth.me(user.id);
  }
}
