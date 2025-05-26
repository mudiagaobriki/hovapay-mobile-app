import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@/store/slices/authSlice';

export default function SplashScreen() {
  const router = useRouter();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    // Navigate to appropriate screen after 2 seconds based on authentication status
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)');
      } else {
        router.replace('/login');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [router, isAuthenticated]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 200,
    height: 200,
  },
});
