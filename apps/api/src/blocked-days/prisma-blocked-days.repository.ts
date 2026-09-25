import {
  parseIsoDate,
  toIsoDate,
  type DateRange,
  type IsoDate,
} from '@ars/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service.js';
import { blockedDaysWithin } from '../listings/build-listing-query.js';
import type { BlockedDaysRepository } from './blocked-days.repository.js';

@Injectable()
export class PrismaBlockedDaysRepository implements BlockedDaysRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findWithin(
    tenantId: string,
    listingId: string,
    range: DateRange,
  ): Promise<IsoDate[]> {
    const rows = await this.prisma.blockedDay.findMany({
      where: { listingId, listing: { tenantId }, ...blockedDaysWithin(range) },
      orderBy: { day: 'asc' },
      select: { day: true },
    });
    return rows.map(({ day }) => toIsoDate(day));
  }

  async createMany(
    tenantId: string,
    listingId: string,
    days: IsoDate[],
    createdById: string,
  ): Promise<void> {
    // Through the listing, so the insert is scoped to the tenant in the same
    // statement; the primary key (listing_id, day) makes blocking idempotent.
    await this.prisma.listing.update({
      where: { id: listingId, tenantId },
      data: {
        blockedDays: {
          createMany: {
            data: days.map((day) => ({ day: parseIsoDate(day), createdById })),
            skipDuplicates: true,
          },
        },
      },
      select: { id: true },
    });
  }

  async deleteWithin(
    tenantId: string,
    listingId: string,
    range: DateRange,
  ): Promise<number> {
    const { count } = await this.prisma.blockedDay.deleteMany({
      where: { listingId, listing: { tenantId }, ...blockedDaysWithin(range) },
    });
    return count;
  }
}
