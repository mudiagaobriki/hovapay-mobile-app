import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  TextInput,
  Text,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLoginMutation, useBiometricLoginMutation, useCheckBiometricEligibilityMutation } from '@/store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { MaterialIcons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { LinearGradient } from 'expo-linear-gradient';
import BiometricService from '../utils/BiometricService';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading }] = useLoginMutation();
  const [biometricLogin, { isLoading: isBiometricLoading }] = useBiometricLoginMutation();
  const [checkEligibility, { isLoading: isCheckingEligibility }] = useCheckBiometricEligibilityMutation();
  const dispatch = useDispatch();
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);

  // Biometric states
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricUserData, setBiometricUserData] = useState(null);
  const [currentIdentifier, setCurrentIdentifier] = useState('');
  const [userEligibleForBiometric, setUserEligibleForBiometric] = useState(false);

  useEffect(() => {
    console.log('LoginScreen rendered');
    initializeBiometricSupport();
  }, []);

  // Check biometric eligibility when identifier changes
  useEffect(() => {
    if (currentIdentifier && currentIdentifier.length > 3) {
      checkUserBiometricEligibility(currentIdentifier);
    } else {
      setUserEligibleForBiometric(false);
      setBiometricUserData(null);
    }
  }, [currentIdentifier]);

  const initializeBiometricSupport = async () => {
    try {
      const isSupported = await BiometricService.isBiometricAvailable();
      setBiometricSupported(isSupported);

      if (isSupported) {
        console.log('✅ Biometric authentication is supported');

        // Check if we have any stored biometric data
        const storedData = await BiometricService.getStoredBiometricData();
        if (storedData?.lastUsedIdentifier) {
          setCurrentIdentifier(storedData.lastUsedIdentifier);
          console.log('📱 Found stored identifier:', storedData.lastUsedIdentifier);
        }
      } else {
        console.log('❌ Biometric authentication not supported');
      }
    } catch (error) {
      console.error('Error initializing biometric support:', error);
    }
  };

  const checkUserBiometricEligibility = async (identifier) => {
    try {
      console.log('🔍 Checking biometric eligibility for:', identifier);

      const result = await checkEligibility({ identifier }).unwrap();
      console.log('📋 Eligibility result:', result);

      if (result.eligible && result.biometricType) {
        setUserEligibleForBiometric(true);
        setBiometricUserData({
          lastUsedIdentifier: identifier,
          biometricEnabled: true,
          biometricType: result.biometricType
        });
        console.log('✅ User is eligible for biometric login');
      } else {
        setUserEligibleForBiometric(false);
        setBiometricUserData(null);
        console.log('❌ User not eligible:', result.reason);
      }
    } catch (error) {
      console.error('Error checking biometric eligibility:', error);
      setUserEligibleForBiometric(false);
      setBiometricUserData(null);
    }
  };

  const LoginSchema = Yup.object().shape({
    identifier: Yup.string().required('Username, email, or phone is required'),
    password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(
            /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
            'Password must contain uppercase, lowercase, number and special character'
        )
        .required('Password is required')
  });

  const handleLogin = async (values: any, { setSubmitting }: any) => {
    console.log('Login attempt started with values:', {
      identifier: values.identifier,
      passwordLength: values.password?.length || 0
    });

    try {
      console.log('Calling login API...');

      const result = await login({
        email: values.identifier,
        password: values.password
      }).unwrap();

      console.log('Login API response received:', {
        hasUser: !!result.user,
        hasToken: !!result.token,
        userEmail: result.user?.email,
        biometricSignIn: result.user?.biometricSignIn
      });

      dispatch(setCredentials({
        user: result.user,
        token: result.token
      }));

      // Store biometric data if user has it enabled
      if (result.user?.biometricSignIn && biometricSupported) {
        await BiometricService.enableBiometricForUser(
            values.identifier,
            result.user.biometricType || 'Biometric'
        );
        console.log('💾 Stored biometric data for future logins');
      }

      console.log("Login successful, navigating to dashboard");

      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);

    } catch (error: any) {
      console.error('Login error details:', error);
      handleLoginError(error);
    } finally {
      console.log('Login attempt finished');
      setSubmitting(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      console.log('🔐 Starting biometric authentication...');

      if (!biometricSupported) {
        Alert.alert('Not Available', 'Biometric authentication is not available on this device.');
        return;
      }

      if (!biometricUserData?.lastUsedIdentifier) {
        Alert.alert('Error', 'No user data found for biometric login.');
        return;
      }

      // Authenticate with device biometrics
      const authResult = await BiometricService.authenticate({
        promptMessage: `Sign in with ${biometricUserData.biometricType}`,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
      });

      if (!authResult.success) {
        if (!authResult.cancelled) {
          Alert.alert('Authentication Failed',
              authResult.error || 'Biometric authentication failed. Please try again.');
        }
        return;
      }

      console.log('✅ Device biometric authentication successful');

      // Get device ID
      const deviceId = await BiometricService.getDeviceId();

      // Call backend biometric login
      const result = await biometricLogin({
        identifier: biometricUserData.lastUsedIdentifier,
        biometricType: authResult.biometricType || biometricUserData.biometricType,
        deviceId,
      }).unwrap();

      console.log('🌐 Backend biometric login successful:', result);

      dispatch(setCredentials({
        user: result.user,
        token: result.token
      }));

      // Update stored biometric data
      await BiometricService.storeBiometricData({
        ...biometricUserData,
        lastUsed: new Date().toISOString()
      });

      console.log("Biometric login successful, navigating to dashboard");

      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);

    } catch (error: any) {
      console.error('Biometric login error:', error);
      handleBiometricLoginError(error);
    }
  };

  const handleLoginError = (error: any) => {
    let errorMessage = 'Something went wrong. Please try again.';

    if (error?.data?.message) {
      errorMessage = error.data.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (error?.data?.details && error.data.details.length > 0) {
      errorMessage = error.data.details.join(', ');
    }

    console.log('Showing error alert:', errorMessage);
    Alert.alert('Login Failed', errorMessage);
  };

  const handleBiometricLoginError = (error: any) => {
    let errorMessage = 'Biometric login failed. Please try again or use your password.';

    if (error?.data?.message) {
      errorMessage = error.data.message;
    }

    Alert.alert(
        'Biometric Login Failed',
        errorMessage,
        [
          { text: 'Try Again', onPress: handleBiometricLogin },
          { text: 'Use Password', style: 'cancel' }
        ]
    );
  };

  const getBiometricIcon = (): string => {
    const biometricType = biometricUserData?.biometricType || 'Biometric';
    return BiometricService.getBiometricIcon(biometricType);
  };

  const getBiometricTypeString = (): string => {
    return biometricUserData?.biometricType || 'Biometric';
  };

  const handleForgotPassword = () => {
    console.log('Navigating to password recovery screen');
    router.push('/password-recovery');
  };

  const handleIdentifierChange = (text: string) => {
    setCurrentIdentifier(text);
  };

  return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <LinearGradient
            colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
          {/* Fixed Header */}
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Image
                    source={require('@/assets/images/splash-icon.png')}
                    style={styles.logoIcon}
                    resizeMode="contain"
                    onError={(error) => console.log('Image load error:', error)}
                />
              </View>
            </View>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subtitleText}>Sign in to your account</Text>
          </View>

          {/* Scrollable Form */}
          <KeyboardAvoidingView
              style={styles.keyboardAvoidingView}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
                style={styles.formContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.formContentContainer}
                bounces={false}
            >
              <Formik
                  initialValues={{
                    identifier: biometricUserData?.lastUsedIdentifier || '',
                    password: ''
                  }}
                  validationSchema={LoginSchema}
                  onSubmit={handleLogin}
                  enableReinitialize={true}
              >
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting, setFieldValue }) => (
                    <View style={styles.formContent}>
                      <View style={styles.inputWrapper}>
                        <View style={[
                          styles.inputContainer,
                          touched.identifier && errors.identifier && styles.inputContainerError
                        ]}>
                          <MaterialIcons
                              name="person"
                              size={20}
                              color={COLORS.textTertiary}
                              style={styles.inputIcon}
                          />
                          <TextInput
                              style={styles.textInput}
                              placeholder="Username, email, or phone"
                              placeholderTextColor={COLORS.textTertiary}
                              value={values.identifier}
                              onChangeText={(text) => {
                                setFieldValue('identifier', text);
                                handleIdentifierChange(text);
                              }}
                              onBlur={handleBlur('identifier')}
                              autoCapitalize="none"
                              autoCorrect={false}
                              returnKeyType="next"
                              onSubmitEditing={() => passwordInputRef.current?.focus()}
                              blurOnSubmit={false}
                          />
                          {isCheckingEligibility && (
                              <ActivityIndicator
                                  size="small"
                                  color={COLORS.primary}
                                  style={{ marginLeft: 8 }}
                              />
                          )}
                        </View>
                        {touched.identifier && errors.identifier && (
                            <Text style={styles.errorText}>{errors.identifier}</Text>
                        )}
                      </View>

                      <View style={styles.inputWrapper}>
                        <View style={[
                          styles.inputContainer,
                          touched.password && errors.password && styles.inputContainerError
                        ]}>
                          <MaterialIcons
                              name="lock"
                              size={20}
                              color={COLORS.textTertiary}
                              style={styles.inputIcon}
                          />
                          <TextInput
                              ref={passwordInputRef}
                              style={styles.textInput}
                              placeholder="Password"
                              placeholderTextColor={COLORS.textTertiary}
                              value={values.password}
                              onChangeText={handleChange('password')}
                              onBlur={handleBlur('password')}
                              secureTextEntry={!showPassword}
                              returnKeyType="done"
                              onSubmitEditing={() => handleSubmit()}
                              autoCorrect={false}
                          />
                          <TouchableOpacity
                              onPress={() => setShowPassword(!showPassword)}
                              style={styles.eyeIcon}
                          >
                            <MaterialIcons
                                name={showPassword ? "visibility" : "visibility-off"}
                                size={20}
                                color={COLORS.textTertiary}
                            />
                          </TouchableOpacity>
                        </View>
                        {touched.password && errors.password && (
                            <Text style={styles.errorText}>{errors.password}</Text>
                        )}
                      </View>

                      <TouchableOpacity
                          style={styles.forgotPassword}
                          onPress={handleForgotPassword}
                          activeOpacity={0.7}
                      >
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                          style={[
                            styles.loginButton,
                            (isLoading || isSubmitting) && styles.loginButtonDisabled
                          ]}
                          onPress={() => handleSubmit()}
                          disabled={isLoading || isSubmitting}
                          activeOpacity={0.8}
                      >
                        {isLoading || isSubmitting ? (
                            <View style={styles.loadingContainer}>
                              <ActivityIndicator color={COLORS.textInverse} size="small" />
                              <Text style={[styles.loginButtonText, { marginLeft: 8 }]}>
                                Signing In...
                              </Text>
                            </View>
                        ) : (
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        )}
                      </TouchableOpacity>

                      {/* Enhanced Biometric Login Button */}
                      {biometricSupported && userEligibleForBiometric && biometricUserData && (
                          <TouchableOpacity
                              style={[
                                styles.biometricButton,
                                isBiometricLoading && styles.biometricButtonDisabled
                              ]}
                              onPress={handleBiometricLogin}
                              disabled={isBiometricLoading || isLoading || isSubmitting}
                              activeOpacity={0.8}
                          >
                            {isBiometricLoading ? (
                                <View style={styles.biometricContent}>
                                  <ActivityIndicator color={COLORS.primary} size="small" />
                                  <Text style={[styles.biometricButtonText, { marginLeft: 8 }]}>
                                    Authenticating...
                                  </Text>
                                </View>
                            ) : (
                                <View style={styles.biometricContent}>
                                  <MaterialIcons
                                      name={getBiometricIcon()}
                                      size={24}
                                      color={COLORS.primary}
                                  />
                                  <View style={styles.biometricTextContainer}>
                                    <Text style={styles.biometricButtonText}>
                                      Sign in with {getBiometricTypeString()}
                                    </Text>
                                    <Text style={styles.biometricSubtext}>
                                      {biometricUserData.lastUsedIdentifier}
                                    </Text>
                                  </View>
                                </View>
                            )}
                          </TouchableOpacity>
                      )}

                      {/* Biometric Status Indicator */}
                      {currentIdentifier && !userEligibleForBiometric && biometricSupported && !isCheckingEligibility && (
                          <View style={styles.biometricStatus}>
                            <MaterialIcons name="info-outline" size={16} color={COLORS.textTertiary} />
                            <Text style={styles.biometricStatusText}>
                              Biometric login not enabled for this account
                            </Text>
                          </View>
                      )}

                      <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or</Text>
                        <View style={styles.dividerLine} />
                      </View>

                      <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account? </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/register')}
                            style={styles.linkContainer}
                            activeOpacity={0.7}
                        >
                          <Text style={styles.linkText}>Sign Up</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                )}
              </Formik>
            </ScrollView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  gradient: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? SPACING['4xl'] : SPACING['3xl'],
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  logoContainer: {
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.withOpacity(COLORS.white, 0.95),
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  logoIcon: {
    width: 48,
    height: 48,
  },
  welcomeText: {
    fontSize: TYPOGRAPHY.fontSizes['4xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.textInverse,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.fontSizes['4xl'] * 1.2,
  },
  subtitleText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.withOpacity(COLORS.textInverse, 0.8),
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.fontSizes.base * 1.3,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  formContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS['3xl'],
    borderTopRightRadius: RADIUS['3xl'],
  },
  formContentContainer: {
    flexGrow: 1,
    paddingBottom: SPACING['4xl'],
  },
  formContent: {
    padding: SPACING.xl,
  },
  inputWrapper: {
    marginBottom: SPACING.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
    minHeight: 56,
  },
  inputContainerError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.withOpacity(COLORS.error, 0.05),
  },
  inputIcon: {
    marginRight: SPACING.md,
  },
  textInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  eyeIcon: {
    padding: SPACING.xs,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  forgotPasswordText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    minHeight: 56,
    ...SHADOWS.colored(COLORS.primary),
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  biometricButton: {
    backgroundColor: COLORS.withOpacity(COLORS.primary, 0.08),
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.lg,
    minHeight: 72,
  },
  biometricButtonDisabled: {
    opacity: 0.7,
  },
  biometricContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  biometricButtonText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  biometricSubtext: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    marginTop: 2,
  },
  biometricStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.base,
  },
  biometricStatusText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.textTertiary,
    marginLeft: 6,
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: SPACING.base,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.textTertiary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  linkText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    textDecorationLine: 'underline',
  },
  linkContainer: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.withOpacity(COLORS.primary, 0.1),
  },
});