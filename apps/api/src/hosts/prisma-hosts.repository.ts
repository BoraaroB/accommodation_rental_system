import type { TenantHost } from '@ars/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { NewUser } from '../users/users.repository.js';
import type { HostsRepository } from './hosts.repository.js';

/** The columns of a `TenantHost`; the password hash is never selected. */
const tenantHostSelect = {
  id: true,
  email: true,
  name: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class PrismaHostsRepository implements HostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string): Promise<TenantHost[]> {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { tenantId },
      select: { user: { select: tenantHostSelect } },
      orderBy: { user: { email: 'asc' } },
    });
    return memberships.map(({ user }) => user);
  }

  async isHost(tenantId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
      select: { userId: true },
    });
    return membership !== null;
  }

  async add(tenantId: string, userId: string): Promise<TenantHost> {
    // `connect`, as in `createWithAccount`: a tenant deleted meanwhile is a
    // missing record (404), not a foreign key violation.
    const { user } = await this.prisma.tenantMembership.create({
      data: {
        tenant: { connect: { id: tenantId } },
        user: { connect: { id: userId } },
      },
      select: { user: { select: tenantHostSelect } },
    });
    return user;
  }

  async createWithAccount(
    tenantId: string,
    account: NewUser,
  ): Promise<TenantHost> {
    // A nested write: Prisma runs it in one transaction, so the account and
    // the membership are created together or not at all. The account's
    // columns are those of `PrismaUsersRepository.create`; a new required
    // user column goes into both.
    const { user } = await this.prisma.tenantMembership.create({
      data: {
        tenant: { connect: { id: tenantId } },
        user: {
          create: {
            email: account.email,
            name: account.name,
            passwordHash: account.passwordHash,
          },
        },
      },
      select: { user: { select: tenantHostSelect } },
    });
    return user;
  }

  async remove(tenantId: string, userId: string): Promise<boolean> {
    const { count } = await this.prisma.tenantMembership.deleteMany({
      where: { tenantId, userId },
    });
    return count > 0;
  }
}
