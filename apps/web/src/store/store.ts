import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../api/baseApi';
import { rtkErrorMiddleware } from './rtkErrorMiddleware';
import { uiSlice } from './uiSlice';

/** Creates the Redux store; tests create a fresh one each. */
export function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      [uiSlice.reducerPath]: uiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware, rtkErrorMiddleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
