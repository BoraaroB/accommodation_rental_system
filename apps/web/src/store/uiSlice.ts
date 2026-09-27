import { createSlice } from '@reduxjs/toolkit';

export interface UiState {
  /** The portal's filter sheet on phones. */
  filtersDrawerOpen: boolean;
}

const initialState: UiState = { filtersDrawerOpen: false };

/** UI state shared across components; toasts live in Sonner's own store. */
export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    filtersDrawerOpened(state) {
      state.filtersDrawerOpen = true;
    },
    filtersDrawerClosed(state) {
      state.filtersDrawerOpen = false;
    },
  },
});

export const { filtersDrawerOpened, filtersDrawerClosed } = uiSlice.actions;
