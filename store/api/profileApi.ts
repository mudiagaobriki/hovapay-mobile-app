// store/api/profileApi.ts - Enhanced Profile API with Biometric Management
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@/store';

// Enhanced types with biometric support
interface UserProfile {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    username: string;
    verified: boolean;
    imageUrl?: string;
    country?: string;
    city?: string;
    address?: string;
    dateOfBirth?: string;
    gender?: string;
    hasTransactionPin: boolean;
    biometricSignIn: boolean;
    biometricTransactions: boolean;
    biometricType: string;
    fallbackBiometricTypes: string[];
    biometricHardwareLevel: string;
    biometricLastUsed?: string;
    biometricFailureCount: number;
    biometricSecurityScore?: number;
    privacySettings?: {
        profileVisibility: 'public' | 'private' | 'friends';
        emailNotifications: boolean;
        smsNotifications: boolean;
        transactionNotifications: boolean;
        marketingEmails: boolean;
        biometricNotifications: boolean;
    };
    walletSettings?: {
        autoTopUp: boolean;
        autoTopUpAmount: number;
        autoTopUpThreshold: number;
        transactionLimit: {
            daily: number;
            monthly: number;
        };
        biometricTransactionLimit: {
            daily: number;
            monthly: number;
        };
    };
    kycStatus?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'expired';
    kycLevel?: 0 | 1 | 2 | 3;
    accountTier?: 'basic' | 'standard' | 'premium' | 'enterprise';
    createdAt: string;
    updatedAt: string;
}

interface ProfileUpdatePayload {
    id: string;
    payload: Partial<UserProfile>;
}

interface SetPinPayload {
    pin: string;
}

interface ChangePinPayload {
    currentPin: string;
    newPin: string;
}

interface VerifyPinPayload {
    pin: string;
}

// Enhanced biometric setting payload
interface BiometricSettingPayload {
    setting: 'biometricSignIn' | 'biometricTransactions';
    enabled: boolean;
    biometricType?: string;
    fallbackBiometricTypes?: string[];
    biometricHardwareLevel?: string;
}

interface BiometricAttemptPayload {
    success: boolean;
    biometricType: string;
    failureReason?: string;
}

interface BiometricResetPayload {
    pin?: string;
    adminReset?: boolean;
}

interface BiometricStatus {
    isEnabled: boolean;
    signInEnabled: boolean;
    transactionsEnabled: boolean;
    primaryType: string;
    fallbackTypes: string[];
    hardwareLevel: string;
    lastUsed?: string;
    failureCount: number;
    securityScore: number;
    isLocked: boolean;
}

interface DeviceEnrollmentPayload {
    deviceId: string;
    deviceName: string;
    biometricTypes: string[];
    hardwareLevel: string;
}

interface ApiResponse<T = any> {
    status: 'success' | 'error';
    message?: string;
    msg?: string;
    data?: T;
}

