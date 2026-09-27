import {
  addDays,
  addMonths,
  startOfMonth,
  today,
  type IsoDate,
} from '@ars/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatLongDate } from '../lib/format';
import { apiErrorBody, jsonResponse, stubApi } from '../test/apiStub';
import { aListing, aPage, aTenant } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

const listing = aListing();
const LISTING = `/tenants/adriatic/listings/${listing.id}`;
const AVAILABILITY = `${LISTING}/availability`;
const inDays = (days: number) => addDays(today(), days);

/** A listing whose `takenDays` are unavailable; availability answers for any range. */
function stubListing(takenDays: IsoDate[] = [], overrides = {}) {
  return stubApi({
    'GET /tenants/adriatic': aTenant(),
    [`GET ${LISTING}`]: { ...listing, ...overrides },
    [`GET ${AVAILABILITY}`]: (url: URL) => {
      const from = url.searchParams.get('from')!;
      const to = url.searchParams.get('to')!;
      return {
        from,
        to,
        unavailableDays: takenDays.filter((day) => from <= day && day < to),
      };
    },
  });
}

describe('ListingDetailPage', () => {
  it('shows the listing', async () => {
    stubListing();
    renderRoute(`/adriatic/listings/${listing.id}`);

    expect(
      await screen.findByRole('heading', { name: 'Sea view apartment' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Split, Croatia')).toBeInTheDocument();
    expect(
      screen.getByText('Apartment · 4 guests · 2 bedrooms'),
    ).toBeInTheDocument();
    expect(screen.getByText(/per night/)).toHaveTextContent('€120 per night');
    expect(screen.getByText('4.6')).toBeInTheDocument();
    expect(screen.getByText('23 reviews')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to results' }),
    ).toHaveAttribute('href', '/adriatic');
  });

  it('shows "New" instead of a rating nobody has given', async () => {
    stubListing([], { rating: null, reviewCount: 0 });
    renderRoute(`/adriatic/listings/${listing.id}`);

    expect(await screen.findByText('New')).toBeInTheDocument();
    expect(screen.queryByText(/reviews?$/)).not.toBeInTheDocument();
  });

  it('strikes through the taken days of the calendar', async () => {
    // A searched stay opens the calendar on its month, whatever today is;
    // jsdom shows one month.
    const month = addMonths(startOfMonth(today()), 1);
    const taken = addDays(month, 2);
    stubListing([taken]);
    renderRoute(
      `/adriatic/listings/${listing.id}?from=${addDays(month, 10)}&to=${addDays(month, 12)}`,
    );

    expect(
      await screen.findByRole('gridcell', {
        name: `${formatLongDate(taken)}, unavailable`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('gridcell', {
        name: `${formatLongDate(addDays(month, 3))}, available`,
      }),
    ).toBeInTheDocument();
  });

  it.each([
    [[], 'Available for your dates'],
    [[inDays(11)], 'Not available for your dates'],
  ])(
    'tells whether the searched dates are free (taken: %j)',
    async (takenDays, verdict) => {
      stubListing(takenDays);
      renderRoute(
        `/adriatic/listings/${listing.id}?from=${inDays(10)}&to=${inDays(13)}`,
      );

      expect(await screen.findByText(/for your dates/)).toHaveTextContent(
        new RegExp(`^${verdict} \\(`),
      );
      expect(screen.getByText(/3 nights/)).toHaveTextContent('3 nights · €360');
    },
  );

  it('ignores searched dates in the past', async () => {
    stubListing();
    renderRoute(
      `/adriatic/listings/${listing.id}?from=${inDays(-2)}&to=${inDays(1)}`,
    );

    await screen.findByRole('heading', { name: 'Sea view apartment' });
    expect(screen.queryByText(/for your dates/)).not.toBeInTheDocument();
  });

  it('shows "Listing not found" when the portal has no such listing', async () => {
    stubApi({
      'GET /tenants/adriatic': aTenant(),
      [`GET ${LISTING}`]: jsonResponse(
        404,
        apiErrorBody(404, 'LISTING_NOT_FOUND', 'Listing not found'),
      ),
    });
    renderRoute(`/adriatic/listings/${listing.id}`);

    expect(await screen.findByText('Listing not found')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Retry' }),
    ).not.toBeInTheDocument();
  });

  it('shows "Listing not found" for a malformed id without asking the API', async () => {
    const api = stubApi({ 'GET /tenants/adriatic': aTenant() });
    renderRoute('/adriatic/listings/not-a-uuid');

    expect(await screen.findByText('Listing not found')).toBeInTheDocument();
    expect(api.requestCount('/tenants/adriatic/listings/not-a-uuid')).toBe(0);
  });

  it('goes back to the results it was opened from', async () => {
    const user = userEvent.setup();
    stubApi({
      'GET /tenants/adriatic': aTenant(),
      'GET /tenants/adriatic/cities': ['Split'],
      'GET /tenants/adriatic/listings': aPage([listing]),
      [`GET ${LISTING}`]: listing,
      [`GET ${AVAILABILITY}`]: (url: URL) => ({
        from: url.searchParams.get('from'),
        to: url.searchParams.get('to'),
        unavailableDays: [],
      }),
    });
    const { router } = renderRoute('/adriatic?city=Split&sort=price_asc');

    await user.click(
      await screen.findByRole('link', { name: 'Sea view apartment' }),
    );
    await user.click(
      await screen.findByRole('link', { name: 'Back to results' }),
    );

    expect(router.state.location.pathname).toBe('/adriatic');
    expect(router.state.location.search).toBe('?city=Split&sort=price_asc');
  });

  it("does not go back to another portal's page", async () => {
    stubListing();
    renderRoute({
      pathname: `/adriatic/listings/${listing.id}`,
      state: { backTo: '/adriatic-north?city=Split' },
    });

    expect(
      await screen.findByRole('link', { name: 'Back to results' }),
    ).toHaveAttribute('href', '/adriatic');
  });
});
