import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  /** The signed-in user's access token; `null` when signed out. */
  token: string | null;
}

const initialState: AuthState = { token: null };

/**
 * Who is signed in, as far as the client keeps it: only the token. The
 * profile and the rights come from `GET /auth/me`, never from the token
 * (D-007).
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn(state, action: PayloadAction<string>) {
      state.token = action.payload;
    },
    signedOut(state) {
      state.token = null;
    },
  },
  selectors: {
    selectToken: (state) => state.token,
  },
});

export const { signedIn, signedOut } = authSlice.actions;
export const { selectToken } = authSlice.selectors;
