// utils/authSecurity.ts - Enhanced Authentication Security System
import { store } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { authApi } from '@/store/api/authApi';
import { persistor } from '@/store';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SecurityConfig {
    // Idle timeout settings
    idleTimeoutMinutes: number;
    warningTimeoutMinutes: number;

    // Token expiration settings
    tokenExpirationCheckIntervalMs: number;
    preExpirationWarningMinutes: number;

    // Session settings
    maxSessionDurationHours: number;

    // App state settings
    backgroundTimeoutMinutes: number;
}

const SECURITY_CONFIG: SecurityConfig = {
    idleTimeoutMinutes: 15,           // Auto logout after 15 minutes of inactivity
    warningTimeoutMinutes: 13,        // Show warning at 13 minutes
    tokenExpirationCheckIntervalMs: 60000, // Check token every minute
    preExpirationWarningMinutes: 5,   // Warn 5 minutes before token expires
    maxSessionDurationHours: 8,       // Max session duration
    backgroundTimeoutMinutes: 5,      // Auto logout after 5 minutes in background
};

class AuthSecurityManager {
    private idleTimer: NodeJS.Timeout | null = null;
    private warningTimer: NodeJS.Timeout | null = null;
    private tokenCheckTimer: NodeJS.Timeout | null = null;
    private backgroundTimer: NodeJS.Timeout | null = null;

    private lastActivity: number = Date.now();
    private appStateListener: any = null;
    private isActive: boolean = true;
    private warningCallback: (() => void) | null = null;
    private logoutCallback: (() => void) | null = null;

    // Initialize the security system
    initialize(warningCallback?: () => void, logoutCallback?: () => void) {
        console.log('Initializing AuthSecurityManager...');

        this.warningCallback = warningCallback;
        this.logoutCallback = logoutCallback;

        this.startIdleTimer();
        this.startTokenExpirationCheck();
        this.setupAppStateListener();
        this.resetActivity();
    }

    // Clean up timers and listeners
    cleanup() {
        console.log('Cleaning up AuthSecurityManager...');

        this.clearAllTimers();
        this.removeAppStateListener();
    }

    // Reset user activity timestamp
    resetActivity() {
        this.lastActivity = Date.now();
        this.restartIdleTimer();
    }

    // Start idle timeout monitoring
    private startIdleTimer() {
        this.clearIdleTimers();

        // Warning timer
        this.warningTimer = setTimeout(() => {
            if (this.isActive && this.warningCallback) {
                console.log('Showing idle timeout warning...');
                this.warningCallback();
            }
        }, SECURITY_CONFIG.warningTimeoutMinutes * 60 * 1000);

        // Logout timer
        this.idleTimer = setTimeout(() => {
            if (this.isActive) {
                console.log('Auto logout due to idle timeout...');
                this.performSecureLogout('idle_timeout');
            }
        }, SECURITY_CONFIG.idleTimeoutMinutes * 60 * 1000);
    }

    // Restart idle timer (called when user is active)
    private restartIdleTimer() {
        if (this.isActive) {
            this.startIdleTimer();
        }
    }

    // Start token expiration checking
    private startTokenExpirationCheck() {
        this.tokenCheckTimer = setInterval(async () => {
            await this.checkTokenExpiration();
        }, SECURITY_CONFIG.tokenExpirationCheckIntervalMs);
    }

