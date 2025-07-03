// components/SecurityProvider.tsx - Single Fix Security Provider Component
import React, { useEffect, useRef } from 'react';
import {
    Alert,
    AppState,
    AppStateStatus,
    PanResponder,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authSecurityManager, initializeSession } from '@/utils/authSecurity';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectCurrentToken } from '@/store/slices/authSlice';

interface SecurityProviderProps {
    children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
    const router = useRouter();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const token = useAppSelector(selectCurrentToken);
    const panResponder = useRef<any>(null);

    // Initialize security system
    useEffect(() => {
        if (isAuthenticated && token) {
            console.log('Initializing security system...');

            // Initialize session tracking
            initializeSession();

            // Initialize security manager with callbacks
            authSecurityManager.initialize(
                () => showIdleWarning(),
                () => handleForcedLogout()
            );

            return () => {
                console.log('Cleaning up security system...');
                authSecurityManager.cleanup();
            };
        }
    }, [isAuthenticated, token]);

    // Create pan responder that ONLY detects activity without blocking gestures
    useEffect(() => {
        panResponder.current = PanResponder.create({
            // Don't claim the responder - just detect touches
            onStartShouldSetPanResponder: () => {
                if (isAuthenticated) {
                    authSecurityManager.extendSession();
                }
                return false; // Always return false to not interfere with other gestures
            },
            onMoveShouldSetPanResponder: () => {
                if (isAuthenticated) {
                    authSecurityManager.extendSession();
                }
                return false; // Always return false to not interfere with scrolling
            },
            // These won't be called since we're returning false above, but keeping for safety
            onPanResponderGrant: () => false,
            onPanResponderMove: () => false,
            onPanResponderRelease: () => false,
            onPanResponderTerminate: () => false,
            // Important: Don't block any gestures
            onShouldBlockNativeResponder: () => false,
        });
    }, [isAuthenticated]);

    // Show idle timeout warning
    const showIdleWarning = () => {
        Alert.alert(
            '⏱️ Session Timeout Warning',
            'Your session will expire in 2 minutes due to inactivity. Do you want to continue?',
            [
                {
                    text: 'Logout Now',
                    style: 'destructive',
                    onPress: () => authSecurityManager.forceLogout(),
                },
                {
                    text: 'Stay Logged In',
                    style: 'default',
                    onPress: () => authSecurityManager.extendSession(),
                },
            ],
            {
                cancelable: false,
            }
        );
    };

    // Handle forced logout
    const handleForcedLogout = () => {
        Alert.alert(
            '🔒 Session Expired',
            'For your security, you have been automatically logged out due to inactivity or session expiration.',
            [
                {
                    text: 'Login Again',
                    style: 'default',
                    onPress: () => router.replace('/login'),
                },
            ],
            { cancelable: false }
        );
    };

    // Fixed wrapper: Only apply PanResponder handlers to the View, not TouchableWithoutFeedback
    return (
        <View
            style={{ flex: 1 }}
            {...(panResponder.current?.panHandlers || {})}
            onTouchStart={() => {
                if (isAuthenticated) {
                    authSecurityManager.extendSession();
                }
            }}
        >
            {children}
        </View>
    );
};

// HOC for components that need security awareness
export const withSecurity = <P extends object>(
    WrappedComponent: React.ComponentType<P>
) => {
    return (props: P) => {
        const isAuthenticated = useAppSelector(selectIsAuthenticated);

        // Extend session on component mount if authenticated
        useEffect(() => {
            if (isAuthenticated) {
                authSecurityManager.extendSession();
            }
        }, [isAuthenticated]);

        return <WrappedComponent {...props} />;
    };
};

// Hook for components to interact with security system
export const useSecurity = () => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);

    const extendSession = () => {
        if (isAuthenticated) {
            authSecurityManager.extendSession();
        }
    };

    const getSecurityStatus = () => {
        return authSecurityManager.getSecurityStatus();
    };

    const forceLogout = () => {
        authSecurityManager.forceLogout();
    };

    return {
        extendSession,
        getSecurityStatus,
        forceLogout,
        isAuthenticated,
    };
};

export default SecurityProvider;