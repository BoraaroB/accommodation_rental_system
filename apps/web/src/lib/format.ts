import {
  centsToEuros,
  parseIsoDate,
  type Currency,
  type IsoDate,
} from '@ars/shared';

// Day-month order, as the portals' European visitors write dates.
const LOCALE = 'en-GB';
// Dates are calendar days in UTC (D-012); formatting in UTC keeps the day.
const TIME_ZONE = 'UTC';

const shortDate = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
});
const longDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

const regionNames = new Intl.DisplayNames(LOCALE, { type: 'region' });

/** A country's name from its ISO 3166-1 alpha-2 code, e.g. "Croatia" for HR. */
export function formatCountry(code: string): string {
  return regionNames.of(code) ?? code;
}

/** An amount of cents as money: "€120", or "€120.50" when it has cents. */
export function formatMoney(cents: number, currency: Currency = 'EUR'): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(centsToEuros(cents));
}

/** A day in short, e.g. "1 Oct". */
export function formatShortDate(date: IsoDate): string {
  return shortDate.format(parseIsoDate(date));
}

/** A stay's dates, e.g. "1 – 4 Oct"; `to` is the departure day. */
export function formatDateRange(from: IsoDate, to: IsoDate): string {
  return shortDate.formatRange(parseIsoDate(from), parseIsoDate(to));
}

/** A day in full, e.g. "Thursday, 1 October 2026". */
export function formatLongDate(date: IsoDate): string {
  return longDate.format(parseIsoDate(date));
}

/** "1 night", "3 nights", "2 guests": a count with its noun. */
export function pluralize(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}
