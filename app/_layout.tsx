// app/_layout.tsx - Simplified to prevent loops
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Redirect, Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { NativeBaseProvider } from 'native-base';
import { Alert, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ReduxProvider } from '@/store/provider';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectIsAuthenticated, selectCurrentUser } from '@/store/slices/authSlice';
import { SecurityProvider } from '@/components/SecurityProvider';
import { getLastLogoutReason } from '@/utils/authSecurity';
import BiometricService from '../utils/BiometricService';

const ONBOARDING_STORAGE_KEY = '@solo_bills_onboarding_completed';

// Simplified auth guard
function AuthGuard({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const currentUser = useAppSelector(selectCurrentUser);
    const segments = useSegments();
    const pathname = usePathname();

    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
    const [biometricsReady, setBiometricsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const protectedRoutes = ['(tabs)', 'bills', 'wallet'];
    const isInProtectedRoute = protectedRoutes.includes(segments[0]);

    // Single initialization effect
    useEffect(() => {
        let mounted = true;

        const initializeApp = async () => {
            try {
                console.log('🚀 Starting app initialization...');

                // Step 1: Check onboarding status
                const onboardingStatus = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
                if (mounted) {
                    const completed = onboardingStatus === 'true';
                    setOnboardingCompleted(completed);
                    console.log('📋 Onboarding status:', completed ? 'Completed' : 'Not completed');
                }

                // Step 2: Initialize biometrics (simplified)
                try {
                    await BiometricService.initialize();
                    if (mounted) {
                        setBiometricsReady(true);
                        console.log('🔒 Biometrics ready');
                    }
                } catch (error) {
                    console.log('⚠️ Biometrics not available:', error.message);
                    if (mounted) {
                        setBiometricsReady(false);
                    }
                }

                // Step 3: Mark initialization complete
                if (mounted) {
                    setIsLoading(false);
                    console.log('✅ App initialization complete');
                }

            } catch (error) {
                console.error('❌ App initialization error:', error);
                if (mounted) {
                    setOnboardingCompleted(false);
                    setBiometricsReady(false);
                    setIsLoading(false);
                }
            }
        };

        initializeApp();

        return () => {
            mounted = false;
        };
    }, []); // Only run once

    // Handle app state changes (simplified)
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                console.log('📱 App became active');
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription?.remove();
    }, []);

    // Check logout reason when authentication changes
    useEffect(() => {
        if (!isAuthenticated && !isLoading) {
            const checkLastLogout = async () => {
                try {
                    const lastLogoutReason = await getLastLogoutReason();
                    if (lastLogoutReason && lastLogoutReason !== 'user_initiated') {
                        let message = 'You have been logged out.';

                        switch (lastLogoutReason) {
                            case 'idle_timeout':
                                message = 'You were logged out due to inactivity.';
                                break;
                            case 'token_expired':
                                message = 'Your session has expired. Please log in again.';
                                break;
                            case 'background_timeout':
                                message = 'You were logged out as the app was in background too long.';
                                break;
                            case 'biometric_changed':
                                message = 'Biometric authentication was disabled due to security changes.';
                                break;
                        }

                        Alert.alert('🔒 Session Ended', message, [{ text: 'OK' }]);
                    }
                } catch (error) {
                    console.error('Error checking logout reason:', error);
                }
            };

            checkLastLogout();
        }
    }, [isAuthenticated, isLoading]);

    // Show loading while initializing
    if (isLoading || onboardingCompleted === null) {
        console.log('⏳ App is loading...');
        return null; // You can return a loading component here
    }

    // Route protection and navigation logic
    console.log('🧭 Navigation check:', {
        isAuthenticated,
        onboardingCompleted,
        pathname,
        isInProtectedRoute
    });

    // Show onboarding for first-time users
    if (!onboardingCompleted && !isAuthenticated && pathname !== '/onboarding') {
        console.log('🎯 Redirecting to onboarding');
        return <Redirect href="/onboarding" />;
    }

    // Protect authenticated routes
    if (!isAuthenticated && isInProtectedRoute) {
        console.log('🔐 Redirecting to login (protected route)');
        return <Redirect href="/login" />;
    }

    // Redirect authenticated users away from auth pages
    if (isAuthenticated && (pathname === '/login' || pathname === '/register' || pathname === '/onboarding')) {
        console.log('👤 Redirecting to dashboard (authenticated)');
        return <Redirect href="/(tabs)" />;
    }

    // Skip onboarding if user is authenticated (returning user)
    if (onboardingCompleted && !isAuthenticated && pathname === '/onboarding') {
        console.log('✅ Onboarding complete, redirecting to login');
        return <Redirect href="/login" />;
    }

    return <>{children}</>;
}

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const [loaded] = useFonts({
        SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    });

    if (!loaded) {
        return null;
    }

    return (
        <ReduxProvider>
            <NativeBaseProvider>
                <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <SecurityProvider>
                        <AuthGuard>
                            <Stack
                                initialRouteName="splash"
                                screenOptions={{
                                    headerShown: false,
                                    animation: 'slide_from_right',
                                    gestureEnabled: true,
                                }}
                            >
                                <Stack.Screen
                                    name="splash"
                                    options={{
                                        headerShown: false,
                                        animation: 'fade',
                                        gestureEnabled: false
                                    }}
                                />
                                <Stack.Screen
                                    name="onboarding"
                                    options={{
                                        headerShown: false,
                                        animation: 'fade',
                                        gestureEnabled: false
                                    }}
                                />
                                <Stack.Screen
                                    name="login"
                                    options={{
                                        headerShown: false,
                                        animation: 'slide_from_bottom',
                                        gestureEnabled: false
                                    }}
                                />
                                <Stack.Screen
                                    name="register"
                                    options={{
                                        headerShown: false,
                                        animation: 'slide_from_bottom',
                                        gestureEnabled: false
                                    }}
                                />
                                <Stack.Screen
                                    name="password-recovery"
                                    options={{
                                        headerShown: false,
                                        animation: 'slide_from_bottom',
                                        gestureEnabled: true
                                    }}
                                />
                                <Stack.Screen
                                    name="(tabs)"
                                    options={{
                                        headerShown: false,
                                        animation: 'fade',
                                        gestureEnabled: false
                                    }}
                                />
                                <Stack.Screen
                                    name="bills"
                                    options={{
                                        headerShown: false,
                                        presentation: 'card',
                                        animation: 'slide_from_right',
                                        gestureEnabled: true
                                    }}
                                />
                                <Stack.Screen
                                    name="+not-found"
                                    options={{
                                        title: 'Not Found',
                                        headerShown: true
                                    }}
                                />
                            </Stack>
                        </AuthGuard>
                    </SecurityProvider>
                    <StatusBar style="auto" />
                </ThemeProvider>
            </NativeBaseProvider>
        </ReduxProvider>
    );
}