import { createListenerMiddleware } from '@reduxjs/toolkit';
import { baseApi } from '../api/baseApi';
import { tokenStorage } from '../lib/tokenStorage';
import { signedIn, signedOut } from './authSlice';

/**
 * The side effects of signing in and out: the token is kept between visits,
 * and a sign-out drops every cached response, so nothing of the previous user
 * (their profile, a host's data) is shown to the next one.
 */
export function createAuthListener() {
  const listener = createListenerMiddleware();
  listener.startListening({
    actionCreator: signedIn,
    effect: (action) => tokenStorage.save(action.payload),
  });
  listener.startListening({
    actionCreator: signedOut,
    effect: (_action, api) => {
      tokenStorage.clear();
      api.dispatch(baseApi.util.resetApiState());
    },
  });
  return listener;
}
