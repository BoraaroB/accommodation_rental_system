import type { HostBooking, HostBookingQuery } from '@ars/shared';

export const BOOKINGS_REPOSITORY = Symbol('BOOKINGS_REPOSITORY');

/** The host table's filters; a date filter needs both `from` and `to`. */
export type BookingFilters = Pick<
  HostBookingQuery,
  'listingId' | 'status' | 'from' | 'to'
>;

/** The filters of a host booking query, with its page turned into rows. */
export interface BookingSearch extends BookingFilters {
  skip: number;
  take: number;
}

/** A tenant's bookings. Every method is scoped to the tenant (D-006). */
export interface BookingsRepository {
  /** One page of the matching bookings, by check-in, and how many match in total. */
  findPage(
    tenantId: string,
    search: BookingSearch,
  ): Promise<{ items: HostBooking[]; total: number }>;
}
