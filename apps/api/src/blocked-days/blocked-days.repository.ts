import type { DateRange, IsoDate } from '@ars/shared';

export const BLOCKED_DAYS_REPOSITORY = Symbol('BLOCKED_DAYS_REPOSITORY');

/**
 * The days hosts block on a listing's calendar, one row per day (D-010).
 * Every method is scoped to the listing's tenant (D-006).
 */
export interface BlockedDaysRepository {
  /** The blocked days within `[from, to)`, sorted. */
  findWithin(
    tenantId: string,
    listingId: string,
    range: DateRange,
  ): Promise<IsoDate[]>;
  /** Blocks the days; a day that is blocked already stays as it is. */
  createMany(
    tenantId: string,
    listingId: string,
    days: IsoDate[],
    createdById: string,
  ): Promise<void>;
  /** Unblocks the days within `[from, to)`; returns how many were blocked. */
  deleteWithin(
    tenantId: string,
    listingId: string,
    range: DateRange,
  ): Promise<number>;
}
