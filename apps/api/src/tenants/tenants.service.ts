import {
  tenantSlugSchema,
  type AdminTenant,
  type PublicTenant,
  type TenantCreateInput,
  type TenantUpdateInput,
} from '@ars/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SlugTakenError, TenantNotFoundError } from './tenants.errors.js';
import { toAdminTenant, toPublicTenant } from './tenants.mapper.js';
import type { TenantRecord } from './tenant-request.js';
import {
  TENANTS_REPOSITORY,
  type TenantsRepository,
} from './tenants.repository.js';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

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

  /** The tenant an admin URL names; an unknown id is a 404. */
  async getById(id: string): Promise<TenantRecord> {
    const tenant = await this.tenants.findById(id);
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

  /** Every tenant for the admin panel, ordered by slug. */
  async listForAdmin(): Promise<AdminTenant[]> {
    const tenants = await this.tenants.findAll();
    return tenants.map(toAdminTenant);
  }

  async getForAdmin(id: string): Promise<AdminTenant> {
    return toAdminTenant(await this.getById(id));
  }

  /**
   * A new tenant; its portal works at once. A taken slug is a 409. Two
   * creations racing for one slug: the unique index rejects the second (409
   * UNIQUE_VIOLATION).
   */
  async create(input: TenantCreateInput): Promise<AdminTenant> {
    await this.assertSlugFree(input.slug);
    const tenant = await this.tenants.create(input);
    this.logger.log(`Tenant created: ${tenant.slug} (${tenant.id})`);
    return toAdminTenant(tenant);
  }

  /**
   * Changes the fields that were sent. A new slug moves the portal: the old
   * URL is a 404 from then on. Two edits racing for one slug: 409
   * UNIQUE_VIOLATION; a tenant deleted meanwhile: 404 NOT_FOUND (both from
   * `PrismaExceptionFilter`).
   */
  async update(id: string, changes: TenantUpdateInput): Promise<AdminTenant> {
    const current = await this.getById(id);
    if (changes.slug !== undefined && changes.slug !== current.slug) {
      await this.assertSlugFree(changes.slug);
    }
    const tenant = await this.tenants.update(id, changes);
    this.logger.log(`Tenant updated: ${tenant.slug} (${tenant.id})`);
    return toAdminTenant(tenant);
  }

  /** Deletes the tenant and everything in it; its hosts keep their accounts (D-029). */
  async remove(id: string): Promise<void> {
    if (!(await this.tenants.remove(id))) {
      throw new TenantNotFoundError();
    }
    this.logger.log(`Tenant deleted: ${id}`);
  }

  private async assertSlugFree(slug: string): Promise<void> {
    if ((await this.tenants.findBySlug(slug)) !== null) {
      throw new SlugTakenError();
    }
  }
}
