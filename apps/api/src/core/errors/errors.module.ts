import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { RequestContextModule } from '../request-context/request-context.module.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

/**
 * One error format for the whole API. Every global exception filter is
 * registered here, in one ordered list: Nest tries the last registered filter
 * first, so the catch-all comes first and specific filters (e.g. for Prisma
 * errors) are added after it.
 */
@Module({
  imports: [RequestContextModule],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class ErrorsModule {}
