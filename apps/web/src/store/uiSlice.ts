import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';
import type { ToastTone } from '../components/ui/Toast';

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  message: string;
  requestId?: string;
}

export interface UiState {
  toasts: ToastMessage[];
}

/** Older toasts are dropped beyond this, so a burst of errors cannot fill the screen. */
export const MAX_TOASTS = 3;

const initialState: UiState = { toasts: [] };

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toastShown: {
      reducer(state, action: PayloadAction<ToastMessage>) {
        state.toasts.push(action.payload);
        state.toasts = state.toasts.slice(-MAX_TOASTS);
      },
      prepare(toast: Omit<ToastMessage, 'id'>) {
        return { payload: { ...toast, id: nanoid() } };
      },
    },
    toastDismissed(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter(
        (toast) => toast.id !== action.payload,
      );
    },
  },
});

export const { toastShown, toastDismissed } = uiSlice.actions;
