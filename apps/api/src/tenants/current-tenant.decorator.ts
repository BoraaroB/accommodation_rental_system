import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { TenantRecord, TenantRequest } from './tenant-request.js';

/** The tenant of the URL, resolved by `TenantGuard`. */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantRecord => {
    const { tenant } = context.switchToHttp().getRequest<TenantRequest>();
    if (tenant === undefined) {
      throw new Error('@CurrentTenant() needs TenantGuard on the route');
    }
    return tenant;
  },
);
