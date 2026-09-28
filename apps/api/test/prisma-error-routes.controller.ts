import { randomUUID } from 'node:crypto';
import { addDays, today } from '@ars/shared';
import { Controller, Param, Patch, Post } from '@nestjs/common';
import { Public } from '../src/auth/public.decorator.js';
import { PrismaService } from '../src/core/database/prisma.service.js';
import type { Prisma } from '../src/generated/prisma/client.js';

/**
 * Routes that exist only in the e2e tests (`/api/v1/prisma-errors/...`). Each
 * one makes the database reject a write, so the tests see how the API answers
 * a Prisma error.
 */
@Public()
@Controller('prisma-errors')
export class PrismaErrorRoutesController {
  constructor(private readonly prisma: PrismaService) {}

  /** The second call with the same slug violates the unique slug (P2002). */
  @Post('tenants/:tenantSlug')
  async createTenant(
    @Param('tenantSlug') tenantSlug: string,
  ): Promise<{ id: string }> {
    const tenant = await this.prisma.tenant.create({
      data: { slug: tenantSlug, name: 'E2E tenant' },
    });
    return { id: tenant.id };
  }

  /** Updates a tenant that does not exist (P2025). */
  @Patch('missing-tenant')
  async renameMissingTenant(): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: randomUUID() },
      data: { name: 'Renamed' },
    });
  }

  /** Books a listing that does not exist (P2003). */
  @Post('orphan-booking')
  async bookMissingListing(): Promise<void> {
    await this.prisma.booking.create({
      data: {
        listingId: randomUUID(),
        checkIn: new Date(`${addDays(today(), 10)}T00:00:00.000Z`),
        checkOut: new Date(`${addDays(today(), 13)}T00:00:00.000Z`),
        guests: 2,
        status: 'confirmed',
        totalCents: 36000,
      },
    });
  }

  /** Creates a user without a name: Prisma rejects the call before it reaches the database. */
  @Post('nameless-users/:suffix')
  async createNamelessUser(@Param('suffix') suffix: string): Promise<void> {
    await this.prisma.user.create({
      data: {
        email: `host-${suffix}@example.test`,
        passwordHash: 'not-a-real-hash',
      } as Prisma.UserCreateInput,
    });
  }

  /** Stores an e-mail that is not lowercase (users_email_lowercase_check). */
  @Post('users/:suffix')
  async createUpperCaseUser(@Param('suffix') suffix: string): Promise<void> {
    await this.prisma.user.create({
      data: {
        email: `Host-${suffix}@Example.test`,
        passwordHash: 'not-a-real-hash',
        name: 'E2E user',
      },
    });
  }
}
