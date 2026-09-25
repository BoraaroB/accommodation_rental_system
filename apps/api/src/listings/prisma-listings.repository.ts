import { toIsoDate, type ListingDto } from '@ars/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service.js';
import {
  activeStaysOverlapping,
  blockedDaysWithin,
  buildListingOrderBy,
  buildListingWhere,
} from './build-listing-query.js';
import { listingSelect, toListingDto } from './listings.mapper.js';
import type {
  DateRange,
  ListingOccupancy,
  ListingSearch,
  ListingsRepository,
} from './listings.repository.js';

@Injectable()
export class PrismaListingsRepository implements ListingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(
    tenantId: string,
    { sort, skip, take, ...filters }: ListingSearch,
  ): Promise<{ items: ListingDto[]; total: number }> {
    const where = buildListingWhere(tenantId, filters);
    // Two independent reads in parallel. Like any pair of statements under
    // READ COMMITTED, the count may differ from the page if listings change
    // in between.
    const [rows, total] = await Promise.all([
      this.prisma.listing.findMany({
        where,
        orderBy: buildListingOrderBy(sort),
        skip,
        take,
        select: listingSelect,
      }),
      this.prisma.listing.count({ where }),
    ]);
    return { items: rows.map(toListingDto), total };
  }

  async findById(tenantId: string, id: string): Promise<ListingDto | null> {
    const row = await this.prisma.listing.findFirst({
      where: { id, tenantId },
      select: listingSelect,
    });
    return row === null ? null : toListingDto(row);
  }

  async findCities(tenantId: string): Promise<string[]> {
    // GROUP BY in the database, over the (tenant_id, city) index.
    const rows = await this.prisma.listing.groupBy({
      by: ['city'],
      where: { tenantId },
      orderBy: { city: 'asc' },
    });
    return rows.map(({ city }) => city);
  }

  async findOccupancy(
    tenantId: string,
    id: string,
    range: DateRange,
  ): Promise<ListingOccupancy | null> {
    // The same predicates as the list's date filter, so the calendar and the
    // filter always agree.
    const listing = await this.prisma.listing.findFirst({
      where: { id, tenantId },
      select: {
        bookings: {
          where: activeStaysOverlapping(range),
          select: { checkIn: true, checkOut: true },
        },
        blockedDays: {
          where: blockedDaysWithin(range),
          select: { day: true },
        },
      },
    });
    if (listing === null) {
      return null;
    }
    return {
      stays: listing.bookings.map(({ checkIn, checkOut }) => ({
        checkIn: toIsoDate(checkIn),
        checkOut: toIsoDate(checkOut),
      })),
      blockedDays: listing.blockedDays.map(({ day }) => toIsoDate(day)),
    };
  }
}
