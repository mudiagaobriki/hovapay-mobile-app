// app/_layout.tsx - Enhanced with Security Integration
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Redirect, Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { NativeBaseProvider } from 'native-base';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ReduxProvider } from '@/store/provider';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated } from '@/store/slices/authSlice';
import { SecurityProvider } from '@/components/SecurityProvider';
import { getLastLogoutReason } from '@/utils/authSecurity';
import { Alert } from 'react-native';

// Enhanced auth guard with security integration
function AuthGuard({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const segments = useSegments();
    const pathname = usePathname();

    const protectedRoutes = ['(tabs)', 'bills', 'wallet'];
    const isInProtectedRoute = protectedRoutes.includes(segments[0]);

    // Check for previous logout reason and show appropriate message
    useEffect(() => {
        const checkLastLogout = async () => {
            const lastLogoutReason = await getLastLogoutReason();
            if (lastLogoutReason && !isAuthenticated) {
                let message = 'You have been logged out.';

                switch (lastLogoutReason) {
                    case 'idle_timeout':
                        message = 'You were logged out due to inactivity for security purposes.';
                        break;
                    case 'token_expired':
                        message = 'Your session has expired. Please log in again.';
                        break;
                    case 'background_timeout':
                        message = 'You were logged out for security as the app was in background too long.';
                        break;
                    case 'max_session_duration':
                        message = 'Your session has reached the maximum duration. Please log in again.';
                        break;
                    case 'token_invalid':
                        message = 'Invalid session detected. Please log in again.';
                        break;
                }

                if (lastLogoutReason !== 'user_initiated') {
                    Alert.alert(
                        '🔒 Session Ended',
                        message,
                        [{ text: 'OK' }],
                        { cancelable: false }
                    );
                }
            }
        };

        checkLastLogout();
    }, [isAuthenticated]);

    if (!isAuthenticated && isInProtectedRoute) {
        return <Redirect href="/login" />;
    }

    if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
        return <Redirect href="/(tabs)" />;
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
                                <Stack.Screen name="splash" options={{ headerShown: false, animation: 'fade' }} />
                                <Stack.Screen name="login" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                                <Stack.Screen name="register" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
                                <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
                                <Stack.Screen name="bills" options={{ headerShown: false, presentation: 'card', animation: 'slide_from_right' }} />
                                <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
                            </Stack>
                        </AuthGuard>
                    </SecurityProvider>
                    <StatusBar style="auto" />
                </ThemeProvider>
            </NativeBaseProvider>
        </ReduxProvider>
    );
}