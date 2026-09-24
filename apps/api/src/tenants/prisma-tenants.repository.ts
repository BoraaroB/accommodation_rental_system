import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service.js';
import type { TenantRecord, TenantsRepository } from './tenants.repository.js';

@Injectable()
export class PrismaTenantsRepository implements TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findBySlug(slug: string): Promise<TenantRecord | null> {
    return this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true },
    });
  }
}
