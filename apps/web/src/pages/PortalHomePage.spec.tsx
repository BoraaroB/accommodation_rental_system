import { addDays, today, type IsoDate, type ListingDto } from '@ars/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatDateRange, formatLongDate } from '../lib/format';
import { stubApi } from '../test/apiStub';
import { aListing, aPage, aTenant } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

const LISTINGS = '/t/adriatic/listings';

type User = ReturnType<typeof userEvent.setup>;

function stubPortal(
  listings: (url: URL) => unknown = () => aPage([aListing()]),
) {
  return stubApi({
    'GET /t/adriatic': aTenant(),
    'GET /t/adriatic/cities': ['Split', 'Zadar'],
    [`GET ${LISTINGS}`]: listings,
  });
}

/** The filters the page sent with its last list request. */
async function lastListQuery(api: ReturnType<typeof stubApi>, count = 1) {
  await waitFor(() => expect(api.requestCount(LISTINGS)).toBe(count));
  return api.lastQuery(LISTINGS);
}

/** Clicks `day` in the open date picker, moving forward to its month. */
async function pickDay(user: User, day: IsoDate) {
  const name = new RegExp(`^${formatLongDate(day)}`);
  for (let month = 0; !screen.queryByRole('button', { name }); month += 1) {
    if (month > 12) {
      throw new Error(`${day} is not in the next twelve months`);
    }
    await user.click(screen.getByRole('button', { name: 'Next month' }));
  }
  await user.click(screen.getByRole('button', { name }));
}

