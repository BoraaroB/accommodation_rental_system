import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { stubApi, type StubRoutes } from '../test/apiStub';
import { aListing, aPage, aTenant, aUser } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

const LISTINGS = '/tenants/adriatic/host/listings';
const split = aListing();
const zagreb = aListing({
  id: '7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f',
  title: 'Old town loft',
  city: 'Zagreb',
  propertyType: 'loft',
  maxGuests: 2,
  bedrooms: 1,
  pricePerNightCents: 8950,
});

/** A signed-in host of Adriatic whose listing table answers with `listings`. */
function stubHostPanel(listings: unknown, routes: StubRoutes = {}) {
  return stubApi({
    'GET /tenants/adriatic': aTenant(),
    'GET /auth/me': aUser({
      hostOf: [{ slug: 'adriatic', name: 'Adriatic Stays' }],
    }),
    [`GET ${LISTINGS}`]: listings,
    ...routes,
  });
}

describe('HostListingsPage', () => {
  it("lists the tenant's listings, each opening its editor", async () => {
    stubHostPanel(aPage([split, zagreb]));
    renderRoute('/adriatic/host/listings', { signedIn: true });

    expect(await screen.findByText('2 listings')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(
      within(rows[2])
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual([
      'Old town loftZagreb · Loft',
      'Zagreb',
      'Loft',
      '2',
      '1',
      '€89.50',
    ]);
    expect(
      screen.getByRole('link', { name: 'Sea view apartment' }),
    ).toHaveAttribute('href', `/adriatic/host/listings/${split.id}`);
  });

  it('searches by title or city through the URL', async () => {
    const user = userEvent.setup();
    const api = stubHostPanel((url: URL) =>
      url.searchParams.get('q') === 'Zagreb'
        ? aPage([zagreb])
        : aPage([split, zagreb]),
    );
    const { router } = renderRoute('/adriatic/host/listings?page=2', {
      signedIn: true,
    });

    await user.type(
      await screen.findByRole('searchbox', { name: 'Search listings' }),
      ' Zagreb ',
    );
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('1 listing')).toBeInTheDocument();
    // A new search starts on the first page.
    expect(router.state.location.search).toBe('?q=Zagreb');
    expect(api.lastQuery(LISTINGS)).toEqual({
      q: 'Zagreb',
      pageSize: '24',
      page: '1',
    });
  });

  it('offers to clear a search that matches nothing', async () => {
    const user = userEvent.setup();
    stubHostPanel((url: URL) =>
      url.searchParams.has('q') ? aPage([]) : aPage([split]),
    );
    const { router } = renderRoute('/adriatic/host/listings?q=Paris', {
      signedIn: true,
    });

    await user.click(
      await screen.findByRole('button', { name: 'Clear the search' }),
    );

    expect(await screen.findByText('1 listing')).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
    expect(
      screen.getByRole('searchbox', { name: 'Search listings' }),
    ).toHaveValue('');
  });

  it('links to the other pages of the table', async () => {
    stubHostPanel(aPage([split], { page: 1, total: 30 }));
    renderRoute('/adriatic/host/listings?q=a', { signedIn: true });

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /next/i })).toHaveAttribute(
      'href',
      '/adriatic/host/listings?q=a&page=2',
    );
  });
});
