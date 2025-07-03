// utils/auth.ts - Updated with Security Integration
import { store } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { authApi } from '@/store/api/authApi';
import { persistor } from '@/store';
import { authSecurityManager } from '@/utils/authSecurity';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const handleLogout = async (reason: string = 'user_initiated') => {
    try {
        console.log(`Handling logout with reason: ${reason}`);

        // Store logout reason
        await AsyncStorage.setItem('lastLogoutReason', reason);
        await AsyncStorage.setItem('lastLogoutTime', Date.now().toString());

        const state = store.getState();
        const userEmail = state.auth.user?.email;

        // Call logout API if user email exists
        if (userEmail) {
            try {
                await store.dispatch(authApi.endpoints.logout.initiate({ email: userEmail }));
            } catch (error) {
                console.warn('Logout API call failed:', error);
                // Continue with local logout even if API fails
            }
        }

        // Clean up security manager
        authSecurityManager.cleanup();

        // Clear Redux state
        store.dispatch(logout());

        // Clear RTK Query cache
        store.dispatch(authApi.util.resetApiState());

        // Clear persisted data
        await persistor.purge();

        // Clear security-related storage
        await AsyncStorage.multiRemove([
            'sessionStartTime',
            'backgroundTimestamp',
            'lastActivity'
        ]);

        console.log('Logout successful');
    } catch (error) {
        console.error('Logout error:', error);
        // Force local logout even if there's an error
        store.dispatch(logout());
        await persistor.purge();
    }
};

export const isTokenExpired = (token: string): boolean => {
    try {
        if (!token) return true;

        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;

        return payload.exp < currentTime;
    } catch (error) {
        return true;
    }
};

export const getTokenTimeLeft = (token: string): number => {
    try {
        if (!token) return 0;

        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;

        return Math.max(0, payload.exp - currentTime);
    } catch (error) {
        return 0;
    }
};

export const checkAuthStatus = (): boolean => {
    const state = store.getState();
    const { token, isAuthenticated } = state.auth;

    if (!isAuthenticated || !token) {
        return false;
    }

    if (isTokenExpired(token)) {
        handleLogout('token_expired');
        return false;
    }

    return true;
};

// Enhanced login handler with security initialization
export const handleLogin = async (userData: any, token: string) => {
    try {
        // Store session start time
        await AsyncStorage.setItem('sessionStartTime', Date.now().toString());

        // Clear any previous logout reasons
        await AsyncStorage.removeItem('lastLogoutReason');
        await AsyncStorage.removeItem('lastLogoutTime');

        console.log('Login successful, security system will be initialized');

        return { success: true };
    } catch (error) {
        console.error('Login setup error:', error);
        return { success: false, error: error.message };
    }
};

// Get session information
export const getSessionInfo = async () => {
    try {
        const sessionStartTime = await AsyncStorage.getItem('sessionStartTime');
        const lastLogoutReason = await AsyncStorage.getItem('lastLogoutReason');
        const lastLogoutTime = await AsyncStorage.getItem('lastLogoutTime');

        const state = store.getState();
        const { token, isAuthenticated } = state.auth;

        let tokenTimeLeft = 0;
        if (token && isAuthenticated) {
            tokenTimeLeft = getTokenTimeLeft(token);
        }

        return {
            sessionStartTime: sessionStartTime ? parseInt(sessionStartTime) : null,
            lastLogoutReason,
            lastLogoutTime: lastLogoutTime ? parseInt(lastLogoutTime) : null,
            tokenTimeLeft,
            isAuthenticated,
            securityStatus: authSecurityManager.getSecurityStatus(),
        };
    } catch (error) {
        console.error('Error getting session info:', error);
        return null;
    }
};

// Force logout (for manual logout)
export const forceLogout = async () => {
    await handleLogout('user_initiated');
};

// Check if user should be warned about session
export const shouldShowSessionWarning = (): boolean => {
    const state = store.getState();
    const { token } = state.auth;

    if (!token) return false;

    const timeLeft = getTokenTimeLeft(token);
    return timeLeft > 0 && timeLeft <= (5 * 60); // 5 minutes
};

// Refresh auth token (if your backend supports it)
export const refreshAuthToken = async (): Promise<boolean> => {
    try {
        // Implement token refresh logic here if your backend supports it
        console.log('Token refresh not implemented yet');
        return false;
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
};

// Validate session integrity
export const validateSession = async (): Promise<boolean> => {
    try {
        const state = store.getState();
        const { token, isAuthenticated, user } = state.auth;

        if (!isAuthenticated || !token || !user) {
            return false;
        }

        // Check token expiration
        if (isTokenExpired(token)) {
            await handleLogout('token_expired');
            return false;
        }

        // Check session duration
        const sessionStartTime = await AsyncStorage.getItem('sessionStartTime');
        if (sessionStartTime) {
            const sessionDuration = Date.now() - parseInt(sessionStartTime);
            const maxSessionDuration = 8 * 60 * 60 * 1000; // 8 hours

            if (sessionDuration > maxSessionDuration) {
                await handleLogout('max_session_duration');
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Session validation error:', error);
        await handleLogout('session_validation_error');
        return false;
    }
};

// Security utilities for components
export const SecurityUtils = {
    // Extend user session
    extendSession: () => {
        authSecurityManager.extendSession();
    },

    // Get security status
    getStatus: () => {
        return authSecurityManager.getSecurityStatus();
    },

    // Check if user is idle
    isUserIdle: (thresholdMinutes: number = 5): boolean => {
        const status = authSecurityManager.getSecurityStatus();
        const idleTime = (Date.now() - status.lastActivity) / (1000 * 60);
        return idleTime >= thresholdMinutes;
    },

    // Get remaining session time
    getSessionTimeLeft: (): number => {
        const status = authSecurityManager.getSecurityStatus();
        return Math.min(status.tokenTimeLeft, status.idleTimeLeft);
    },

    // Format time remaining
    formatTimeRemaining: (seconds: number): string => {
        if (seconds <= 0) return 'Expired';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }
};