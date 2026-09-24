/**
 * Every permission a handler can require with `@RequirePermissions(...)`.
 * Public reads (the portal) need none: they are `@Public()`.
 */
export const PERMISSIONS = [
  // Host panel: the tenant's listings, their calendars and bookings.
  'listing:read',
  'listing:update',
  'blocked-day:read',
  'blocked-day:write',
  'booking:read',
  // Admin panel: tenants and their hosts.
  'tenant:read',
  'tenant:write',
  'host:read',
  'host:write',
] as const;

export type Permission = (typeof PERMISSIONS)[number];
