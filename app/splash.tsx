import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@/store/slices/authSlice';
import { LinearGradient } from 'expo-linear-gradient';
import { isOnboardingCompleted } from '@/utils/onboarding';
import { COLORS, TYPOGRAPHY, SPACING } from '@/assets/colors/theme';

export default function SplashScreen() {
  const router = useRouter();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const handleNavigation = async () => {
      if (isNavigating) return; // Prevent multiple navigations

      try {
        // Wait a bit for a better user experience
        await new Promise(resolve => setTimeout(resolve, 2000));

        setIsNavigating(true);

        if (isAuthenticated) {
          console.log('👤 User is authenticated, navigating to dashboard');
          router.replace('/(tabs)');
        } else {
          // Check if onboarding has been completed
          const onboardingDone = await isOnboardingCompleted();
          // const onboardingDone = false;

          if (onboardingDone) {
            console.log('📋 Onboarding completed, navigating to login');
            router.replace('/login');
          } else {
            console.log('🎯 First time user, navigating to onboarding');
            router.replace('/onboarding');
          }
        }
      } catch (error) {
        console.error('Error during splash navigation:', error);
        // Fallback navigation
        router.replace('/login');
      }
    };

    handleNavigation();
  }, [router, isAuthenticated]);

  return (
      <LinearGradient
          colors={['#0b3d6f', '#1e5a8a', '#2563eb']}
          style={styles.container}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Logo Container */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Image
                  source={require('../assets/images/splash-icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
              />
            </View>
          </View>

          {/* App Name */}
          <View style={styles.textContainer}>
            <Text style={styles.appName}>Hovapay</Text>
            <Text style={styles.tagline}>Pay Smart, Live Easy</Text>
          </View>

          {/* Loading indicator */}
          <View style={styles.loadingContainer}>
            <View style={styles.loadingDot} />
            <View style={[styles.loadingDot, styles.loadingDotDelay1]} />
            <View style={[styles.loadingDot, styles.loadingDotDelay2]} />
          </View>
        </View>

        {/* Bottom branding */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Innovation</Text>
        </View>
      </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  logoContainer: {
    marginBottom: SPACING['3xl'],
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logo: {
    width: 80,
    height: 80,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: SPACING['4xl'],
  },
  appName: {
    fontSize: TYPOGRAPHY.fontSizes['4xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: 1.2,
  },
  tagline: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
    marginHorizontal: 4,
    opacity: 0.4,
    transform: [{ scale: 1 }],
  },
  loadingDotDelay1: {
    opacity: 0.7,
    transform: [{ scale: 1.2 }],
  },
  loadingDotDelay2: {
    opacity: 1,
    transform: [{ scale: 1.4 }],
  },
  footer: {
    position: 'absolute',
    bottom: SPACING['2xl'],
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    letterSpacing: 0.8,
  },
});