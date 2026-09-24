import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { RequestContextModule } from '../request-context/request-context.module.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { PrismaExceptionFilter } from './prisma-exception.filter.js';

/**
 * One error format for the whole API. Every global exception filter is
 * registered here, in one ordered list: Nest tries the last registered filter
 * first, so the catch-all comes first and specific filters follow it. The
 * catch-all is also a plain provider, so specific filters can hand it the
 * error to write the response.
 */
@Module({
  imports: [RequestContextModule],
  providers: [
    AllExceptionsFilter,
    { provide: APP_FILTER, useExisting: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class ErrorsModule {}
