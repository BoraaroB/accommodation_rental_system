import { addDays, startOfMonth, today, type HostBooking } from '@ars/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { formatDateRange, formatLongDate } from '../lib/format';
import {
  apiErrorBody,
  jsonResponse,
  stubApi,
  type StubRoutes,
} from '../test/apiStub';
import { aListing, aPage, aTenant, aUser } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

const BOOKINGS = '/tenants/adriatic/host/bookings';
const LISTINGS = '/tenants/adriatic/host/listings';
const listing = aListing();
const loft = aListing({
  id: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
  title: 'Old town loft',
  city: 'Zagreb',
});
const inDays = (days: number) => addDays(today(), days);

function aBooking(overrides: Partial<HostBooking> = {}): HostBooking {
  return {
    id: '3e4f5a6b-7c8d-4e9f-8a0b-1c2d3e4f5a6b',
    listingId: listing.id,
    checkIn: inDays(-1),
    checkOut: inDays(2),
    guests: 2,
    status: 'confirmed',
    listingTitle: listing.title,
    totalCents: 36000,
    ...overrides,
  };
}

/** A host of Adriatic; the listing picker offers `listing`, and `loft` to a search for it. */
function stubBookings(bookings: unknown, routes: StubRoutes = {}) {
  return stubApi({
    'GET /tenants/adriatic': aTenant(),
    'GET /auth/me': aUser({
      hostOf: [{ slug: 'adriatic', name: 'Adriatic Stays' }],
    }),
    [`GET ${BOOKINGS}`]: bookings,
    [`GET ${LISTINGS}`]: (url: URL) =>
      url.searchParams.get('q') === 'loft' ? aPage([loft]) : aPage([listing]),
    ...routes,
  });
}

const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

describe('HostBookingsPage', () => {
  it('shows each booking with its nights, total, status and timing', async () => {
    stubBookings(
      aPage([
        aBooking(),
        aBooking({
          id: '4f5a6b7c-8d9e-4f0a-9b1c-2d3e4f5a6b7c',
          checkIn: inDays(-10),
          checkOut: inDays(-7),
          guests: 1,
          totalCents: 36050,
        }),
        aBooking({
          id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
          checkIn: inDays(5),
          checkOut: inDays(6),
          status: 'cancelled',
        }),
      ]),
    );
    renderRoute('/adriatic/host/bookings', { signedIn: true });

    expect(await screen.findByText('3 bookings')).toBeInTheDocument();
    const [, inProgress, past, cancelled] = screen.getAllByRole('row');
    const dates = formatDateRange(inDays(-1), inDays(2));
    expect(cellsOf(inProgress)).toEqual([
      `Sea view apartment${dates} · 3 nights · 2 guests`,
      dates,
      '3',
      '2',
      // The stored status, and where the stay is today (D-013).
      'ConfirmedIn progress',
      '€360',
    ]);
    expect(cellsOf(past)[4]).toBe('ConfirmedPast');
    expect(cellsOf(past)[5]).toBe('€360.50');
    expect(cellsOf(cancelled)[4]).toBe('Cancelled');
    expect(
      within(inProgress).getByRole('link', { name: 'Sea view apartment' }),
    ).toHaveAttribute('href', `/adriatic/host/listings/${listing.id}`);
  });

  it('filters by status through the URL, from the first page', async () => {
    const user = userEvent.setup();
    const api = stubBookings(aPage([aBooking()]));
    const { router } = renderRoute('/adriatic/host/bookings?page=2', {
      signedIn: true,
    });

    await user.click(await screen.findByLabelText('Status'));
    await user.click(await screen.findByRole('option', { name: 'Cancelled' }));

    await vi.waitFor(() =>
      expect(router.state.location.search).toBe('?status=cancelled'),
    );
    await vi.waitFor(() =>
      expect(api.lastQuery(BOOKINGS)).toEqual({
        status: 'cancelled',
        page: '1',
        pageSize: '24',
      }),
    );
  });

  it('finds a listing to filter by, searching as the host types', async () => {
    const user = userEvent.setup();
    const api = stubBookings(aPage([aBooking()]), {
      [`GET ${LISTINGS}/${loft.id}`]: loft,
    });
    const { router } = renderRoute('/adriatic/host/bookings', {
      signedIn: true,
    });

    await user.type(await screen.findByLabelText('Listing'), 'loft');
    const option = await screen.findByRole('option', { name: 'Old town loft' });
    expect(api.lastQuery(LISTINGS)).toMatchObject({ q: 'loft' });
    await user.click(option);

    await vi.waitFor(() =>
      expect(router.state.location.search).toBe(`?listingId=${loft.id}`),
    );
    await vi.waitFor(() =>
      expect(api.lastQuery(BOOKINGS)).toMatchObject({ listingId: loft.id }),
    );
    await vi.waitFor(() =>
      expect(screen.getByLabelText('Listing')).toHaveValue('Old town loft'),
    );
    // The chosen title in the input is no search: every listing is offered again.
    await user.click(screen.getByRole('button', { name: 'Show options' }));
    expect(
      await screen.findByRole('option', { name: 'Sea view apartment' }),
    ).toBeInTheDocument();
  });

  it('names a listing of another tenant in the URL as unknown', async () => {
    stubBookings(aPage([]), {
      [`GET ${LISTINGS}/${loft.id}`]: jsonResponse(
        404,
        apiErrorBody(404, 'LISTING_NOT_FOUND', 'Listing not found'),
      ),
    });
    renderRoute(`/adriatic/host/bookings?listingId=${loft.id}`, {
      signedIn: true,
    });

    await vi.waitFor(() =>
      expect(screen.getByLabelText('Listing')).toHaveValue('Unknown listing'),
    );
  });

  it('filters by dates once both days are picked, past ones too', async () => {
    const user = userEvent.setup();
    const api = stubBookings(aPage([aBooking()]));
    const { router } = renderRoute('/adriatic/host/bookings', {
      signedIn: true,
    });
    const first = startOfMonth(today());

    // The page has loaded, so the picker does not render again under the clicks.
    await screen.findByText('1 booking');
    await user.click(screen.getByLabelText('Dates'));
    await user.click(
      await screen.findByRole('button', { name: formatLongDate(first) }),
    );
    expect(router.state.location.search).toBe('');
    await user.click(
      screen.getByRole('button', { name: formatLongDate(addDays(first, 2)) }),
    );

    await vi.waitFor(() =>
      expect(router.state.location.search).toBe(
        `?from=${first}&to=${addDays(first, 2)}`,
      ),
    );
    await vi.waitFor(() =>
      expect(api.lastQuery(BOOKINGS)).toMatchObject({
        from: first,
        to: addDays(first, 2),
      }),
    );
  });

  it("shows the URL's listing by its title and clears every filter", async () => {
    const user = userEvent.setup();
    stubBookings(
      (url: URL) =>
        url.searchParams.has('listingId') ? aPage([]) : aPage([aBooking()]),
      { [`GET ${LISTINGS}/${loft.id}`]: loft },
    );
    const { router } = renderRoute(
      `/adriatic/host/bookings?listingId=${loft.id}&status=completed`,
      { signedIn: true },
    );

    expect(
      await screen.findByText('No bookings match these filters'),
    ).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(screen.getByLabelText('Listing')).toHaveValue('Old town loft'),
    );
    await user.click(
      within(screen.getByRole('main')).getAllByRole('button', {
        name: 'Clear filters',
      })[0],
    );

    expect(await screen.findByText('1 booking')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });
});
