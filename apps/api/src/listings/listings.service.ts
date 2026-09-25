import type {
  AvailabilityQuery,
  DateRange,
  HostListingQuery,
  IsoDate,
  ListingAvailability,
  ListingDto,
  ListingQuery,
  ListingUpdateInput,
  Page,
} from '@ars/shared';
import { Inject, Injectable } from '@nestjs/common';
import {
  ListingNotFoundError,
  MaxGuestsBelowBookingError,
} from './listings.errors.js';
import {
  LISTINGS_REPOSITORY,
  type ListingOccupancy,
  type ListingSearch,
  type ListingsRepository,
} from './listings.repository.js';
import { unavailableDays } from './unavailable-days.js';

@Injectable()
export class ListingsService {
  constructor(
    @Inject(LISTINGS_REPOSITORY)
    private readonly listings: ListingsRepository,
  ) {}

  /** One page of the tenant's listings that match the portal's query. */
  list(
    tenantId: string,
    { page, pageSize, ...search }: ListingQuery,
  ): Promise<Page<ListingDto>> {
    return this.findPage(tenantId, search, page, pageSize);
  }

  /** One page of the host panel's table: the tenant's listings matching `q`, newest first. */
  listForHost(
    tenantId: string,
    { page, pageSize, q }: HostListingQuery,
  ): Promise<Page<ListingDto>> {
    return this.findPage(tenantId, { q, sort: 'newest' }, page, pageSize);
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

  /**
   * A host's edit. `maxGuests` may not drop below the guests of a
   * non-cancelled booking, so the bookings keep `guests ≤ maxGuests` (D-014).
   */
  async update(
    tenantId: string,
    id: string,
    changes: ListingUpdateInput,
  ): Promise<ListingDto> {
    // Bookings are only written by the seed, so nothing can raise the maximum
    // between this check and the write.
    const maxGuests = await this.listings.findMaxActiveGuests(tenantId, id);
    if (maxGuests === null) {
      throw new ListingNotFoundError();
    }
    if (changes.maxGuests < maxGuests) {
      throw new MaxGuestsBelowBookingError(maxGuests);
    }
    return this.listings.update(tenantId, id, changes);
  }

  /** When the listing is available: the days of `[from, to)` it is taken. */
  async getAvailability(
    tenantId: string,
    id: string,
    range: AvailabilityQuery,
  ): Promise<ListingAvailability> {
    const occupancy = await this.occupancyOf(tenantId, id, range);
    return {
      from: range.from,
      to: range.to,
      unavailableDays: unavailableDays(range, occupancy),
    };
  }

  /** The days of `[from, to)` an active booking takes, sorted; blocked days do not count. */
  async getBookedDays(
    tenantId: string,
    id: string,
    range: DateRange,
  ): Promise<IsoDate[]> {
    const { stays } = await this.occupancyOf(tenantId, id, range);
    return unavailableDays(range, { stays, blockedDays: [] });
  }

  /** What occupies the listing within the range: active stays and blocked days. */
  private async occupancyOf(
    tenantId: string,
    id: string,
    range: DateRange,
  ): Promise<ListingOccupancy> {
    const occupancy = await this.listings.findOccupancy(tenantId, id, range);
    if (occupancy === null) {
      throw new ListingNotFoundError();
    }
    return occupancy;
  }

  /** A page past the end is empty. */
  private async findPage(
    tenantId: string,
    search: Omit<ListingSearch, 'skip' | 'take'>,
    page: number,
    pageSize: number,
  ): Promise<Page<ListingDto>> {
    const { items, total } = await this.listings.findPage(tenantId, {
      ...search,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, page, pageSize, total };
  }
}