    // Check if token is expired or about to expire
    private async checkTokenExpiration() {
        const state = store.getState();
        const { token, isAuthenticated } = state.auth;

        if (!isAuthenticated || !token) {
            return;
        }

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            const timeUntilExpiration = payload.exp - currentTime;
            const minutesUntilExpiration = timeUntilExpiration / 60;

            // Token has expired
            if (timeUntilExpiration <= 0) {
                console.log('Token has expired, logging out...');
                this.performSecureLogout('token_expired');
                return;
            }

            // Token will expire soon - show warning
            if (minutesUntilExpiration <= SECURITY_CONFIG.preExpirationWarningMinutes) {
                console.log(`Token expires in ${Math.round(minutesUntilExpiration)} minutes`);
                if (this.warningCallback) {
                    this.warningCallback();
                }
            }

            // Check max session duration
            const sessionStart = await AsyncStorage.getItem('sessionStartTime');
            if (sessionStart) {
                const sessionDurationHours = (Date.now() - parseInt(sessionStart)) / (1000 * 60 * 60);
                if (sessionDurationHours >= SECURITY_CONFIG.maxSessionDurationHours) {
                    console.log('Max session duration reached, logging out...');
                    this.performSecureLogout('max_session_duration');
                }
            }

        } catch (error) {
            console.error('Error checking token expiration:', error);
            this.performSecureLogout('token_invalid');
        }
    }

    // Setup app state listener for background/foreground detection
    private setupAppStateListener() {
        this.appStateListener = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    }

    // Handle app state changes
    private handleAppStateChange(nextAppState: AppStateStatus) {
        console.log('App state changed to:', nextAppState);

        if (nextAppState === 'active') {
            // App became active
            this.isActive = true;
            this.clearBackgroundTimer();
            this.resetActivity();

            // Check if app was in background too long
            this.checkBackgroundTimeout();

        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
            // App went to background
            this.isActive = false;
            this.clearAllTimers();
            this.startBackgroundTimer();

            // Store background timestamp
            AsyncStorage.setItem('backgroundTimestamp', Date.now().toString());
        }
    }

    // Start background timeout timer
    private startBackgroundTimer() {
        this.backgroundTimer = setTimeout(() => {
            console.log('Auto logout due to background timeout...');
            this.performSecureLogout('background_timeout');
        }, SECURITY_CONFIG.backgroundTimeoutMinutes * 60 * 1000);
    }

    // Check if app was in background too long
    private async checkBackgroundTimeout() {
        const backgroundTimestamp = await AsyncStorage.getItem('backgroundTimestamp');
        if (backgroundTimestamp) {
            const backgroundDuration = Date.now() - parseInt(backgroundTimestamp);
            const backgroundMinutes = backgroundDuration / (1000 * 60);

            if (backgroundMinutes >= SECURITY_CONFIG.backgroundTimeoutMinutes) {
                console.log(`App was in background for ${Math.round(backgroundMinutes)} minutes, logging out...`);
                this.performSecureLogout('background_timeout');
            }

            // Clear the timestamp
            await AsyncStorage.removeItem('backgroundTimestamp');
        }
    }

    // Perform secure logout with reason
    private async performSecureLogout(reason: string) {
        console.log(`Performing secure logout. Reason: ${reason}`);

        try {
            // Store logout reason for analytics
            await AsyncStorage.setItem('lastLogoutReason', reason);
            await AsyncStorage.setItem('lastLogoutTime', Date.now().toString());

            // Clean up timers
            this.cleanup();

            // Call logout callback if provided
            if (this.logoutCallback) {
                this.logoutCallback();
            }

            // Perform logout
            await this.handleLogout();

        } catch (error) {
            console.error('Error during secure logout:', error);
            // Force logout even if there's an error
            await this.handleLogout();
        }
    }

    // Enhanced logout function
    private async handleLogout() {
        try {
            const state = store.getState();
            const userEmail = state.auth.user?.email;

            // Call logout API if user email exists
            if (userEmail) {
                try {
                    await store.dispatch(authApi.endpoints.logout.initiate({ email: userEmail }));
                } catch (error) {
                    console.warn('Logout API call failed:', error);
                }
            }

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

            console.log('Secure logout completed');
        } catch (error) {
            console.error('Logout error:', error);
            // Force local logout
            store.dispatch(logout());
            await persistor.purge();
        }
    }

    // Clear all timers
    private clearAllTimers() {
        this.clearIdleTimers();
        this.clearTokenTimer();
        this.clearBackgroundTimer();
    }

    // Clear idle-related timers
    private clearIdleTimers() {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
    }

    // Clear token expiration timer
    private clearTokenTimer() {
        if (this.tokenCheckTimer) {
            clearInterval(this.tokenCheckTimer);
            this.tokenCheckTimer = null;
        }
    }

    // Clear background timer
    private clearBackgroundTimer() {
        if (this.backgroundTimer) {
            clearTimeout(this.backgroundTimer);
            this.backgroundTimer = null;
        }
    }

    // Remove app state listener
    private removeAppStateListener() {
        if (this.appStateListener) {
            this.appStateListener.remove();
            this.appStateListener = null;
        }
    }

    // Get current security status
    getSecurityStatus() {
        const state = store.getState();
        const { token, isAuthenticated } = state.auth;

        let tokenTimeLeft = 0;
        let sessionTimeLeft = 0;

        if (token && isAuthenticated) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                tokenTimeLeft = Math.max(0, payload.exp - (Date.now() / 1000));
            } catch (error) {
                console.error('Error parsing token:', error);
            }
        }

        const idleTimeLeft = Math.max(0,
            (this.lastActivity + (SECURITY_CONFIG.idleTimeoutMinutes * 60 * 1000) - Date.now()) / 1000
        );

        return {
            isAuthenticated,
            tokenTimeLeft: Math.round(tokenTimeLeft),
            idleTimeLeft: Math.round(idleTimeLeft),
            sessionTimeLeft: Math.round(sessionTimeLeft),
            lastActivity: this.lastActivity,
            isActive: this.isActive
        };
    }

    // Extend session (call this when user interacts)
    extendSession() {
        this.resetActivity();
    }

    // Force logout (for user-initiated logout)
    async forceLogout() {
        await this.performSecureLogout('user_initiated');
    }
}

// Create singleton instance
export const authSecurityManager = new AuthSecurityManager();

// Enhanced auth utility functions
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
        authSecurityManager.forceLogout();
        return false;
    }

    return true;
};

// Initialize session tracking
export const initializeSession = async () => {
    await AsyncStorage.setItem('sessionStartTime', Date.now().toString());
};

// Get logout reason from last session
export const getLastLogoutReason = async (): Promise<string | null> => {
    return await AsyncStorage.getItem('lastLogoutReason');
};

export default authSecurityManager;