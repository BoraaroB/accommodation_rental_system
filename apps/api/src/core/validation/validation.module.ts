import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';

/**
 * Input validation for every route. `@Body({ schema })`, `@Query({ schema })`
 * and `@Param(name, { schema })` only attach a zod schema from `@ars/shared`;
 * this global pipe validates against it. The handler receives the parsed value
 * (trimmed, coerced); a failure is a 400 whose `message[]` lists every issue
 * as `path: message`. Parameters without a schema and custom decorators
 * (`@CurrentUser()`, `@CurrentTenant()`) are not touched.
 */
@Module({
  providers: [{ provide: APP_PIPE, useClass: StandardSchemaValidationPipe }],
})
export class ValidationModule {}
