import type { HostBooking } from '@ars/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../core/database/prisma.service.js';
import { hostBookingSelect, toHostBooking } from './bookings.mapper.js';
import type {
  BookingSearch,
  BookingsRepository,
} from './bookings.repository.js';
import { buildBookingWhere } from './build-booking-where.js';

@Injectable()
export class PrismaBookingsRepository implements BookingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPage(
    tenantId: string,
    { skip, take, ...filters }: BookingSearch,
  ): Promise<{ items: HostBooking[]; total: number }> {
    const where = buildBookingWhere(tenantId, filters);
    // Two independent reads in parallel, as the listing list does.
    const [rows, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        // `id` breaks ties, so a booking never moves between pages.
        orderBy: [{ checkIn: 'asc' }, { id: 'asc' }],
        skip,
        take,
        select: hostBookingSelect,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { items: rows.map(toHostBooking), total };
  }
}
