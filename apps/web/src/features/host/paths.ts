/** The host panel's listing table of the tenant `tenantSlug`. */
export function hostListingsPath(tenantSlug: string): string {
  return `/${tenantSlug}/host/listings`;
}

/** The editor of one listing. */
export function hostListingPath(tenantSlug: string, id: string): string {
  return `${hostListingsPath(tenantSlug)}/${id}`;
}

/** The booking table, of one listing when `listingId` is given. */
export function hostBookingsPath(
  tenantSlug: string,
  listingId?: string,
): string {
  const path = `/${tenantSlug}/host/bookings`;
  return listingId === undefined
    ? path
    : `${path}?${new URLSearchParams({ listingId }).toString()}`;
}
