import type { HostBooking, HostBookingQuery, Page } from '@ars/shared';
import { Inject, Injectable } from '@nestjs/common';
import {
  BOOKINGS_REPOSITORY,
  type BookingsRepository,
} from './bookings.repository.js';

@Injectable()
export class BookingsService {
  constructor(
    @Inject(BOOKINGS_REPOSITORY)
    private readonly bookings: BookingsRepository,
  ) {}

  /** One page of the tenant's bookings that match the query; a page past the end is empty. */
  async list(
    tenantId: string,
    { page, pageSize, ...filters }: HostBookingQuery,
  ): Promise<Page<HostBooking>> {
    const { items, total } = await this.bookings.findPage(tenantId, {
      ...filters,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, page, pageSize, total };
  }
}
