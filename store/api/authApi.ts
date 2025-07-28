// store/api/authApi.ts - Updated with Enhanced OTP Support (Email + SMS)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@/store';
import { User } from '../slices/authSlice';

interface LoginRequest {
  email: string; // can be username, email, or phone (your backend uses 'email' field)
  password: string;
}

interface BiometricLoginRequest {
  identifier: string; // email, username, or phone
  biometricType: string; // 'Face ID', 'Fingerprint', etc.
  deviceId: string;
  biometricData?: string; // Optional biometric signature/hash
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

// ENHANCED: Updated OTP Response with multi-channel support
interface EnhancedOTPResponse {
  message: string;
  channels: string[]; // ['email', 'sms'] - which channels were used
  expiresAt?: string;
  deliveryStatus: {
    email: boolean;
    sms: boolean;
    totalChannels: number;
  };
}

interface VerifyOTPResponse {
  message: string;
  resetToken: string;
  user?: {
    email: string;
    firstName: string;
  };
}

// ENHANCED: Updated service status response
interface OTPServiceStatusResponse {
  message: string;
  services: {
    email: {
      available: boolean;
      service: string;
      status: string;
    };
    sms: {
      available: boolean;
      service: string;
      status: string;
    };
  };
  summary: {
    totalAvailableChannels: number;
    activeChannels: string[];
    emailAvailable: boolean;
    smsAvailable: boolean;
    hasBackup: boolean;
  };
}

interface ApiError {
  message: string;
  details?: string[];
  lockout?: boolean;
  lockoutUntil?: string;
  attemptsRemaining?: number;
  availableChannels?: string[];
}

interface BiometricSetupRequest {
  biometricType: string;
  deviceId: string;
  deviceName?: string;
  biometricData?: string;
}

interface BiometricValidationRequest {
  identifier: string;
  biometricType: string;
  deviceId: string;
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
  tagTypes: ['User', 'BiometricAuth'],
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
      invalidatesTags: ['User'],
    }),

    // Biometric login endpoint
    biometricLogin: builder.mutation<AuthResponse, BiometricLoginRequest>({
      query: (credentials) => ({
        url: '/users/biometric-login',
        method: 'POST',
        body: credentials,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Biometric login failed',
          details: response.data?.details,
        };
      },
      invalidatesTags: ['User', 'BiometricAuth'],
    }),

    // Check if user can use biometric login
    checkBiometricEligibility: builder.mutation<{ eligible: boolean; biometricType?: string; reason?: string }, { identifier: string }>({
      query: (data) => ({
        url: '/users/check-biometric-eligibility',
        method: 'POST',
        body: data,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Failed to check biometric eligibility',
          details: response.data?.details,
        };
      },
    }),

    // Setup biometric authentication after successful login
    setupBiometricAuth: builder.mutation<{ message: string; success: boolean }, BiometricSetupRequest>({
      query: (data) => ({
        url: '/users/setup-biometric',
        method: 'POST',
        body: data,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Failed to setup biometric authentication',
          details: response.data?.details,
        };
      },
      invalidatesTags: ['BiometricAuth', 'User'],
    }),

    // Validate biometric data before login
    validateBiometricAuth: builder.mutation<{ valid: boolean; user?: Partial<User> }, BiometricValidationRequest>({
      query: (data) => ({
        url: '/users/validate-biometric',
        method: 'POST',
        body: data,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Biometric validation failed',
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

    // ENHANCED: New password reset endpoints that support Email + SMS
    sendPasswordResetOTP: builder.mutation<EnhancedOTPResponse, OTPRequest>({
      query: (data) => ({
        url: '/users/password-reset/send-otp',
        method: 'POST',
        body: data,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Failed to send OTP',
          details: response.data?.details,
          availableChannels: response.data?.availableChannels,
        };
      },
    }),

    verifyPasswordResetOTP: builder.mutation<VerifyOTPResponse, VerifyOTPRequest>({
      query: (data) => ({
        url: '/users/password-reset/verify-otp',
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

    // ENHANCED: Account verification with Email + SMS
    sendAccountVerificationOTP: builder.mutation<EnhancedOTPResponse, { identifier: string }>({
      query: (data) => ({
        url: '/users/account-verification/send-otp',
        method: 'POST',
        body: data,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Failed to send verification OTP',
          details: response.data?.details,
          availableChannels: response.data?.availableChannels,
        };
      },
    }),

    verifyAccountVerificationOTP: builder.mutation<{ message: string; user: Partial<User> }, VerifyOTPRequest>({
      query: (data) => ({
        url: '/users/account-verification/verify-otp',
        method: 'POST',
        body: data,
      }),
      transformErrorResponse: (response: { status: string | number; data: ApiError }) => {
        return {
          status: response.status,
          message: response.data?.message || 'Account verification failed',
          details: response.data?.details,
          lockout: response.data?.lockout,
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

    // ENHANCED: Get OTP service status to show available channels
    getOTPServiceStatus: builder.query<OTPServiceStatusResponse, void>({
      query: () => ({
        url: '/users/otp-service/status',
        method: 'GET',
      }),
    }),

    // LEGACY ENDPOINTS (for backward compatibility)
    sendForgotPasswordOTPEnhanced: builder.mutation<EnhancedOTPResponse, OTPRequest>({
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
  useBiometricLoginMutation,
  useCheckBiometricEligibilityMutation,
  useSetupBiometricAuthMutation,
  useValidateBiometricAuthMutation,
  useRegisterMutation,
  useValidateUsernameMutation,
  useLogoutMutation,

  // ENHANCED: New OTP endpoints that support Email + SMS
  useSendPasswordResetOTPMutation,
  useVerifyPasswordResetOTPMutation,
  useSendAccountVerificationOTPMutation,
  useVerifyAccountVerificationOTPMutation,
  useResetPasswordMutation,
  useGetOTPServiceStatusQuery,

  // Legacy enhanced endpoints (for backward compatibility)
  useSendForgotPasswordOTPEnhancedMutation,
  useVerifyResetOTPEnhancedMutation,

  // Legacy endpoints (for backward compatibility)
  useSendForgotPasswordOTPMutation,
  useVerifyResetOTPMutation,

  useResendVerificationEmailMutation,
} = authApi;