import {
  bookingDtoSchema,
  listingDtoSchema,
  type BookingDto,
  type ListingDto,
} from '@ars/shared';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';

/** A CSV row: snake_case header → string value, exactly as in the file. */
export type CsvRow = Record<string, string>;

/** Parses CSV text with a header line into one object per row; values stay strings. */
export function parseCsv(text: string): CsvRow[] {
  return parse<CsvRow>(text, { columns: true, skip_empty_lines: true });
}

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * A number written in plain decimal notation. Anything else (an empty cell,
 * `1e3`, `0x10`) becomes NaN, which the schema rejects — `Number('')` would
 * silently be 0.
 */
function toNumber(value: string | undefined): number {
  return value !== undefined && DECIMAL_PATTERN.test(value)
    ? Number(value)
    : Number.NaN;
}

/** A `listings.csv` row as a `ListingDto`; throws a `ZodError` when it breaks a rule. */
export function parseListingRow(row: CsvRow): ListingDto {
  return listingDtoSchema.parse({
    id: row.id,
    title: row.title,
    city: row.city,
    country: row.country,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    propertyType: row.property_type,
    maxGuests: toNumber(row.max_guests),
    bedrooms: toNumber(row.bedrooms),
    pricePerNightCents: toNumber(row.price_per_night_cents),
    currency: row.currency,
    // An empty cell is a listing nobody has reviewed yet, a real state.
    rating: row.rating === '' ? null : toNumber(row.rating),
    reviewCount: toNumber(row.review_count),
    createdAt: row.created_at,
  });
}

/** A `bookings.csv` row as a `BookingDto`; throws a `ZodError` when it breaks a rule. */
export function parseBookingRow(row: CsvRow): BookingDto {
  return bookingDtoSchema.parse({
    id: row.id,
    listingId: row.listing_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
    guests: toNumber(row.guests),
    status: row.status,
  });
}

/**
 * Maps every row of a file. The first invalid row stops the seed with the file,
 * the row number (the first row after the header is 1) and what is wrong.
 */
export function mapRows<T>(
  file: string,
  rows: readonly CsvRow[],
  mapRow: (row: CsvRow) => T,
): T[] {
  return rows.map((row, index) => {
    try {
      return mapRow(row);
    } catch (error) {
      const reason =
        error instanceof z.ZodError ? z.prettifyError(error) : String(error);
      throw new Error(`${file}, row ${index + 1}:\n${reason}`, {
        cause: error,
      });
    }
  });
}