/** Opens a select or combobox by its label and clicks one of its options. */
async function chooseOption(user: User, label: string, option: string) {
  await user.click(screen.getByLabelText(label));
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('PortalHomePage', () => {
  it('lists the listings the URL asks for', async () => {
    const api = stubPortal();
    renderRoute('/adriatic?city=Split&guests=2&sort=price_asc&page=2');

    expect(
      await screen.findByRole('link', { name: 'Sea view apartment' }),
    ).toHaveAttribute('href', '/adriatic/listings/' + aListing().id);
    expect(screen.getByText('1 stay found')).toBeInTheDocument();
    expect(await lastListQuery(api)).toEqual({
      city: 'Split',
      guests: '2',
      sort: 'price_asc',
      page: '2',
      pageSize: '24',
    });
  });

  it('searches by city, dates and guests and goes back to page 1', async () => {
    const user = userEvent.setup();
    const from = addDays(today(), 10);
    const to = addDays(today(), 13);
    const api = stubPortal();
    const { router } = renderRoute('/adriatic?page=3');
    await lastListQuery(api);

    await chooseOption(user, 'City', 'Zadar');
    await user.click(screen.getByLabelText('Dates'));
    await pickDay(user, from);
    await pickDay(user, to);
    await chooseOption(user, 'Guests', '2 guests');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    await waitFor(() =>
      expect(router.state.location.search).toBe(
        `?city=Zadar&guests=2&from=${from}&to=${to}`,
      ),
    );
    expect(await lastListQuery(api, 2)).toMatchObject({
      city: 'Zadar',
      guests: '2',
      from,
      to,
      page: '1',
    });
  });

  it('closes the date picker once both days are picked and shows them', async () => {
    const user = userEvent.setup();
    const from = addDays(today(), 20);
    const to = addDays(today(), 22);
    stubPortal();
    renderRoute('/adriatic');

    await user.click(screen.getByLabelText('Dates'));
    await pickDay(user, from);
    await pickDay(user, to);

    await waitFor(() =>
      expect(screen.queryByRole('grid')).not.toBeInTheDocument(),
    );
    // The label and the chosen dates name the button. Intl puts thin spaces
    // around the dash, which the name keeps.
    expect(screen.getByLabelText('Dates')).toHaveAccessibleName(
      `Dates ${formatDateRange(from, to)}`,
    );
  });

  it('asks for a departure when only the arrival is picked', async () => {
    const user = userEvent.setup();
    const api = stubPortal();
    renderRoute('/adriatic');
    await lastListQuery(api);

    await user.click(screen.getByLabelText('Dates'));
    await pickDay(user, addDays(today(), 10));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(
      await screen.findByText('Choose a check-out date'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Dates')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(api.requestCount(LISTINGS)).toBe(1);
  });

  it('shows the stay total and links the detail with the searched dates', async () => {
    const from = addDays(today(), 10);
    const to = addDays(today(), 13);
    stubPortal();
    renderRoute(`/adriatic?from=${from}&to=${to}`);

    const title = await screen.findByRole('link', {
      name: 'Sea view apartment',
    });
    expect(title).toHaveAttribute(
      'href',
      `/adriatic/listings/${aListing().id}?from=${from}&to=${to}`,
    );
    const card = title.closest('article')!;
    expect(within(card).getByText(/3 nights/)).toHaveTextContent(
      '3 nights · €360',
    );
    expect(within(card).getByText(/per night/)).toHaveTextContent(
      '€120 per night',
    );
  });

  it('filters by a price typed in euros, sent in cents', async () => {
    const user = userEvent.setup();
    const api = stubPortal();
    renderRoute('/adriatic');
    await lastListQuery(api);

    await user.type(screen.getByLabelText('Min'), '50');
    await user.type(screen.getByLabelText('Max'), '150.5');
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(await lastListQuery(api, 2)).toMatchObject({
      minPriceCents: '5000',
      maxPriceCents: '15050',
    });
    expect(
      screen.getByRole('button', { name: 'Remove filter: €50 – €150.50' }),
    ).toBeInTheDocument();
  });

  it.each([
    [
      'a maximum below the minimum',
      '200',
      '100',
      'Must not be below the minimum',
    ],
    [
      'an amount that is not in euros',
      '',
      '12,5',
      'Enter an amount in euros, e.g. 80 or 79.99',
    ],
    [
      'an amount in another notation',
      '',
      '1e2',
      'Enter an amount in euros, e.g. 80 or 79.99',
    ],
  ])(
    'shows an error for %s and sends nothing',
    async (_, min, max, message) => {
      const user = userEvent.setup();
      const api = stubPortal();
      const { router } = renderRoute('/adriatic');
      await lastListQuery(api);

      if (min) {
        await user.type(screen.getByLabelText('Min'), min);
      }
      await user.type(screen.getByLabelText('Max'), max);
      await user.click(screen.getByRole('button', { name: 'Apply' }));

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.getByLabelText('Max')).toHaveAttribute(
        'aria-invalid',
        'true',
      );
      expect(router.state.location.search).toBe('');
      expect(api.requestCount(LISTINGS)).toBe(1);
    },
  );

  it('clears a typed price on Reset even when none was applied', async () => {
    const user = userEvent.setup();
    const api = stubPortal();
    renderRoute('/adriatic');
    await lastListQuery(api);

    await user.type(screen.getByLabelText('Min'), '50');
    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByLabelText('Min')).toHaveValue('');
  });

  it('empties the search and price controls when the filters are cleared', async () => {
    const user = userEvent.setup();
    const api = stubPortal();
    renderRoute('/adriatic?city=Split&guests=2&minPriceCents=5000');
    await lastListQuery(api);
    expect(screen.getByLabelText('City')).toHaveValue('Split');

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    await lastListQuery(api, 2);
    expect(screen.getByLabelText('City')).toHaveValue('');
    expect(screen.getByLabelText('Guests')).toHaveTextContent('Any');
    expect(screen.getByLabelText('Min')).toHaveValue('');
  });

  it('removes one filter with its chip', async () => {
    const user = userEvent.setup();
    const api = stubPortal();
    renderRoute('/adriatic?city=Split&guests=2');
    await lastListQuery(api);

    await user.click(
      screen.getByRole('button', { name: 'Remove filter: Split' }),
    );

    const query = await lastListQuery(api, 2);
    expect(query).not.toHaveProperty('city');
    expect(query).toMatchObject({ guests: '2' });
  });

  it('changes the sort and goes back to page 1', async () => {
    const user = userEvent.setup();
    stubPortal();
    const { router } = renderRoute('/adriatic?page=2');

    await chooseOption(user, 'Sort by', 'Price (lowest first)');

    expect(router.state.location.search).toBe('?sort=price_asc');
  });

  it('keeps a city from the URL selected even when the portal has no such city', async () => {
    const api = stubPortal();
    renderRoute('/adriatic?city=Rijeka');
    await waitFor(() => expect(api.requestCount('/t/adriatic/cities')).toBe(1));

    expect(screen.getByLabelText('City')).toHaveValue('Rijeka');
  });

  it('links the other pages of the same results', async () => {
    stubPortal((url) =>
      aPage([aListing()], {
        page: Number(url.searchParams.get('page')),
        total: 50,
      }),
    );
    renderRoute('/adriatic?city=Split&page=2');

    const pagination = await screen.findByRole('navigation', {
      name: 'Pagination',
    });
    expect(within(pagination).getByText('Page 2 of 3')).toBeInTheDocument();
    expect(
      within(pagination).getByRole('link', { name: 'Go to previous page' }),
    ).toHaveAttribute('href', '/adriatic?city=Split');
    expect(
      within(pagination).getByRole('link', { name: 'Go to next page' }),
    ).toHaveAttribute('href', '/adriatic?city=Split&page=3');
  });

  it('offers to clear the filters when nothing matches', async () => {
    const user = userEvent.setup();
    stubPortal(() => aPage<ListingDto>([]));
    const { router } = renderRoute('/adriatic?city=Split&sort=price_desc');

    expect(
      await screen.findByText('No stays match your search'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(router.state.location.search).toBe('?sort=price_desc');
  });

  it('links the first page when the page asked for is past the last one', async () => {
    stubPortal(() => aPage<ListingDto>([], { page: 5, total: 30 }));
    renderRoute('/adriatic?city=Split&page=5');

    expect(await screen.findByText('This page is empty')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Go to the first page' }),
    ).toHaveAttribute('href', '/adriatic?city=Split');
  });

  it('opens the filters in a sheet and closes it on Apply', async () => {
    const user = userEvent.setup();
    const api = stubPortal();
    renderRoute('/adriatic');
    await lastListQuery(api);

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    await user.type(within(sheet).getByLabelText('Min'), '80');
    await user.click(within(sheet).getByRole('button', { name: 'Apply' }));

    expect(await lastListQuery(api, 2)).toMatchObject({
      minPriceCents: '8000',
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('closes the sheet with its close button and opens it again', async () => {
    const user = userEvent.setup();
    stubPortal();
    renderRoute('/adriatic');

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    await user.click(within(sheet).getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    expect(
      await screen.findByRole('dialog', { name: 'Filters' }),
    ).toBeInTheDocument();
  });
});
