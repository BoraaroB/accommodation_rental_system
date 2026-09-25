import { ConflictException } from '@nestjs/common';

/** A day to block is taken by an active booking (D-010). */
export class DayAlreadyBookedError extends ConflictException {
  constructor(day: string) {
    super(`${day} is booked`, { errorCode: 'DAY_ALREADY_BOOKED' });
  }
}
