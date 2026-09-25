import { ConflictException, NotFoundException } from '@nestjs/common';

/** The user of the URL does not host the tenant. */
export class HostNotFoundError extends NotFoundException {
  constructor() {
    super('This user is not a host of the tenant', {
      errorCode: 'HOST_NOT_FOUND',
    });
  }
}

/** The account already hosts the tenant. */
export class AlreadyHostError extends ConflictException {
  constructor() {
    super('This account is already a host of the tenant', {
      errorCode: 'ALREADY_HOST',
    });
  }
}
