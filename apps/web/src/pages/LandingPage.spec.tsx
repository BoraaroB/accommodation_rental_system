import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stubApi } from '../test/apiStub';
import { aTenant } from '../test/fixtures';
import { renderRoute } from '../test/renderRoute';

describe('LandingPage', () => {
  it('has a navbar and links every portal', async () => {
    stubApi({
      'GET /tenants': [
        aTenant(),
        aTenant({ slug: 'west-europe', name: 'West Europe Stays' }),
      ],
    });
    renderRoute('/');

    expect(
      await screen.findByRole('link', { name: /Adriatic Stays/ }),
    ).toHaveAttribute('href', '/adriatic');
    expect(
      screen.getByRole('link', { name: /West Europe Stays/ }),
    ).toHaveAttribute('href', '/west-europe');
    expect(
      within(screen.getByRole('banner')).getByRole('link', {
        name: 'Accommodation Rental System',
      }),
    ).toHaveAttribute('href', '/');
  });
});
