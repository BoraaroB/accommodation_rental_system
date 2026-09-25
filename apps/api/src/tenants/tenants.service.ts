import { tenantSlugSchema, type PublicTenant } from '@ars/shared';
import { Inject, Injectable } from '@nestjs/common';
import { TenantNotFoundError } from './tenants.errors.js';
import { toPublicTenant } from './tenants.mapper.js';
import type { TenantRecord } from './tenant-request.js';
import {
  TENANTS_REPOSITORY,
  type TenantsRepository,
} from './tenants.repository.js';

@Injectable()
export class TenantsService {
  constructor(
    @Inject(TENANTS_REPOSITORY) private readonly tenants: TenantsRepository,
  ) {}

  /**
   * The tenant a portal URL names; an unknown slug is a 404. A value that is
   * not a slug names no tenant and never reaches the database.
   */
  async getBySlug(slug: string): Promise<TenantRecord> {
    if (!tenantSlugSchema.safeParse(slug).success) {
      throw new TenantNotFoundError();
    }
    // Possible improvement (not in the plan): cache this lookup, which runs
    // on every tenant route.
    const tenant = await this.tenants.findBySlug(slug);
    if (tenant === null) {
      throw new TenantNotFoundError();
    }
    return tenant;
  }

  /** Every portal as visitors see it, ordered by slug. */
  async listPublic(): Promise<PublicTenant[]> {
    const tenants = await this.tenants.findAll();
    return tenants.map(toPublicTenant);
  }
}
