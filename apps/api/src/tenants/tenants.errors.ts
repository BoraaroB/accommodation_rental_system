import { ConflictException, NotFoundException } from '@nestjs/common';

/** The `:tenantSlug` or `:tenantId` of a URL names no tenant. The value is not echoed. */
export class TenantNotFoundError extends NotFoundException {
  constructor() {
    super('Tenant not found', { errorCode: 'TENANT_NOT_FOUND' });
  }
}

/** Another tenant already has the slug (D-028). */
export class SlugTakenError extends ConflictException {
  constructor() {
    super('Another tenant already uses this slug', {
      errorCode: 'SLUG_TAKEN',
    });
  }
}
