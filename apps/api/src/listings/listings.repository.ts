import type {
  BookingDto,
  DateRange,
  HostListingQuery,
  IsoDate,
  ListingDto,
  ListingQuery,
  ListingSort,
  ListingUpdateInput,
} from '@ars/shared';

export const LISTINGS_REPOSITORY = Symbol('LISTINGS_REPOSITORY');

/**
 * The portal's listing filters and the host panel's search `q`; a date filter
 * needs both `from` and `to`.
 */
export type ListingFilters = Pick<
  ListingQuery,
  'city' | 'guests' | 'minPriceCents' | 'maxPriceCents' | 'from' | 'to'
> &
  Pick<HostListingQuery, 'q'>;

/** The filters and sort of a list query, with its page turned into rows. */
export interface ListingSearch extends ListingFilters {
  sort: ListingSort;
  skip: number;
  take: number;
}

/** What occupies a listing within a range, as stored: not clipped to the range. */
export interface ListingOccupancy {
  /** Non-cancelled bookings that overlap the range. */
  stays: Pick<BookingDto, 'checkIn' | 'checkOut'>[];
  /** Blocked days within the range. */
  blockedDays: IsoDate[];
}

/** A tenant's listings. Every method is scoped to the tenant (D-006). */
export interface ListingsRepository {
  /** One page of the matching listings and how many match in total. */
  findPage(
    tenantId: string,
    search: ListingSearch,
  ): Promise<{ items: ListingDto[]; total: number }>;
  findById(tenantId: string, id: string): Promise<ListingDto | null>;
  /** The tenant's distinct cities, in alphabetical order. */
  findCities(tenantId: string): Promise<string[]>;
  /** `null` when the tenant has no listing with this id. */
  findOccupancy(
    tenantId: string,
    id: string,
    range: DateRange,
  ): Promise<ListingOccupancy | null>;
  /**
   * The most guests of a non-cancelled booking of the listing, past ones
   * included; 0 without bookings, `null` when the tenant has no such listing.
   */
  findMaxActiveGuests(tenantId: string, id: string): Promise<number | null>;
  /** Writes the editable fields and returns the listing as it is now. */
  update(
    tenantId: string,
    id: string,
    changes: ListingUpdateInput,
  ): Promise<ListingDto>;
}
