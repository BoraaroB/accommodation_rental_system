import {
  accessTokenSchema,
  loginSchema,
  registerSchema,
  userProfileSchema,
  type AccessToken,
  type LoginInput,
  type RegisterInput,
  type UserProfile,
} from '@ars/shared';
import { baseApi } from '../../api/baseApi';
import { signedIn } from '../../store/authSlice';

/** Sign-in, registration and the signed-in user (D-007, D-065). */
export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Signs in: the token goes into the auth slice. */
    login: build.mutation<AccessToken, LoginInput>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      argSchema: loginSchema,
      responseSchema: accessTokenSchema,
      async onQueryStarted(_input, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(signedIn(data.accessToken));
        } catch {
          // The form shows the error.
        }
      },
    }),
    /** Creates a client account (D-008); it does not sign in. */
    register: build.mutation<UserProfile, RegisterInput>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      argSchema: registerSchema,
      responseSchema: userProfileSchema,
    }),
    /** Who the signed-in user is and what they host; for UI gating only. */
    getMe: build.query<UserProfile, void>({
      query: () => '/auth/me',
      responseSchema: userProfileSchema,
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useGetMeQuery } = authApi;
