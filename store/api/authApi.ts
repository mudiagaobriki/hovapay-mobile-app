// store/api/authApi.ts - Updated with new OTP endpoints
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

interface OTPRequest {
  username: string; // can be email, phone, or username
}

interface VerifyOTPRequest {
  username: string;
  otp: string;
}

interface ResetPasswordRequest {
  resetToken: string;
  password: string;
}

interface OTPResponse {
  message: string;
  channels?: {
    email: boolean;
    sms: boolean;
  };
  expiresAt?: string;
}

interface VerifyOTPResponse {
  message: string;
  resetToken: string;
  user?: {
    email: string;
    firstName: string;
  };
}

interface OTPServiceStatusResponse {
  message: string;
  services: {
    email: {
      available: boolean;
      service: string;
    };
    sms: {
      available: boolean;
      service: string;
    };
  };
}

interface ApiError {
  message: string;
  details?: string[];
  lockout?: boolean;
  lockoutUntil?: string;
  attemptsRemaining?: number;
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://hovapay-api.onrender.com/api', // Your backend URL
    // baseUrl: 'http://192.168.0.144:3040/api', // Your backend URL
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

    // Enhanced OTP-based password reset endpoints
    sendForgotPasswordOTPEnhanced: builder.mutation<OTPResponse, OTPRequest>({
      query: (data) => ({
        url: '/users/email/password-reset-otp-enhanced',
        method: 'POST',
        body: data,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Failed to send OTP',
          details: response.data?.details,
        };
      },
    }),

    verifyResetOTPEnhanced: builder.mutation<VerifyOTPResponse, VerifyOTPRequest>({
      query: (data) => ({
        url: '/users/email/verify-reset-otp-enhanced',
        method: 'POST',
        body: data,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'OTP verification failed',
          details: response.data?.details,
          lockout: response.data?.lockout,
          lockoutUntil: response.data?.lockoutUntil,
          attemptsRemaining: response.data?.attemptsRemaining,
        };
      },
    }),

    resetPassword: builder.mutation<{ message: string }, ResetPasswordRequest>({
      query: (data) => ({
        url: '/users/reset-password',
        method: 'POST',
        body: data,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Password reset failed',
          details: response.data?.details,
        };
      },
    }),

    // Account verification OTP
    sendAccountVerificationOTP: builder.mutation<OTPResponse, { identifier: string }>({
      query: (data) => ({
        url: '/users/account-verification-otp',
        method: 'POST',
        body: data,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Failed to send verification OTP',
          details: response.data?.details,
        };
      },
    }),

    // Get OTP service status
    getOTPServiceStatus: builder.query<OTPServiceStatusResponse, void>({
      query: () => ({
        url: '/users/otp-service-status',
        method: 'GET',
      }),
    }),

    // Legacy endpoints (kept for backward compatibility)
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

  // Enhanced OTP endpoints
  useSendForgotPasswordOTPEnhancedMutation,
  useVerifyResetOTPEnhancedMutation,
  useResetPasswordMutation,

  // Legacy endpoints (for backward compatibility)
  useSendForgotPasswordOTPMutation,
  useVerifyResetOTPMutation,

  useResendVerificationEmailMutation,
} = authApi;