import { NotFoundException } from '@nestjs/common';

/** The `:tenantSlug` of a URL names no tenant. The slug is not echoed. */
export class TenantNotFoundError extends NotFoundException {
  constructor() {
    super('Tenant not found', { errorCode: 'TENANT_NOT_FOUND' });
  }
}
