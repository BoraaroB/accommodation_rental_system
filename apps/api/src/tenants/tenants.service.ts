import { Inject, Injectable } from '@nestjs/common';
import { TenantNotFoundError } from './tenants.errors.js';
import {
  TENANTS_REPOSITORY,
  type TenantRecord,
  type TenantsRepository,
} from './tenants.repository.js';

@Injectable()
export class TenantsService {
  constructor(
    @Inject(TENANTS_REPOSITORY) private readonly tenants: TenantsRepository,
  ) {}

  /** The tenant a portal URL names; an unknown slug is a 404. */
  async getBySlug(slug: string): Promise<TenantRecord> {
    // Possible improvement (not in the plan): cache this lookup, which runs
    // on every tenant route.
    const tenant = await this.tenants.findBySlug(slug);
    if (tenant === null) {
      throw new TenantNotFoundError();
    }
    return tenant;
  }
}
