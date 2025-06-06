// utils/auth.ts
import { store } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { authApi } from '@/store/api/authApi';
import { persistor } from '@/store';

export const handleLogout = async () => {
    try {
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

        // Clear Redux state
        store.dispatch(logout());

        // Clear RTK Query cache
        store.dispatch(authApi.util.resetApiState());

        // Clear persisted data
        await persistor.purge();

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

export const checkAuthStatus = () => {
    const state = store.getState();
    const { token, isAuthenticated } = state.auth;

    if (!isAuthenticated || !token) {
        return false;
    }

    if (isTokenExpired(token)) {
        handleLogout();
        return false;
    }

    return true;
};