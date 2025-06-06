// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Redirect, Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { NativeBaseProvider } from 'native-base';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ReduxProvider } from '@/store/provider';
import { useSelector } from 'react-redux'
import { selectIsAuthenticated } from '@/store/slices/authSlice';

// Auth guard component to protect routes
function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const segments = useSegments();
  const pathname = usePathname();

  // Protected routes - require authentication
  const protectedRoutes = ['(tabs)', 'bills'];
  const isInProtectedRoute = protectedRoutes.includes(segments[0]);

  // If we're in a protected route and not authenticated, redirect to login
  if (!isAuthenticated && isInProtectedRoute) {
    return <Redirect href="/login" />;
  }

  // If we're in an auth page and authenticated, redirect to tabs
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
    // Async font loading only occurs in development.
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
                <Stack.Screen
                    name="splash"
                    options={{
                      headerShown: false,
                      animation: 'fade',
                    }}
                />
                <Stack.Screen
                    name="login"
                    options={{
                      headerShown: false,
                      animation: 'slide_from_bottom',
                    }}
                />
                <Stack.Screen
                    name="register"
                    options={{
                      headerShown: false,
                      animation: 'slide_from_bottom',
                    }}
                />
                <Stack.Screen
                    name="(tabs)"
                    options={{
                      headerShown: false,
                      animation: 'fade',
                    }}
                />
                <Stack.Screen
                    name="bills"
                    options={{
                      headerShown: false,
                      presentation: 'card',
                      animation: 'slide_from_right',
                    }}
                />
                <Stack.Screen
                    name="+not-found"
                    options={{
                      title: 'Not Found',
                    }}
                />
              </Stack>
            </AuthGuard>
            <StatusBar style="auto" />
          </ThemeProvider>
        </NativeBaseProvider>
      </ReduxProvider>
  );
}