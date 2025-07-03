// store/slices/authSlice.ts - Updated with Profile Update Action
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/store';

export interface User {
  _id: string;
  id?: string; // Add id for compatibility
  email: string;
  username: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  type: string;
  status?: string;
  verified: boolean;
  phoneVerified?: boolean;
  is2faEnabled: boolean;
  typeOf2fa?: string;
  isDeleted: boolean;
  emailVerifiedAt?: string;
  // Enhanced profile fields
  hasTransactionPin?: boolean;
  biometricSignIn?: boolean;
  biometricTransactions?: boolean;
  kycStatus?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'expired';
  kycLevel?: 0 | 1 | 2 | 3;
  accountTier?: 'basic' | 'standard' | 'premium' | 'enterprise';
  privacySettings?: {
    profileVisibility: 'public' | 'private' | 'friends';
    emailNotifications: boolean;
    smsNotifications: boolean;
    transactionNotifications: boolean;
    marketingEmails: boolean;
  };
  walletSettings?: {
    autoTopUp: boolean;
    autoTopUpAmount: number;
    autoTopUpThreshold: number;
    transactionLimit: {
      daily: number;
      monthly: number;
    };
  };
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
        state,
        action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    // Add the missing updateUserProfile action
    updateUserProfile: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
          // Ensure id compatibility
          id: action.payload._id || state.user._id || state.user.id
        };
      }
    },
    // Additional profile-related actions
    updateProfileImage: (state, action: PayloadAction<string>) => {
      if (state.user) {
        state.user.imageUrl = action.payload;
      }
    },
    updateSecuritySettings: (state, action: PayloadAction<{
      hasTransactionPin?: boolean;
      biometricSignIn?: boolean;
      biometricTransactions?: boolean;
    }>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload
        };
      }
    },
    updateVerificationStatus: (state, action: PayloadAction<{
      verified?: boolean;
      phoneVerified?: boolean;
      emailVerifiedAt?: string;
    }>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload
        };
      }
    },
  },
});

export const {
  setCredentials,
  setLoading,
  setError,
  clearError,
  logout,
  updateUser,
  updateUserProfile, // Export the new action
  updateProfileImage,
  updateSecuritySettings,
  updateVerificationStatus,
} = authSlice.actions;

// Selectors
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectCurrentToken = (state: RootState) => state.auth.token;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

// Enhanced selectors for profile data
export const selectUserProfile = (state: RootState) => {
  const user = state.auth.user;
  if (!user) return null;

  return {
    ...user,
    fullName: user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username || 'User',
    isProfileComplete: !!(
        user.firstName &&
        user.lastName &&
        user.email &&
        user.phone &&
        user.verified
    ),
  };
};

export const selectSecuritySettings = (state: RootState) => {
  const user = state.auth.user;
  if (!user) return null;

  return {
    hasTransactionPin: user.hasTransactionPin || false,
    biometricSignIn: user.biometricSignIn || false,
    biometricTransactions: user.biometricTransactions || false,
    verified: user.verified || false,
    phoneVerified: user.phoneVerified || false,
    is2faEnabled: user.is2faEnabled || false,
  };
};

export default authSlice.reducer;