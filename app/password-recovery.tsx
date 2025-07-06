import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    TextInput,
    Text,
    ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';
import {
    useVerifyResetOTPEnhancedMutation,
    useResetPasswordMutation,
    useSendForgotPasswordOTPEnhancedMutation
} from '@/store/api/authApi';

export default function PasswordRecoveryScreen() {
    const [currentStep, setCurrentStep] = useState('email');
    const [userIdentifier, setUserIdentifier] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetToken, setResetToken] = useState('');
    const [countdown, setCountdown] = useState(0);

    const router = useRouter();

    const passwordInputRef = useRef<TextInput>(null);
    const confirmPasswordInputRef = useRef<TextInput>(null);

    const [sendOTP, { isLoading: isSendingOTP }] = useSendForgotPasswordOTPEnhancedMutation();
    const [verifyOTP, { isLoading: isVerifyingOTP }] = useVerifyResetOTPEnhancedMutation();
    const [resetPassword, { isLoading: isResettingPassword }] = useResetPasswordMutation();

    // Countdown timer for resend OTP
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const EmailSchema = Yup.object().shape({
        identifier: Yup.string()
            .required('Email, username, or phone is required')
            .min(3, 'Please enter a valid identifier'),
    });

    const OTPSchema = Yup.object().shape({
        otp: Yup.string()
            .required('OTP is required')
            .length(6, 'OTP must be 6 digits')
            .matches(/^\d+$/, 'OTP must contain only numbers'),
    });

    const PasswordSchema = Yup.object().shape({
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

    const handleSendOTP = async (values: any, { setSubmitting }: any) => {
        try {
            console.log('Sending OTP for:', values.identifier);

            if (!values.identifier || values.identifier.trim().length === 0) {
                Alert.alert('Error', 'Please enter your email, username, or phone number.');
                setSubmitting(false);
                return;
            }

            const result = await sendOTP({
                username: values.identifier.trim()
            }).unwrap();

            console.log('OTP sent successfully:', result);

            setUserIdentifier(values.identifier.trim());
            setCurrentStep('otp');
            setCountdown(60);

            Alert.alert('Success', 'Verification code sent successfully to your email.');
        } catch (error: any) {
            console.error('Send OTP error:', error);

            let errorMessage = 'Failed to send verification code. Please try again.';
            if (error?.data?.message) {
                errorMessage = error.data.message;
            } else if (error?.message) {
                errorMessage = error.message;
            }

            Alert.alert('Error', errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerifyOTP = async (values: any, { setSubmitting }: any) => {
        try {
            console.log('Verifying OTP:', values.otp, 'for user:', userIdentifier);

            if (!userIdentifier || userIdentifier.trim().length === 0) {
                Alert.alert('Error', 'Session expired. Please start the process again.');
                setCurrentStep('email');
                setSubmitting(false);
                return;
            }

            if (!values.otp || values.otp.trim().length !== 6) {
                Alert.alert('Error', 'Please enter a valid 6-digit OTP.');
                setSubmitting(false);
                return;
            }

            const result = await verifyOTP({
                username: userIdentifier.trim(),
                otp: values.otp.trim()
            }).unwrap();

            console.log('OTP verified successfully:', result);

            if (!result.resetToken) {
                throw new Error('No reset token received');
            }

            setResetToken(result.resetToken);
            setCurrentStep('password');

            Alert.alert('Success', 'OTP verified successfully. Please enter your new password.');
        } catch (error: any) {
            console.error('OTP verification error:', error);

            let errorMessage = 'Invalid OTP. Please try again.';
            if (error?.data?.message) {
                errorMessage = error.data.message;
            } else if (error?.message) {
                errorMessage = error.message;
            }

            // Handle specific error cases
            if (error?.status === 429) {
                errorMessage = error?.data?.message || 'Too many attempts. Account temporarily locked.';
            }

            Alert.alert('Verification Failed', errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleResetPassword = async (values: any, { setSubmitting }: any) => {
        try {
            console.log('Resetting password with token:', resetToken ? 'Token exists' : 'No token');

            if (!resetToken || resetToken.trim().length === 0) {
                Alert.alert('Error', 'Session expired. Please start the process again.');
                setCurrentStep('email');
                setSubmitting(false);
                return;
            }

            if (!values.password || values.password.length < 8) {
                Alert.alert('Error', 'Password must be at least 8 characters long.');
                setSubmitting(false);
                return;
            }

            if (values.password !== values.confirmPassword) {
                Alert.alert('Error', 'Passwords do not match.');
                setSubmitting(false);
                return;
            }

            await resetPassword({
                resetToken: resetToken.trim(),
                password: values.password
            }).unwrap();

            Alert.alert(
                'Success',
                'Your password has been reset successfully. You can now sign in with your new password.',
                [
                    {
                        text: 'Sign In',
                        onPress: () => router.replace('/login')
                    }
                ]
            );
        } catch (error: any) {
            console.error('Password reset error:', error);

            let errorMessage = 'Failed to reset password. Please try again.';
            if (error?.data?.message) {
                errorMessage = error.data.message;
            } else if (error?.message) {
                errorMessage = error.message;
            }

            Alert.alert('Reset Failed', errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const handleResendOTP = async () => {
        if (!userIdentifier || userIdentifier.trim().length === 0) {
            Alert.alert('Error', 'Please start the password recovery process again.');
            setCurrentStep('email');
            return;
        }

        try {
            console.log('Resending OTP for:', userIdentifier);

            await sendOTP({ username: userIdentifier.trim() }).unwrap();
            setCountdown(60);
            Alert.alert('Success', 'A new OTP has been sent to your email.');
        } catch (error: any) {
            console.error('Resend OTP error:', error);

            let errorMessage = 'Failed to resend OTP. Please try again.';
            if (error?.data?.message) {
                errorMessage = error.data.message;
            } else if (error?.message) {
                errorMessage = error.message;
            }

            Alert.alert('Error', errorMessage);
        }
    };

    const renderEmailStep = () => (
        <Formik
            initialValues={{ identifier: '' }}
            validationSchema={EmailSchema}
            onSubmit={handleSendOTP}
        >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
                <>
                    <View style={styles.stepIndicator}>
                        <View style={[styles.stepDot, styles.stepDotActive]} />
                        <View style={styles.stepLine} />
                        <View style={styles.stepDot} />
                        <View style={styles.stepLine} />
                        <View style={styles.stepDot} />
                    </View>

                    <Text style={styles.stepTitle}>Password Recovery</Text>
                    <Text style={styles.stepSubtitle}>
                        Enter your email, username, or phone number to receive a verification code
                    </Text>

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
                                placeholder="Email, username, or phone"
                                placeholderTextColor={COLORS.textTertiary}
                                value={values.identifier}
                                onChangeText={handleChange('identifier')}
                                onBlur={handleBlur('identifier')}
                                keyboardType="email-address"
                                returnKeyType="done"
                                onSubmitEditing={() => handleSubmit()}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                        {touched.identifier && errors.identifier && (
                            <Text style={styles.errorText}>{errors.identifier}</Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            (isSendingOTP || isSubmitting) && styles.actionButtonDisabled
                        ]}
                        onPress={() => handleSubmit()}
                        disabled={isSendingOTP || isSubmitting}
                    >
                        {isSendingOTP || isSubmitting ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color={COLORS.textInverse} size="small" />
                                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>
                                    Sending Code...
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.actionButtonText}>Send Verification Code</Text>
                        )}
                    </TouchableOpacity>
                </>
            )}
        </Formik>
    );

    const renderOTPStep = () => (
        <Formik
            initialValues={{ otp: '' }}
            validationSchema={OTPSchema}
            onSubmit={handleVerifyOTP}
        >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
                <>
                    <View style={styles.stepIndicator}>
                        <View style={[styles.stepDot, styles.stepDotCompleted]}>
                            <MaterialIcons name="check" size={12} color={COLORS.textInverse} />
                        </View>
                        <View style={[styles.stepLine, styles.stepLineCompleted]} />
                        <View style={[styles.stepDot, styles.stepDotActive]} />
                        <View style={styles.stepLine} />
                        <View style={styles.stepDot} />
                    </View>

                    <Text style={styles.stepTitle}>Enter Verification Code</Text>
                    <Text style={styles.stepSubtitle}>
                        We've sent a 6-digit verification code to your email and phone number
                    </Text>

                    <View style={styles.inputWrapper}>
                        <View style={[
                            styles.inputContainer,
                            touched.otp && errors.otp && styles.inputContainerError
                        ]}>
                            <MaterialIcons
                                name="security"
                                size={20}
                                color={COLORS.textTertiary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.textInput}
                                placeholder="Enter 6-digit OTP"
                                placeholderTextColor={COLORS.textTertiary}
                                value={values.otp}
                                onChangeText={handleChange('otp')}
                                onBlur={handleBlur('otp')}
                                keyboardType="numeric"
                                maxLength={6}
                                returnKeyType="done"
                                onSubmitEditing={() => handleSubmit()}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                        {touched.otp && errors.otp && (
                            <Text style={styles.errorText}>{errors.otp}</Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.resendContainer}
                        onPress={handleResendOTP}
                        disabled={countdown > 0 || isSendingOTP}
                    >
                        <Text style={[
                            styles.resendText,
                            (countdown > 0 || isSendingOTP) && styles.resendTextDisabled
                        ]}>
                            {isSendingOTP ? 'Sending...' :
                                countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            (isVerifyingOTP || isSubmitting) && styles.actionButtonDisabled
                        ]}
                        onPress={() => handleSubmit()}
                        disabled={isVerifyingOTP || isSubmitting}
                    >
                        {isVerifyingOTP || isSubmitting ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color={COLORS.textInverse} size="small" />
                                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>
                                    Verifying...
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.actionButtonText}>Verify Code</Text>
                        )}
                    </TouchableOpacity>
                </>
            )}
        </Formik>
    );

    const renderPasswordStep = () => (
        <Formik
            initialValues={{ password: '', confirmPassword: '' }}
            validationSchema={PasswordSchema}
            onSubmit={handleResetPassword}
        >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
                <>
                    <View style={styles.stepIndicator}>
                        <View style={[styles.stepDot, styles.stepDotCompleted]}>
                            <MaterialIcons name="check" size={12} color={COLORS.textInverse} />
                        </View>
                        <View style={[styles.stepLine, styles.stepLineCompleted]} />
                        <View style={[styles.stepDot, styles.stepDotCompleted]}>
                            <MaterialIcons name="check" size={12} color={COLORS.textInverse} />
                        </View>
                        <View style={[styles.stepLine, styles.stepLineCompleted]} />
                        <View style={[styles.stepDot, styles.stepDotActive]} />
                    </View>

                    <Text style={styles.stepTitle}>Create New Password</Text>
                    <Text style={styles.stepSubtitle}>
                        Choose a strong password to secure your account
                    </Text>

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
                                placeholder="New Password"
                                placeholderTextColor={COLORS.textTertiary}
                                value={values.password}
                                onChangeText={handleChange('password')}
                                onBlur={handleBlur('password')}
                                secureTextEntry={!showPassword}
                                returnKeyType="next"
                                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                                autoCorrect={false}
                                autoCapitalize="none"
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
                                ref={confirmPasswordInputRef}
                                style={styles.textInput}
                                placeholder="Confirm New Password"
                                placeholderTextColor={COLORS.textTertiary}
                                value={values.confirmPassword}
                                onChangeText={handleChange('confirmPassword')}
                                onBlur={handleBlur('confirmPassword')}
                                secureTextEntry={!showConfirmPassword}
                                returnKeyType="done"
                                onSubmitEditing={() => handleSubmit()}
                                autoCorrect={false}
                                autoCapitalize="none"
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

                    {/* Password Requirements */}
                    <View style={styles.requirementsContainer}>
                        <Text style={styles.requirementsTitle}>Password must contain:</Text>
                        <View style={styles.requirementItem}>
                            <MaterialIcons
                                name={(values.password?.length || 0) >= 8 ? "check-circle" : "radio-button-unchecked"}
                                size={16}
                                color={(values.password?.length || 0) >= 8 ? COLORS.success : COLORS.textTertiary}
                            />
                            <Text style={[
                                styles.requirementText,
                                (values.password?.length || 0) >= 8 && styles.requirementTextValid
                            ]}>
                                At least 8 characters
                            </Text>
                        </View>
                        <View style={styles.requirementItem}>
                            <MaterialIcons
                                name={/[A-Z]/.test(values.password || '') ? "check-circle" : "radio-button-unchecked"}
                                size={16}
                                color={/[A-Z]/.test(values.password || '') ? COLORS.success : COLORS.textTertiary}
                            />
                            <Text style={[
                                styles.requirementText,
                                /[A-Z]/.test(values.password || '') && styles.requirementTextValid
                            ]}>
                                One uppercase letter
                            </Text>
                        </View>
                        <View style={styles.requirementItem}>
                            <MaterialIcons
                                name={/[a-z]/.test(values.password || '') ? "check-circle" : "radio-button-unchecked"}
                                size={16}
                                color={/[a-z]/.test(values.password || '') ? COLORS.success : COLORS.textTertiary}
                            />
                            <Text style={[
                                styles.requirementText,
                                /[a-z]/.test(values.password || '') && styles.requirementTextValid
                            ]}>
                                One lowercase letter
                            </Text>
                        </View>
                        <View style={styles.requirementItem}>
                            <MaterialIcons
                                name={/\d/.test(values.password || '') ? "check-circle" : "radio-button-unchecked"}
                                size={16}
                                color={/\d/.test(values.password || '') ? COLORS.success : COLORS.textTertiary}
                            />
                            <Text style={[
                                styles.requirementText,
                                /\d/.test(values.password || '') && styles.requirementTextValid
                            ]}>
                                One number
                            </Text>
                        </View>
                        <View style={styles.requirementItem}>
                            <MaterialIcons
                                name={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(values.password || '') ? "check-circle" : "radio-button-unchecked"}
                                size={16}
                                color={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(values.password || '') ? COLORS.success : COLORS.textTertiary}
                            />
                            <Text style={[
                                styles.requirementText,
                                /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(values.password || '') && styles.requirementTextValid
                            ]}>
                                One special character
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            (isResettingPassword || isSubmitting) && styles.actionButtonDisabled
                        ]}
                        onPress={() => handleSubmit()}
                        disabled={isResettingPassword || isSubmitting}
                    >
                        {isResettingPassword || isSubmitting ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator color={COLORS.textInverse} size="small" />
                                <Text style={[styles.actionButtonText, { marginLeft: 8 }]}>
                                    Resetting Password...
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.actionButtonText}>Reset Password</Text>
                        )}
                    </TouchableOpacity>
                </>
            )}
        </Formik>
    );

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
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={COLORS.textInverse} />
                    </TouchableOpacity>

                    <View style={styles.logoContainer}>
                        <View style={styles.logoCircle}>
                            <MaterialIcons name="lock-reset" size={32} color={COLORS.primary} />
                        </View>
                    </View>
                    <Text style={styles.welcomeText}>Password Recovery</Text>
                    <Text style={styles.subtitleText}>
                        {currentStep === 'email' ? 'Enter your account details' :
                            currentStep === 'otp' ? 'Verify your identity' : 'Create a new password'}
                    </Text>
                </View>

                <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                    <View style={styles.formContent}>
                        {currentStep === 'email' ? renderEmailStep() :
                            currentStep === 'otp' ? renderOTPStep() : renderPasswordStep()}
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
    headerContainer: {
        paddingTop: Platform.OS === 'ios' ? SPACING['4xl'] : SPACING['3xl'],
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xl,
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? SPACING['4xl'] : SPACING['3xl'],
        left: SPACING.xl,
        padding: SPACING.xs,
        zIndex: 1,
    },
    logoContainer: {
        marginBottom: SPACING.lg,
        marginTop: SPACING.xl,
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
        fontSize: TYPOGRAPHY.fontSizes['3xl'],
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    subtitleText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.withOpacity(COLORS.textInverse, 0.8),
        textAlign: 'center',
    },
    formContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['3xl'],
        borderTopRightRadius: RADIUS['3xl'],
    },
    formContent: {
        padding: SPACING.xl,
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
    },
    stepDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepDotActive: {
        backgroundColor: COLORS.primary,
    },
    stepDotCompleted: {
        backgroundColor: COLORS.success,
    },
    stepLine: {
        width: 60,
        height: 2,
        backgroundColor: COLORS.border,
        marginHorizontal: SPACING.sm,
    },
    stepLineCompleted: {
        backgroundColor: COLORS.success,
    },
    stepTitle: {
        fontSize: TYPOGRAPHY.fontSizes['2xl'],
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    stepSubtitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        lineHeight: 24,
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
    resendContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    resendText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.primary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    resendTextDisabled: {
        color: COLORS.textTertiary,
    },
    actionButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
        ...SHADOWS.colored(COLORS.primary),
    },
    actionButtonDisabled: {
        opacity: 0.7,
    },
    actionButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requirementsContainer: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.xl,
    },
    requirementsTitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    requirementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    requirementText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginLeft: SPACING.sm,
    },
    requirementTextValid: {
        color: COLORS.success,
    },
});