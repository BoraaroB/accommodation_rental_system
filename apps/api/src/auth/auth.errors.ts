import { ConflictException, UnauthorizedException } from '@nestjs/common';

export class EmailTakenError extends ConflictException {
  constructor() {
    super('An account with this e-mail already exists', {
      errorCode: 'EMAIL_TAKEN',
    });
  }
}

/** One answer for an unknown e-mail and a wrong password. */
export class InvalidCredentialsError extends UnauthorizedException {
  constructor() {
    super('Invalid e-mail or password', { errorCode: 'INVALID_CREDENTIALS' });
  }
}

/** A route that needs a signed-in user was called without a Bearer token. */
export class AuthenticationRequiredError extends UnauthorizedException {
  constructor() {
    super('Sign in to continue', { errorCode: 'AUTHENTICATION_REQUIRED' });
  }
}

/** The token is invalid or expired, or its user no longer exists. */
export class InvalidTokenError extends UnauthorizedException {
  constructor() {
    super('The access token is invalid or has expired', {
      errorCode: 'INVALID_TOKEN',
    });
  }
}
