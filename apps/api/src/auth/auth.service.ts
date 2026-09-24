import type {
  AccessToken,
  LoginInput,
  RegisterInput,
  UserProfile,
} from '@ars/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  USERS_REPOSITORY,
  type UsersRepository,
} from '../users/users.repository.js';
import {
  EmailTakenError,
  InvalidCredentialsError,
  InvalidTokenError,
} from './auth.errors.js';
import { PASSWORD_HASHER, type PasswordHasher } from './password-hasher.js';
import { TOKEN_SIGNER, type TokenSigner } from './token-signer.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(USERS_REPOSITORY) private readonly users: UsersRepository,
    @Inject(PASSWORD_HASHER) private readonly passwords: PasswordHasher,
    @Inject(TOKEN_SIGNER) private readonly tokens: TokenSigner,
  ) {}

  /**
   * Creates a client account (D-008); the e-mail is already lowercase. Two
   * registrations racing for one e-mail: the unique index rejects the second
   * (409 UNIQUE_VIOLATION).
   */
  async register(input: RegisterInput): Promise<UserProfile> {
    if ((await this.users.findByEmail(input.email)) !== null) {
      throw new EmailTakenError();
    }
    return this.users.create({
      email: input.email,
      name: input.name,
      passwordHash: await this.passwords.hash(input.password),
    });
  }

  /** An unknown e-mail and a wrong password get the same 401. */
  async login(input: LoginInput): Promise<AccessToken> {
    // Registration already tells whether an e-mail has an account (409
    // EMAIL_TAKEN), so the single message here keeps the sign-in form simple
    // rather than hiding accounts. Possible improvement (not in the plan):
    // lock an account after repeated failed sign-ins.
    const user = await this.users.findByEmail(input.email);
    if (
      user === null ||
      !(await this.passwords.verify(input.password, user.passwordHash))
    ) {
      // The e-mail passed `emailSchema`, so it cannot forge a log line.
      this.logger.warn(`Failed sign-in for ${input.email}`);
      throw new InvalidCredentialsError();
    }
    return {
      accessToken: await this.tokens.sign({ id: user.id, email: user.email }),
    };
  }

  /** The signed-in user's profile; a token whose user was deleted is a 401. */
  async me(userId: string): Promise<UserProfile> {
    const profile = await this.users.findProfileById(userId);
    if (profile === null) {
      throw new InvalidTokenError();
    }
    return profile;
  }
}
