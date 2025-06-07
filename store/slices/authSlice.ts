// store/slices/authSlice.ts - With manual persistence
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  _id: string;
  email: string;
  username: string;
  phone: string;
  type: string;
  status?: string;
  verified: boolean;
  phoneVerified?: boolean;
  is2faEnabled: boolean;
  typeOf2fa?: string;
  isDeleted: boolean;
  emailVerifiedAt?: string;
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

// Async storage helpers
const STORAGE_KEY = '@app_auth_state';

const saveAuthState = async (authData: { user: User; token: string; isAuthenticated: boolean }) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
  } catch (error) {
    console.warn('Failed to save auth state:', error);
  }
};

const clearAuthState = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear auth state:', error);
  }
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

      // Save to AsyncStorage whenever credentials are set
      saveAuthState({
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true
      });
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

      // Clear from AsyncStorage when logging out
      clearAuthState();
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };

        // Update AsyncStorage with new user data
        saveAuthState({
          user: state.user,
          token: state.token!,
          isAuthenticated: state.isAuthenticated
        });
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
} = authSlice.actions;

// Load auth state from AsyncStorage
export const loadAuthState = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load auth state:', error);
    return null;
  }
};

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectCurrentToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;

export default authSlice.reducer;