import { describe, expect, it } from 'vitest';
import { tenantsApi } from '../features/tenants/api';
import { TOKEN_KEY } from '../lib/tokenStorage';
import { stubApi } from '../test/apiStub';
import { aTenant } from '../test/fixtures';
import { selectToken, signedIn, signedOut } from './authSlice';
import { makeStore } from './store';

describe('auth state', () => {
  it('starts signed in with the token kept from an earlier visit', () => {
    localStorage.setItem(TOKEN_KEY, 'kept-token');
    expect(selectToken(makeStore().getState())).toBe('kept-token');
  });

  it('starts signed out without a kept token', () => {
    expect(selectToken(makeStore().getState())).toBeNull();
  });

  it('keeps the token after sign-in and forgets it after sign-out', () => {
    const store = makeStore();
    store.dispatch(signedIn('new-token'));
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');

    store.dispatch(signedOut());
    expect(selectToken(store.getState())).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('drops every cached response on sign-out', async () => {
    stubApi({ 'GET /tenants': [aTenant()] });
    const store = makeStore({ token: 'token' });
    const request = store.dispatch(tenantsApi.endpoints.getTenants.initiate());
    await request;
    const selectTenants = tenantsApi.endpoints.getTenants.select();
    expect(selectTenants(store.getState()).data).toHaveLength(1);

    store.dispatch(signedOut());
    expect(selectTenants(store.getState()).data).toBeUndefined();
    request.unsubscribe();
  });

  it.each([
    ['signed in', 'token-1', 'Bearer token-1'],
    ['signed out', null, null],
  ])(
    'sends the Authorization header only when %s',
    async (_case, token, header) => {
      const headers: (string | null)[] = [];
      stubApi({
        'GET /tenants': (_url: URL, request: Request) => {
          headers.push(request.headers.get('authorization'));
          return [];
        },
      });
      const store = makeStore({ token });
      const request = store.dispatch(
        tenantsApi.endpoints.getTenants.initiate(),
      );
      await request;
      request.unsubscribe();
      expect(headers).toEqual([header]);
    },
  );
});
