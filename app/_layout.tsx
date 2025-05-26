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

  // If we're in a protected route and not authenticated, redirect to login
  if (!isAuthenticated && segments[0] === '(tabs)') {
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
            <Stack initialRouteName="splash">
              <Stack.Screen name="splash" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="register" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </AuthGuard>
          <StatusBar style="auto" />
        </ThemeProvider>
      </NativeBaseProvider>
    </ReduxProvider>
  );
}
