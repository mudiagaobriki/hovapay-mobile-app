// store/provider.tsx - Without Redux Persist
import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { View, Text } from 'react-native';
import { store } from './index';
import { setCredentials } from './slices/authSlice';
import { loadAuthState } from './slices/authSlice';

interface ReduxProviderProps {
    children: React.ReactNode;
}

export function ReduxProvider({ children }: ReduxProviderProps) {
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // Load persisted auth state on app start
        const initializeAuth = async () => {
            try {
                const savedAuthState = await loadAuthState();
                if (savedAuthState && savedAuthState.user && savedAuthState.token) {
                    store.dispatch(setCredentials({
                        user: savedAuthState.user,
                        token: savedAuthState.token
                    }));
                }
            } catch (error) {
                console.warn('Failed to initialize auth state:', error);
            } finally {
                setIsInitialized(true);
            }
        };

        initializeAuth();
    }, []);

    // Show loading while initializing
    if (!isInitialized) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Initializing...</Text>
            </View>
        );
    }

    return (
        <Provider store={store}>
            {children}
        </Provider>
    );
}