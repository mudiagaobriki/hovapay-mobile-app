// store/api/authApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@/store';
import { User } from '../slices/authSlice';

interface LoginRequest {
  email: string; // can be username, email, or phone (your backend uses 'email' field)
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  phone: string;
  password: string;
  type: string; // required by your backend
}

interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

interface RegisterResponse {
  message: string;
  user: User;
}

interface ApiError {
  message: string;
  details?: string[];
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://192.168.148.122:3040/api', // Your backend URL
    prepareHeaders: (headers, { getState }) => {
      // Get the token from the state
      const token = (getState() as RootState).auth.token;

      // If we have a token, add it to the headers
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }

      // Set content type
      headers.set('content-type', 'application/json');

      return headers;
    },
  }),
  tagTypes: ['User'],
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/users/login',
        method: 'POST',
        body: credentials,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Login failed',
          details: response.data?.details,
        };
      },
    }),
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (userData) => ({
        url: '/users/register',
        method: 'POST',
        body: userData,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Registration failed',
          details: response.data?.details,
        };
      },
    }),
    validateUsername: builder.mutation<{ message: string }, { username: string }>({
      query: (data) => ({
        url: '/users/validate-username',
        method: 'POST',
        body: data,
      }),
    }),
    logout: builder.mutation<{ status: string; msg: string }, { email: string }>({
      query: (data) => ({
        url: `/users/logout?email=${data.email}`,
        method: 'GET',
      }),
    }),
    // Forgot password endpoints
    sendForgotPasswordOTP: builder.mutation<{ message: string }, { username: string }>({
      query: (data) => ({
        url: '/users/email/password-reset-otp',
        method: 'POST',
        body: data,
      }),
    }),
    verifyResetOTP: builder.mutation<{ message: string; resetToken: string }, { username: string; otp: string }>({
      query: (data) => ({
        url: '/users/email/verify-reset-otp',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation<{ message: string }, { resetToken: string; password: string }>({
      query: (data) => ({
        url: '/users/reset-password',
        method: 'POST',
        body: data,
      }),
    }),
    // Email verification
    resendVerificationEmail: builder.mutation<{ message: string }, { email: string }>({
      query: (data) => ({
        url: '/users/email/verify/resend',
        method: 'POST',
        body: data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useValidateUsernameMutation,
  useLogoutMutation,
  useSendForgotPasswordOTPMutation,
  useVerifyResetOTPMutation,
  useResetPasswordMutation,
  useResendVerificationEmailMutation,
} = authApi;