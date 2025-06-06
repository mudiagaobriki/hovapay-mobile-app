import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  TextInput,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useRegisterMutation } from '@/store/api/authApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { MaterialIcons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width, height } = Dimensions.get('window');

export default function RegisterScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [register, { isLoading }] = useRegisterMutation();
  const dispatch = useDispatch();
  const router = useRouter();

  // Create refs for input fields
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const RegisterSchema = Yup.object().shape({
    username: Yup.string()
        .min(3, 'Username must be at least 3 characters')
        .required('Username is required'),
    email: Yup.string()
        .email('Please enter a valid email address')
        .required('Email is required'),
    phone: Yup.string()
        .matches(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
        .required('Phone number is required'),
    password: Yup.string()
        .min(8, 'Password must be at least 8 characters')
        .matches(
            /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/,
            'Password must contain uppercase, lowercase, number and special character'
        )
        .required('Password is required'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Please confirm your password'),
  });

  const handleRegister = async (values: any, { setSubmitting }: any) => {
    try {
      const { username, email, phone, password } = values;
      const result = await register({
        username,
        email,
        phone,
        password,
        type: 'user' // Required by your backend
      }).unwrap();

      // Show success message about email verification
      Alert.alert(
          'Registration Successful',
          'Please check your email to verify your account before signing in.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/login')
            }
          ]
      );
    } catch (error: any) {
      let errorMessage = 'Something went wrong. Please try again.';

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details && error.details.length > 0) {
        errorMessage = error.details.join(', ');
      }

      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setSubmitting(false);
    }
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
          <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <MaterialIcons name="person-add" size={32} color={COLORS.primary} />
                </View>
              </View>
              <Text style={styles.welcomeText}>Create Account</Text>
              <Text style={styles.subtitleText}>Join us and get started</Text>
            </View>

            <View style={styles.formContainer}>
              <Formik
                  initialValues={{
                    username: '',
                    email: '',
                    phone: '',
                    password: '',
                    confirmPassword: ''
                  }}
                  validationSchema={RegisterSchema}
                  onSubmit={handleRegister}
              >
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
                    <>
                      <View style={styles.inputWrapper}>
                        <View style={[
                          styles.inputContainer,
                          touched.username && errors.username && styles.inputContainerError
                        ]}>
                          <MaterialIcons
                              name="person"
                              size={20}
                              color={COLORS.textTertiary}
                              style={styles.inputIcon}
                          />
                          <TextInput
                              style={styles.textInput}
                              placeholder="Username"
                              placeholderTextColor={COLORS.textTertiary}
                              value={values.username}
                              onChangeText={handleChange('username')}
                              onBlur={handleBlur('username')}
                              autoCapitalize="none"
                              autoCorrect={false}
                              returnKeyType="next"
                              onSubmitEditing={() => emailRef.current?.focus()}
                              blurOnSubmit={false}
                          />
                        </View>
                        {touched.username && errors.username && (
                            <Text style={styles.errorText}>{errors.username}</Text>
                        )}
                      </View>

                      <View style={styles.inputWrapper}>
                        <View style={[
                          styles.inputContainer,
                          touched.email && errors.email && styles.inputContainerError
                        ]}>
                          <MaterialIcons
                              name="email"
                              size={20}
                              color={COLORS.textTertiary}
                              style={styles.inputIcon}
                          />
                          <TextInput
                              ref={emailRef}
                              style={styles.textInput}
                              placeholder="Email address"
                              placeholderTextColor={COLORS.textTertiary}
                              value={values.email}
                              onChangeText={handleChange('email')}
                              onBlur={handleBlur('email')}
                              keyboardType="email-address"
                              autoCapitalize="none"
                              autoCorrect={false}
                              returnKeyType="next"
                              onSubmitEditing={() => phoneRef.current?.focus()}
                              blurOnSubmit={false}
                          />
                        </View>
                        {touched.email && errors.email && (
                            <Text style={styles.errorText}>{errors.email}</Text>
                        )}
                      </View>

                      <View style={styles.inputWrapper}>
                        <View style={[
                          styles.inputContainer,
                          touched.phone && errors.phone && styles.inputContainerError
                        ]}>
                          <MaterialIcons
                              name="phone"
                              size={20}
                              color={COLORS.textTertiary}
                              style={styles.inputIcon}
                          />
                          <TextInput
                              ref={phoneRef}
                              style={styles.textInput}
                              placeholder="Phone number"
                              placeholderTextColor={COLORS.textTertiary}
                              value={values.phone}
                              onChangeText={handleChange('phone')}
                              onBlur={handleBlur('phone')}
                              keyboardType="phone-pad"
                              returnKeyType="next"
                              onSubmitEditing={() => passwordRef.current?.focus()}
                              blurOnSubmit={false}
                          />
                        </View>
                        {touched.phone && errors.phone && (
                            <Text style={styles.errorText}>{errors.phone}</Text>
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
                              ref={passwordRef}
                              style={styles.textInput}
                              placeholder="Password"
                              placeholderTextColor={COLORS.textTertiary}
                              value={values.password}
                              onChangeText={handleChange('password')}
                              onBlur={handleBlur('password')}
                              secureTextEntry={!showPassword}
                              returnKeyType="next"
                              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                              blurOnSubmit={false}
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

                      <View style={styles.inputWrapper}>
                        <View style={[
                          styles.inputContainer,
                          touched.confirmPassword && errors.confirmPassword && styles.inputContainerError
                        ]}>
                          <MaterialIcons
                              name="lock"
                              size={20}
                              color={COLORS.textTertiary}
                              style={styles.inputIcon}
                          />
                          <TextInput
                              ref={confirmPasswordRef}
                              style={styles.textInput}
                              placeholder="Confirm password"
                              placeholderTextColor={COLORS.textTertiary}
                              value={values.confirmPassword}
                              onChangeText={handleChange('confirmPassword')}
                              onBlur={handleBlur('confirmPassword')}
                              secureTextEntry={!showConfirmPassword}
                              returnKeyType="done"
                              onSubmitEditing={() => handleSubmit()}
                              autoCorrect={false}
                          />
                          <TouchableOpacity
                              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                              style={styles.eyeIcon}
                          >
                            <MaterialIcons
                                name={showConfirmPassword ? "visibility" : "visibility-off"}
                                size={20}
                                color={COLORS.textTertiary}
                            />
                          </TouchableOpacity>
                        </View>
                        {touched.confirmPassword && errors.confirmPassword && (
                            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                        )}
                      </View>

                      <TouchableOpacity
                          style={[
                            styles.registerButton,
                            (isLoading || isSubmitting) && styles.registerButtonDisabled
                          ]}
                          onPress={handleSubmit}
                          disabled={isLoading || isSubmitting}
                          activeOpacity={0.8}
                      >
                        {isLoading || isSubmitting ? (
                            <ActivityIndicator color={COLORS.textInverse} size="small" />
                        ) : (
                            <Text style={styles.registerButtonText}>Create Account</Text>
                        )}
                      </TouchableOpacity>
                    </>
                )}
              </Formik>

              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By creating an account, you agree to our{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={styles.linkText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? SPACING['4xl'] : SPACING['3xl'],
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS['3xl'],
    borderTopRightRadius: RADIUS['3xl'],
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING['3xl'],
    paddingBottom: SPACING['3xl'],
    ...SHADOWS.lg,
    minHeight: height * 0.75,
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
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.base,
    minHeight: 56,
    ...SHADOWS.colored(COLORS.primary),
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  termsContainer: {
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.sm,
  },
  termsText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeights.relaxed * TYPOGRAPHY.fontSizes.xs,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
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