import { eachDay, type DateRange, type ListingBlockedDays } from '@ars/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ListingsService } from '../listings/listings.service.js';
import { DayAlreadyBookedError } from './blocked-days.errors.js';
import {
  BLOCKED_DAYS_REPOSITORY,
  type BlockedDaysRepository,
} from './blocked-days.repository.js';

/** The host calendar: blocking and unblocking a listing's days (D-010). */
@Injectable()
export class BlockedDaysService {
  private readonly logger = new Logger(BlockedDaysService.name);

  constructor(
    private readonly listings: ListingsService,
    @Inject(BLOCKED_DAYS_REPOSITORY)
    private readonly blockedDays: BlockedDaysRepository,
  ) {}

  async list(
    tenantId: string,
    listingId: string,
    range: DateRange,
  ): Promise<ListingBlockedDays> {
    await this.listings.get(tenantId, listingId);
    const days = await this.blockedDays.findWithin(tenantId, listingId, range);
    return { from: range.from, to: range.to, days };
  }

  /**
   * Blocks every day of `[from, to)`, or none: a day an active booking takes
   * is a 409. A day under a cancelled booking may be blocked, and blocking a
   * blocked day again changes nothing.
   */
  async block(
    tenantId: string,
    listingId: string,
    range: DateRange,
    userId: string,
  ): Promise<ListingBlockedDays> {
    // Bookings are only written by the seed, so no booking can appear between
    // this check and the insert.
    const [bookedDay] = await this.listings.getBookedDays(
      tenantId,
      listingId,
      range,
    );
    if (bookedDay !== undefined) {
      throw new DayAlreadyBookedError(bookedDay);
    }
    const days = eachDay(range.from, range.to);
    await this.blockedDays.createMany(tenantId, listingId, days, userId);
    this.logger.log(
      `Blocked ${range.from}..${range.to} (${days.length} days) of listing ${listingId} by user ${userId}`,
    );
    return { from: range.from, to: range.to, days };
  }

  async unblock(
    tenantId: string,
    listingId: string,
    range: DateRange,
    userId: string,
  ): Promise<void> {
    await this.listings.get(tenantId, listingId);
    const count = await this.blockedDays.deleteWithin(
      tenantId,
      listingId,
      range,
    );
    this.logger.log(
      `Unblocked ${range.from}..${range.to} (${count} days) of listing ${listingId} by user ${userId}`,
    );
  }
}