export const profileApi = createApi({
    reducerPath: 'profileApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'https://hovapay-api.onrender.com' + '/api/profiles',
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as RootState).auth.token;
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ['Profile', 'UserSettings', 'BiometricSettings'],
    endpoints: (builder) => ({
        // ==================== EXISTING ENDPOINTS ====================

        // Get user profile
        getUserProfile: builder.query<ApiResponse<UserProfile>, void>({
            query: () => '/user',
            providesTags: ['Profile', 'BiometricSettings'],
        }),

        // Get profile by ID
        getProfileById: builder.query<ApiResponse<UserProfile>, string>({
            query: (id) => `/${id}`,
            providesTags: ['Profile'],
        }),

        // Get all profiles
        getAllProfiles: builder.query<ApiResponse<any>, { page: number; perPage: number; q?: string }>({
            query: ({ page, perPage, q }) => ({
                url: `/all/${page}/${perPage}`,
                params: q ? { q } : {},
            }),
            providesTags: ['Profile'],
        }),

        // Create new profile
        createProfile: builder.mutation<ApiResponse<UserProfile>, Partial<UserProfile>>({
            query: (payload) => ({
                url: '/new',
                method: 'POST',
                body: payload,
                headers: {
                    'content-type': 'application/json',
                },
            }),
            invalidatesTags: ['Profile'],
        }),

        // Update user profile
        updateUserProfile: builder.mutation<ApiResponse<UserProfile>, ProfileUpdatePayload>({
            query: ({ id, payload }) => ({
                url: '/update',
                method: 'PUT',
                body: { id, payload },
                headers: {
                    'content-type': 'application/json',
                },
            }),
            invalidatesTags: ['Profile'],
        }),

        // Edit profile
        editProfile: builder.mutation<ApiResponse<UserProfile>, { id: string; payload: Partial<UserProfile> }>({
            query: ({ id, payload }) => ({
                url: '/edit',
                method: 'POST',
                body: { id, payload },
                headers: {
                    'content-type': 'application/json',
                },
            }),
            invalidatesTags: ['Profile'],
        }),

        // Upload profile image
        uploadProfileImage: builder.mutation<ApiResponse<{ imageUrl: string; public_id: string }>, FormData>({
            query: (formData) => ({
                url: '/upload-image',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: ['Profile'],
        }),

        // Transaction PIN management
        setTransactionPin: builder.mutation<ApiResponse, SetPinPayload>({
            query: (payload) => ({
                url: '/pin/set',
                method: 'POST',
                body: payload,
                headers: {
                    'content-type': 'application/json',
                },
            }),
            invalidatesTags: ['Profile', 'UserSettings', 'BiometricSettings'],
        }),

        changeTransactionPin: builder.mutation<ApiResponse, ChangePinPayload>({
            query: (payload) => ({
                url: '/pin/change',
                method: 'POST',
                body: payload,
                headers: {
                    'content-type': 'application/json',
                },
            }),
            invalidatesTags: ['UserSettings'],
        }),

        verifyTransactionPin: builder.mutation<ApiResponse, VerifyPinPayload>({
            query: (payload) => ({
                url: '/pin/verify',
                method: 'POST',
                body: payload,
                headers: {
                    'content-type': 'application/json',
                },
            }),
        }),

        // ==================== ENHANCED BIOMETRIC ENDPOINTS ====================

        // Enhanced biometric toggle with type and fallback info
        toggleBiometricSetting: builder.mutation<ApiResponse<UserProfile>, BiometricSettingPayload>({
            query: (payload) => ({
                url: '/biometric/toggle',
                method: 'POST',
                body: payload,
                headers: {
                    'content-type': 'application/json',
                },
            }),
            invalidatesTags: ['Profile', 'UserSettings', 'BiometricSettings'],
        }),

        // Record biometric authentication attempt
        recordBiometricAttempt: builder.mutation<ApiResponse, BiometricAttemptPayload>({
            query: (payload) => ({
                url: '/biometric/record-attempt',
                method: 'POST',
                body: payload,
                headers: {
                    'content-type': 'application/json',
                },
            }),
            invalidatesTags: ['BiometricSettings'],
        }),

        // Get biometric status and capabilities
        getBiometricStatus: builder.query<ApiResponse<BiometricStatus>, void>({
            query: () => '/biometric/status',
            providesTags: ['BiometricSettings'],
        }),

        // Reset biometric settings
        resetBiometricSettings: builder.mutation<ApiResponse, BiometricResetPayload>({
            query: (payload) => ({
                url: '/biometric/reset',
                method: 'POST',
                body: payload,
                headers: {
                    'content-type': 'application/json',
                },
            }),
            invalidatesTags: ['Profile', 'UserSettings', 'BiometricSettings'],
        }),

        // Enroll device for biometric authentication
        enrollBiometricDevice: builder.mutation<ApiResponse, DeviceEnrollmentPayload>({
            query: (payload) => ({
                url: '/biometric/enroll-device',
                method: 'POST',
                body: payload,
                headers: {
                    'content-type': 'application/json',
                },
            }),
            invalidatesTags: ['BiometricSettings'],
        }),

        // Remove enrolled device
        removeBiometricDevice: builder.mutation<ApiResponse, { deviceId: string }>({
            query: ({ deviceId }) => ({
                url: '/biometric/remove-device',
                method: 'POST',
                body: { deviceId },
                headers: {
                    'content-type': 'application/json',
                },
            }),
            invalidatesTags: ['BiometricSettings'],
        }),

        // Get biometric authentication history
        getBiometricHistory: builder.query<ApiResponse<any[]>, { limit?: number }>({
            query: ({ limit = 20 }) => ({
                url: '/biometric/history',
                params: { limit },
            }),
            providesTags: ['BiometricSettings'],
        }),

        // Test biometric authentication (for settings verification)
        testBiometricAuth: builder.mutation<ApiResponse, { biometricType: string }>({
            query: (payload) => ({
                url: '/biometric/test',
                method: 'POST',
                body: payload,
                headers: {
                    'content-type': 'application/json',
                },
            }),
        }),

        // ==================== SECURITY ENDPOINTS ====================

        // Get security overview
        getSecurityOverview: builder.query<ApiResponse<{
            pinSet: boolean;
            biometricEnabled: boolean;
            twoFactorEnabled: boolean;
            securityScore: number;
            recommendations: string[];
        }>, void>({
            query: () => '/security/overview',
            providesTags: ['Profile', 'UserSettings', 'BiometricSettings'],
        }),

        // Update security preferences
        updateSecurityPreferences: builder.mutation<ApiResponse, {
            biometricNotifications?: boolean;
            securityAlerts?: boolean;
            loginNotifications?: boolean;
        }>({
            query: (payload) => ({
                url: '/security/preferences',
                method: 'POST',
                body: payload,
                headers: {
                    'content-type': 'application/json',
                },
            }),
            invalidatesTags: ['UserSettings'],
        }),

        // Delete profile
        deleteProfile: builder.mutation<ApiResponse, string>({
            query: (id) => ({
                url: `/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Profile'],
        }),
    }),
});

export const {
    // Existing hooks
    useGetUserProfileQuery,
    useGetProfileByIdQuery,
    useGetAllProfilesQuery,
    useCreateProfileMutation,
    useUpdateUserProfileMutation,
    useEditProfileMutation,
    useUploadProfileImageMutation,
    useSetTransactionPinMutation,
    useChangeTransactionPinMutation,
    useVerifyTransactionPinMutation,
    useDeleteProfileMutation,

    // Enhanced biometric hooks
    useToggleBiometricSettingMutation,
    useRecordBiometricAttemptMutation,
    useGetBiometricStatusQuery,
    useResetBiometricSettingsMutation,
    useEnrollBiometricDeviceMutation,
    useRemoveBiometricDeviceMutation,
    useGetBiometricHistoryQuery,
    useTestBiometricAuthMutation,

    // Security hooks
    useGetSecurityOverviewQuery,
    useUpdateSecurityPreferencesMutation,
} = profileApi;