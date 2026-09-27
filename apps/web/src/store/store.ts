import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../api/baseApi';
import { tokenStorage } from '../lib/tokenStorage';
import { createAuthListener } from './authListener';
import { authSlice, type AuthState } from './authSlice';
import { rtkErrorMiddleware } from './rtkErrorMiddleware';
import { uiSlice } from './uiSlice';

/**
 * Creates the Redux store, signed in when a token was kept from an earlier
 * visit; tests create a fresh one each and may pass the auth state.
 */
export function makeStore(auth: AuthState = { token: tokenStorage.read() }) {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      [authSlice.reducerPath]: authSlice.reducer,
      [uiSlice.reducerPath]: uiSlice.reducer,
    },
    preloadedState: { [authSlice.reducerPath]: auth },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .prepend(createAuthListener().middleware)
        .concat(baseApi.middleware, rtkErrorMiddleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
