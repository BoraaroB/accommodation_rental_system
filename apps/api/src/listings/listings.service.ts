import type {
  AvailabilityQuery,
  ListingAvailability,
  ListingDto,
  ListingQuery,
  Page,
} from '@ars/shared';
import { Inject, Injectable } from '@nestjs/common';
import { ListingNotFoundError } from './listings.errors.js';
import {
  LISTINGS_REPOSITORY,
  type ListingsRepository,
} from './listings.repository.js';
import { unavailableDays } from './unavailable-days.js';

@Injectable()
export class ListingsService {
  constructor(
    @Inject(LISTINGS_REPOSITORY)
    private readonly listings: ListingsRepository,
  ) {}

  /** One page of the tenant's listings that match the query; a page past the end is empty. */
  async list(
    tenantId: string,
    { page, pageSize, ...search }: ListingQuery,
  ): Promise<Page<ListingDto>> {
    const { items, total } = await this.listings.findPage(tenantId, {
      ...search,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, page, pageSize, total };
  }

  listCities(tenantId: string): Promise<string[]> {
    return this.listings.findCities(tenantId);
  }

  async get(tenantId: string, id: string): Promise<ListingDto> {
    const listing = await this.listings.findById(tenantId, id);
    if (listing === null) {
      throw new ListingNotFoundError();
    }
    return listing;
  }

  /** When the listing is available: the days of `[from, to)` it is taken. */
  async getAvailability(
    tenantId: string,
    id: string,
    range: AvailabilityQuery,
  ): Promise<ListingAvailability> {
    const occupancy = await this.listings.findOccupancy(tenantId, id, range);
    if (occupancy === null) {
      throw new ListingNotFoundError();
    }
    return {
      from: range.from,
      to: range.to,
      unavailableDays: unavailableDays(range, occupancy),
    };
  }
}
