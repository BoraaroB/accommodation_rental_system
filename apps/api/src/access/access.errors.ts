import { ForbiddenException } from '@nestjs/common';

/** The signed-in user's role in this tenant lacks a required permission. */
export class InsufficientPermissionsError extends ForbiddenException {
  constructor() {
    super('You do not have permission to do this', {
      errorCode: 'INSUFFICIENT_PERMISSIONS',
    });
  }
}
