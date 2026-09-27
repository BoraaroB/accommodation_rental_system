import {
  addDays,
  addMonths,
  eachDay,
  startOfMonth,
  today,
  type IsoDate,
} from '@ars/shared';
import { screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatLongDate } from '../lib/format';
import {
  apiErrorBody,
  jsonResponse,
  stubApi,
  type StubRoutes,
} from '../test/apiStub';
import { aListing, aTenant, aUser } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

const listing = aListing();
const PAGE = `/adriatic/host/listings/${listing.id}`;
const HOST_LISTING = `/tenants/adriatic/host/listings/${listing.id}`;
const BLOCKED_DAYS = `${HOST_LISTING}/blocked-days`;
const AVAILABILITY = `/tenants/adriatic/listings/${listing.id}/availability`;

// The calendar opens on this month; the tests show the next one, whose days
// are all ahead whatever today is (jsdom shows one month).
const month = addMonths(startOfMonth(today()), 1);
const day = (n: number) => addDays(month, n - 1);

/**
 * A host of Adriatic editing `listing`, whose calendar has `booked` and
 * `blocked` days. Blocking and unblocking change the blocked days the API
 * answers with afterwards; `blockedRanges` and `unblockedRanges` keep what
 * each request asked for.
 */
function stubEditor({
  booked = [],
  blocked = [],
  routes = {},
}: {
  booked?: IsoDate[];
  blocked?: IsoDate[];
  routes?: StubRoutes;
} = {}) {
  let blockedDays = new Set(blocked);
  const blockedRanges: unknown[] = [];
  const unblockedRanges: unknown[] = [];
  const within = (url: URL, days: Iterable<IsoDate>) => {
    const from = url.searchParams.get('from')!;
    const to = url.searchParams.get('to')!;
    return {
      from,
      to,
      days: [...days].filter((d) => from <= d && d < to).sort(),
    };
  };
  const api = stubApi({
    'GET /tenants/adriatic': aTenant(),
    'GET /auth/me': aUser({
      hostOf: [{ slug: 'adriatic', name: 'Adriatic Stays' }],
    }),
    [`GET ${HOST_LISTING}`]: listing,
    [`GET ${AVAILABILITY}`]: (url: URL) => {
      const { from, to, days } = within(url, [...booked, ...blockedDays]);
      return { from, to, unavailableDays: days };
    },
    [`GET ${BLOCKED_DAYS}`]: (url: URL) => within(url, blockedDays),
    [`POST ${BLOCKED_DAYS}`]: async (_url: URL, request: Request) => {
      const { from, to } = (await request.json()) as {
        from: IsoDate;
        to: IsoDate;
      };
      blockedRanges.push({ from, to });
      for (const d of eachDay(from, to)) {
        blockedDays.add(d);
      }
      return { from, to, days: eachDay(from, to) };
    },
    [`DELETE ${BLOCKED_DAYS}`]: (url: URL) => {
      unblockedRanges.push(Object.fromEntries(url.searchParams));
      const { days } = within(url, blockedDays);
      blockedDays = new Set([...blockedDays].filter((d) => !days.includes(d)));
      return new Response(null, { status: 204 });
    },
    ...routes,
  });
  return { ...api, blockedRanges, unblockedRanges };
}

/** Waits until the calendar has its data: while it loads, the kit's calendar
 * replaces its buttons, so a click could land on a button that is gone. */
async function calendarLoaded() {
  await vi.waitFor(() =>
    expect(
      screen.getAllByRole('grid')[0].closest('[aria-busy]'),
    ).toHaveAttribute('aria-busy', 'false'),
  );
}

/** Shows the next month once the calendar has loaded, and waits for its data. */
async function showNextMonth(user: UserEvent) {
  await screen.findByRole('button', {
    name: `${formatLongDate(today())}, available`,
  });
  await calendarLoaded();
  await user.click(screen.getByRole('button', { name: 'Next month' }));
  await calendarLoaded();
}

