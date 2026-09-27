import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { assertNoUnexpectedRequests, resetApiStub } from './apiStub';

// jsdom does not scroll; `ScrollRestoration` calls this on every navigation.
window.scrollTo = () => {};

beforeEach(() => {
  resetApiStub();
});

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  assertNoUnexpectedRequests();
});
