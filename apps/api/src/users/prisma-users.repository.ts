import type { UserProfile } from '@ars/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service.js';
import { toUserProfile, userProfileSelect } from './users.mapper.js';
import type {
  NewUser,
  UserAccess,
  UserCredentials,
  UsersRepository,
} from './users.repository.js';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserCredentials | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });
  }

  async findProfileById(id: string): Promise<UserProfile | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      select: userProfileSelect,
    });
    return row === null ? null : toUserProfile(row);
  }

  async findAccess(
    userId: string,
    tenantId: string | null,
  ): Promise<UserAccess | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        isSuperadmin: true,
        // Only the membership in the tenant asked about. Without a tenant
        // there is none: `in: []` matches no row.
        memberships: {
          where: { tenantId: tenantId ?? { in: [] } },
          select: { tenantId: true },
        },
      },
    });
    if (user === null) {
      return null;
    }
    return {
      isSuperadmin: user.isSuperadmin,
      isHost: user.memberships.length > 0,
    };
  }

  async create(user: NewUser): Promise<UserProfile> {
    const row = await this.prisma.user.create({
      data: user,
      select: userProfileSelect,
    });
    return toUserProfile(row);
  }
}
