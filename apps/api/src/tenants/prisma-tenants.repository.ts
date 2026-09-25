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

  findAll(): Promise<TenantRecord[]> {
    // Possible improvement (not in the plan): paginate the portal list once
    // there are more tenants than a landing page can show.
    return this.prisma.tenant.findMany({
      select: tenantRecordSelect,
      orderBy: { slug: 'asc' },
    });
  }
}
