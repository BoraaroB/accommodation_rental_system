import type { TenantCreateInput, TenantUpdateInput } from '@ars/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { TenantRecord } from './tenant-request.js';
import type { TenantsRepository } from './tenants.repository.js';

/** The columns of a `TenantRecord`. */
const tenantRecordSelect = {
  id: true,
  slug: true,
  name: true,
  logoUrl: true,
  primaryColor: true,
  contactEmail: true,
  currency: true,
} satisfies Prisma.TenantSelect;

@Injectable()
export class PrismaTenantsRepository implements TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBySlug(slug: string): Promise<TenantRecord | null> {
    return this.prisma.tenant.findUnique({
      where: { slug },
      select: tenantRecordSelect,
    });
  }

  findById(id: string): Promise<TenantRecord | null> {
    return this.prisma.tenant.findUnique({
      where: { id },
      select: tenantRecordSelect,
    });
  }

  findAll(): Promise<TenantRecord[]> {
    // Possible improvement (not in the plan): paginate the portal list once
    // there are more tenants than a landing page can show.
    return this.prisma.tenant.findMany({
      select: tenantRecordSelect,
      orderBy: { slug: 'asc' },
    });
  }

  create(tenant: TenantCreateInput): Promise<TenantRecord> {
    // Every field by name, so nothing else of the tenant can be written.
    const { slug, name, logoUrl, primaryColor, contactEmail } = tenant;
    return this.prisma.tenant.create({
      data: { slug, name, logoUrl, primaryColor, contactEmail },
      select: tenantRecordSelect,
    });
  }

  update(id: string, changes: TenantUpdateInput): Promise<TenantRecord> {
    // Prisma leaves a field that is `undefined` as it is and writes `null`,
    // which is the merge-patch meaning of the edit.
    const { slug, name, logoUrl, primaryColor, contactEmail } = changes;
    return this.prisma.tenant.update({
      where: { id },
      data: { slug, name, logoUrl, primaryColor, contactEmail },
      select: tenantRecordSelect,
    });
  }

  async remove(id: string): Promise<boolean> {
    // The foreign keys cascade to listings, bookings, blocked days and
    // memberships (D-029).
    const { count } = await this.prisma.tenant.deleteMany({ where: { id } });
    return count > 0;
  }
}
