// app/_layout.tsx - Simple version
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Redirect, Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { NativeBaseProvider } from 'native-base';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ReduxProvider } from '@/store/provider';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated } from '@/store/slices/authSlice';

// Simple auth guard
function AuthGuard({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const segments = useSegments();
    const pathname = usePathname();

    const protectedRoutes = ['(tabs)', 'bills'];
    const isInProtectedRoute = protectedRoutes.includes(segments[0]);

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
                    <StatusBar style="auto" />
                </ThemeProvider>
            </NativeBaseProvider>
        </ReduxProvider>
    );
}