const dayButton = (d: IsoDate, status: string) =>
  screen.findByRole('button', { name: `${formatLongDate(d)}, ${status}` });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HostListingPage — editor', () => {
  it("shows the listing's editable fields, the price in euros", async () => {
    stubEditor();
    renderRoute(PAGE, { signedIn: true });

    expect(
      await screen.findByRole('heading', { name: 'Sea view apartment' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Sea view apartment');
    expect(screen.getByLabelText('Price per night')).toHaveValue('120');
    expect(screen.getByLabelText('Maximum guests')).toHaveValue(4);
    expect(screen.getByLabelText('Bedrooms')).toHaveValue(2);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'View bookings' })).toHaveAttribute(
      'href',
      `/adriatic/host/bookings?listingId=${listing.id}`,
    );
    expect(screen.getByRole('link', { name: 'All listings' })).toHaveAttribute(
      'href',
      '/adriatic/host/listings',
    );
  });

  it('saves the changes with the price in cents', async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 1);
    let saved: unknown;
    const api = stubEditor({
      routes: {
        [`PATCH ${HOST_LISTING}`]: async (_url: URL, request: Request) => {
          saved = await request.json();
          return { ...listing, ...(saved as object) };
        },
      },
    });
    renderRoute(PAGE, { signedIn: true });

    const price = await screen.findByLabelText('Price per night');
    await user.clear(price);
    await user.type(price, '99.50');
    await user.clear(screen.getByLabelText('Maximum guests'));
    await user.type(screen.getByLabelText('Maximum guests'), '6');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await vi.waitFor(() =>
      expect(success).toHaveBeenCalledWith('Listing saved'),
    );
    expect(saved).toEqual({
      title: 'Sea view apartment',
      propertyType: 'apartment',
      pricePerNightCents: 9950,
      maxGuests: 6,
      bedrooms: 2,
    });
    // Loaded, saved, then loaded again (cache tags); the form is clean.
    await vi.waitFor(() => expect(api.requestCount(HOST_LISTING)).toBe(3));
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('sends nothing while a field breaks its rule', async () => {
    const user = userEvent.setup();
    const api = stubEditor();
    renderRoute(PAGE, { signedIn: true });

    await user.clear(await screen.findByLabelText('Title'));
    await user.clear(screen.getByLabelText('Price per night'));
    await user.type(screen.getByLabelText('Price per night'), '1e2');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Enter a title')).toBeInTheDocument();
    expect(
      screen.getByText('Enter an amount in euros, e.g. 80 or 79.99'),
    ).toBeInTheDocument();
    expect(api.requestCount(HOST_LISTING)).toBe(1);
  });

  it('asks for 0 bedrooms when the listing becomes a studio', async () => {
    const user = userEvent.setup();
    const api = stubEditor();
    renderRoute(PAGE, { signedIn: true });

    await user.click(await screen.findByLabelText('Property type'));
    await user.click(await screen.findByRole('option', { name: 'Studio' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText('A studio has 0 bedrooms'),
    ).toBeInTheDocument();
    expect(api.requestCount(HOST_LISTING)).toBe(1);
  });

  it('shows on the guests field that a booking has more guests', async () => {
    const user = userEvent.setup();
    stubEditor({
      routes: {
        [`PATCH ${HOST_LISTING}`]: jsonResponse(
          409,
          apiErrorBody(
            409,
            'MAX_GUESTS_BELOW_BOOKING',
            'An active booking has 3 guests',
          ),
        ),
      },
    });
    renderRoute(PAGE, { signedIn: true });

    const guests = await screen.findByLabelText('Maximum guests');
    await user.clear(guests);
    await user.type(guests, '2');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(
      await screen.findByText(
        'An active booking has 3 guests. Keep at least that many.',
      ),
    ).toBeInTheDocument();
    expect(guests).toHaveAttribute('aria-invalid', 'true');
    // Only on the field, not also above the form.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it.each([
    ['an id that is not a listing id', '/adriatic/host/listings/nope'],
    ["another tenant's listing", PAGE],
  ])('says the listing is not found for %s', async (_case, path) => {
    stubEditor({
      routes: {
        [`GET ${HOST_LISTING}`]: jsonResponse(
          404,
          apiErrorBody(404, 'LISTING_NOT_FOUND', 'Listing not found'),
        ),
      },
    });
    renderRoute(path, { signedIn: true });

    expect(await screen.findByText('Listing not found')).toBeInTheDocument();
  });
});

describe('HostListingPage — blocking calendar', () => {
  it('tells booked days from blocked ones; only booked ones cannot be selected', async () => {
    const user = userEvent.setup();
    stubEditor({ booked: [day(5)], blocked: [day(9)] });
    renderRoute(PAGE, { signedIn: true });
    await showNextMonth(user);

    expect(await dayButton(day(5), 'booked')).toBeDisabled();
    expect(await dayButton(day(10), 'available')).toBeEnabled();

    // Only what the selection can change is offered.
    await user.click(await dayButton(day(9), 'blocked'));
    expect(screen.getByRole('button', { name: 'Block' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Unblock' })).toBeEnabled();
    await user.click(await dayButton(day(10), 'available'));
    expect(screen.getByRole('button', { name: 'Block' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Unblock' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await user.click(await dayButton(day(10), 'available'));
    expect(screen.getByRole('button', { name: 'Unblock' })).toBeDisabled();
  });

  it('blocks a selected day, which then shows as blocked', async () => {
    const user = userEvent.setup();
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 1);
    const api = stubEditor();
    renderRoute(PAGE, { signedIn: true });
    await showNextMonth(user);

    await user.click(await dayButton(day(12), 'available'));
    expect(
      screen.getByText(`Selected 1 day: ${formatLongDate(day(12))}`),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Block' }));

    expect(await dayButton(day(12), 'blocked')).toBeInTheDocument();
    expect(success).toHaveBeenCalledWith(
      `Blocked 1 day: ${formatLongDate(day(12))}`,
    );
    expect(api.blockedRanges).toEqual([{ from: day(12), to: day(13) }]);
  });

  it('unblocks a selected range as [first day, day after the last)', async () => {
    const user = userEvent.setup();
    vi.spyOn(toast, 'success').mockImplementation(() => 1);
    const api = stubEditor({ blocked: [day(3), day(4)] });
    renderRoute(PAGE, { signedIn: true });
    await showNextMonth(user);

    await user.click(await dayButton(day(2), 'available'));
    await user.click(await dayButton(day(4), 'blocked'));
    expect(screen.getByText(/^Selected 3 days:/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unblock' }));

    expect(await dayButton(day(4), 'available')).toBeInTheDocument();
    expect(await dayButton(day(3), 'available')).toBeInTheDocument();
    expect(api.unblockedRanges).toEqual([{ from: day(2), to: day(5) }]);
  });

  it("shows the API's refusal when a day of the range is booked", async () => {
    const user = userEvent.setup();
    stubEditor({
      routes: {
        [`POST ${BLOCKED_DAYS}`]: jsonResponse(
          409,
          apiErrorBody(409, 'DAY_ALREADY_BOOKED', `${day(3)} is booked`),
        ),
      },
    });
    renderRoute(PAGE, { signedIn: true });
    await showNextMonth(user);

    await user.click(await dayButton(day(3), 'available'));
    await user.click(screen.getByRole('button', { name: 'Block' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      `${day(3)} is booked`,
    );
  });
});
