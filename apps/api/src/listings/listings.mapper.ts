import { toIsoDate, type ListingDto } from '@ars/shared';
import type { Prisma } from '../generated/prisma/client.js';

/** The columns a `ListingDto` is built from; `tenantId` is never selected. */
export const listingSelect = {
  id: true,
  title: true,
  city: true,
  country: true,
  latitude: true,
  longitude: true,
  propertyType: true,
  maxGuests: true,
  bedrooms: true,
  pricePerNightCents: true,
  currency: true,
  rating: true,
  reviewCount: true,
  createdAt: true,
} satisfies Prisma.ListingSelect;

export type ListingRow = Prisma.ListingGetPayload<{
  select: typeof listingSelect;
}>;

/**
 * A listing row → `ListingDto` (D-016): the `date` column becomes an
 * `IsoDate` and the decimal rating a number, or `null` when unreviewed.
 */
export function toListingDto(row: ListingRow): ListingDto {
  return {
    id: row.id,
    title: row.title,
    city: row.city,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    propertyType: row.propertyType,
    maxGuests: row.maxGuests,
    bedrooms: row.bedrooms,
    pricePerNightCents: row.pricePerNightCents,
    currency: row.currency,
    rating: row.rating === null ? null : row.rating.toNumber(),
    reviewCount: row.reviewCount,
    createdAt: toIsoDate(row.createdAt),
  };
}
