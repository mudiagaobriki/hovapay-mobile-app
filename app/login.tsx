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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLoginMutation } from '@/store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { MaterialIcons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    console.log('LoginScreen rendered');
  }, []);

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
        email: values.identifier, // Backend expects 'email' field for identifier
        password: values.password
      }).unwrap();

      console.log('Login API response received:', {
        hasUser: !!result.user,
        hasToken: !!result.token,
        userEmail: result.user?.email
      });

      dispatch(setCredentials({
        user: result.user,
        token: result.token
      }));

      console.log("Login successful, navigating to dashboard");

      // Use setTimeout to ensure state is updated before navigation
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 100);

    } catch (error: any) {
      console.error('Login error details:', {
        error,
        errorData: error?.data,
        errorMessage: error?.message,
        errorStatus: error?.status,
        errorDetails: error?.details
      });

      let errorMessage = 'Something went wrong. Please try again.';

      // Handle different error structures
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.data?.details && error.data.details.length > 0) {
        errorMessage = error.data.details.join(', ');
      } else if (error?.details && error.details.length > 0) {
        errorMessage = error.details.join(', ');
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      console.log('Showing error alert:', errorMessage);
      Alert.alert('Login Failed', errorMessage);
    } finally {
      console.log('Login attempt finished, setting submitting to false');
      setSubmitting(false);
    }
  };

  const handleForgotPassword = () => {
    console.log('Navigating to password recovery screen');
    router.push('/password-recovery');
  };

  return (
      <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        <LinearGradient
            colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <MaterialIcons name="lock" size={32} color={COLORS.primary} />
              </View>
            </View>
            <Text style={styles.welcomeText}>Welcome Back</Text>
            <Text style={styles.subtitleText}>Sign in to your account</Text>
          </View>

          <View style={styles.formContainer}>
            <Formik
                initialValues={{ identifier: '', password: '' }}
                validationSchema={LoginSchema}
                onSubmit={handleLogin}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
                  <>
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
                            onChangeText={handleChange('identifier')}
                            onBlur={handleBlur('identifier')}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="next"
                            onSubmitEditing={() => passwordInputRef.current?.focus()}
                            blurOnSubmit={false}
                        />
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
                        onPress={() => {
                          console.log('Login button pressed');
                          console.log('Form values:', values);
                          console.log('Form errors:', errors);
                          console.log('Is submitting:', isSubmitting);
                          console.log('Is loading:', isLoading);
                          handleSubmit();
                        }}
                        disabled={isLoading || isSubmitting}
                        activeOpacity={0.8}
                    >
                      {isLoading || isSubmitting ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator color={COLORS.textInverse} size="small" />
                            <Text style={[styles.loginButtonText, { marginLeft: 8 }]}>
                              {isLoading ? 'Signing In...' : 'Processing...'}
                            </Text>
                          </View>
                      ) : (
                          <Text style={styles.loginButtonText}>Sign In</Text>
                      )}
                    </TouchableOpacity>
                  </>
              )}
            </Formik>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.linkText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  headerContainer: {
    flex: 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? SPACING['4xl'] : SPACING['3xl'],
    paddingHorizontal: SPACING.xl,
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
  formContainer: {
    flex: 0.55,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS['3xl'],
    borderTopRightRadius: RADIUS['3xl'],
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING['3xl'],
    paddingBottom: SPACING.xl,
    ...SHADOWS.lg,
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
    marginBottom: SPACING.xl,
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
    marginTop: 'auto',
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.textSecondary,
  },
  linkText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
});