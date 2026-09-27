import { describe, expect, it } from 'vitest';
import { aUser } from '../../test/fixtures';
import {
  postSignInDestination,
  registerPath,
  safeRedirect,
  signInPath,
} from './redirects';

const adriatic = { slug: 'adriatic', name: 'Adriatic Stays' };
const alpine = { slug: 'alpine', name: 'Alpine Chalets' };

describe('postSignInDestination', () => {
  it('returns to the page the user came from', () => {
    expect(
      postSignInDestination(aUser({ isSuperadmin: true }), '/adriatic'),
    ).toBe('/adriatic');
  });

  it.each([
    ['a superadmin', aUser({ isSuperadmin: true }), '/admin'],
    ['the host of one portal', aUser({ hostOf: [adriatic] }), '/adriatic/host'],
    ['a client', aUser(), '/'],
  ])('sends %s to their start page', (_case, user, destination) => {
    expect(postSignInDestination(user, undefined)).toBe(destination);
  });

  it('lets the host of several portals choose', () => {
    expect(
      postSignInDestination(aUser({ hostOf: [adriatic, alpine] }), undefined),
    ).toBeNull();
  });
});

describe('safeRedirect', () => {
  it('keeps a path inside the app', () => {
    expect(safeRedirect('/adriatic/host?x=1')).toBe('/adriatic/host?x=1');
  });

  it.each([null, '', '//evil.example', 'https://evil.example', '/login'])(
    'drops %s',
    (value) => {
      expect(safeRedirect(value)).toBeUndefined();
    },
  );
});

describe('sign-in paths', () => {
  it('carries the redirect encoded', () => {
    expect(signInPath('/adriatic?city=Split')).toBe(
      '/login?redirect=%2Fadriatic%3Fcity%3DSplit',
    );
    expect(registerPath('/admin')).toBe('/register?redirect=%2Fadmin');
  });

  it('has no query without a redirect', () => {
    expect(signInPath()).toBe('/login');
    expect(registerPath()).toBe('/register');
  });
});
