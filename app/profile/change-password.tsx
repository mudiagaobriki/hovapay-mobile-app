// app/profile/change-password.tsx - Change Password Screen with OTP
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Alert,
    TextInput,
    Dimensions,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';

// Import your existing hooks and store
import { useAppSelector } from '@/store/hooks';
import { selectCurrentUser } from '@/store/slices/authSlice';
import {
    useSendForgotPasswordOTPMutation,
    useVerifyResetOTPMutation,
    useResetPasswordMutation,
} from '@/store/api/authApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

// Validation schemas
const OTPRequestSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email').required('Email is required'),
});

const OTPVerifySchema = Yup.object().shape({
    otp: Yup.string()
        .matches(/^[a-zA-Z0-9]{6}$/, 'OTP must be 6 alphanumeric characters')
        .required('OTP is required'),
});

const NewPasswordSchema = Yup.object().shape({
    password: Yup.string()
        .min(6, 'Password must be at least 6 characters')
        .required('Password is required'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Passwords must match')
        .required('Confirm password is required'),
});

type Step = 'request' | 'verify' | 'reset';

export default function ChangePasswordScreen() {
    const router = useRouter();
    const user = useAppSelector(selectCurrentUser);

    // State management
    const [currentStep, setCurrentStep] = useState<Step>('request');
    const [email, setEmail] = useState(user?.email || '');
    const [resetToken, setResetToken] = useState('');
    const [countdown, setCountdown] = useState(0);

    // API hooks
    const [sendOTP, { isLoading: isSendingOTP }] = useSendForgotPasswordOTPMutation();
    const [verifyOTP, { isLoading: isVerifyingOTP }] = useVerifyResetOTPMutation();
    const [resetPassword, { isLoading: isResettingPassword }] = useResetPasswordMutation();

    // Countdown timer for resend OTP
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (countdown > 0) {
            interval = setInterval(() => {
                setCountdown(countdown => countdown - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [countdown]);

    const handleSendOTP = async (values: any) => {
        try {
            const result = await sendOTP({ username: values.email }).unwrap();

            setEmail(values.email);
            setCurrentStep('verify');
            setCountdown(60); // 60 seconds countdown

            Alert.alert(
                'OTP Sent',
                'A 6-digit verification code has been sent to your email address.',
                [{ text: 'OK', style: 'default' }]
            );
        } catch (error: any) {
            console.error('Send OTP error:', error);
            const errorMessage = error.data?.message || 'Failed to send OTP. Please try again.';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleVerifyOTP = async (values: any) => {
        try {
            const result = await verifyOTP({
                username: email,
                otp: values.otp
            }).unwrap();

            setResetToken(result.resetToken);
            setCurrentStep('reset');

            Alert.alert(
                'OTP Verified',
                'Your OTP has been verified successfully. You can now set a new password.',
                [{ text: 'OK', style: 'default' }]
            );
        } catch (error: any) {
            console.error('Verify OTP error:', error);
            const errorMessage = error.data?.message || 'Invalid OTP. Please try again.';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleResetPassword = async (values: any) => {
        try {
            const result = await resetPassword({
                resetToken: resetToken,
                password: values.password
            }).unwrap();

            Alert.alert(
                'Success',
                'Your password has been changed successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back(),
                        style: 'default'
                    }
                ]
            );
        } catch (error: any) {
            console.error('Reset password error:', error);
            const errorMessage = error.data?.message || 'Failed to reset password. Please try again.';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleResendOTP = async () => {
        if (countdown > 0) return;

        try {
            await sendOTP({ username: email }).unwrap();
            setCountdown(60);
            Alert.alert('Success', 'A new OTP has been sent to your email.');
        } catch (error: any) {
            console.error('Resend OTP error:', error);
            const errorMessage = error.data?.message || 'Failed to resend OTP. Please try again.';
            Alert.alert('Error', errorMessage);
        }
    };

    const getStepTitle = () => {
        switch (currentStep) {
            case 'request':
                return 'Change Password';
            case 'verify':
                return 'Verify OTP';
            case 'reset':
                return 'Set New Password';
            default:
                return 'Change Password';
        }
    };

    const getStepDescription = () => {
        switch (currentStep) {
            case 'request':
                return 'Enter your email address to receive a verification code';
            case 'verify':
                return 'Enter the 6-digit code sent to your email';
            case 'reset':
                return 'Create a new secure password for your account';
            default:
                return '';
        }
    };

    const renderStepIndicator = () => (
        <View style={styles.stepIndicator}>
            {['request', 'verify', 'reset'].map((step, index) => (
                <View key={step} style={styles.stepContainer}>
                    <View style={[
                        styles.stepCircle,
                        currentStep === step && styles.stepCircleActive,
                        ['request', 'verify', 'reset'].indexOf(currentStep) > index && styles.stepCircleCompleted
                    ]}>
                        {['request', 'verify', 'reset'].indexOf(currentStep) > index ? (
                            <MaterialIcons name="check" size={16} color={COLORS.textInverse} />
                        ) : (
                            <Text style={[
                                styles.stepNumber,
                                currentStep === step && styles.stepNumberActive
                            ]}>
                                {index + 1}
                            </Text>
                        )}
                    </View>
                    {index < 2 && (
                        <View style={[
                            styles.stepLine,
                            ['request', 'verify', 'reset'].indexOf(currentStep) > index && styles.stepLineCompleted
                        ]} />
                    )}
                </View>
            ))}
        </View>
    );

    const renderRequestForm = () => (
        <Formik
            initialValues={{ email: user?.email || '' }}
            validationSchema={OTPRequestSchema}
            onSubmit={handleSendOTP}
        >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email Address</Text>
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
                                style={styles.textInput}
                                placeholder="Enter your email address"
                                placeholderTextColor={COLORS.textTertiary}
                                value={values.email}
                                onChangeText={handleChange('email')}
                                onBlur={handleBlur('email')}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                editable={!user?.email} // Disable editing if user email is available
                            />
                        </View>
                        {touched.email && errors.email && (
                            <Text style={styles.errorText}>{errors.email}</Text>
                        )}
                        {user?.email && (
                            <Text style={styles.helperText}>
                                Using your registered email address
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, isSendingOTP && styles.submitButtonDisabled]}
                        onPress={() => handleSubmit()}
                        disabled={isSendingOTP}
                    >
                        {isSendingOTP ? (
                            <View style={styles.loadingButtonContent}>
                                <MaterialIcons name="hourglass-empty" size={20} color={COLORS.textInverse} />
                                <Text style={styles.submitButtonText}>Sending OTP...</Text>
                            </View>
                        ) : (
                            <Text style={styles.submitButtonText}>Send Verification Code</Text>
                        )}
                    </TouchableOpacity>
                </>
            )}
        </Formik>
    );

    const renderVerifyForm = () => (
        <Formik
            initialValues={{ otp: '' }}
            validationSchema={OTPVerifySchema}
            onSubmit={handleVerifyOTP}
        >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <>
                    <View style={styles.otpInfo}>
                        <MaterialIcons name="mark-email-read" size={48} color={COLORS.primary} />
                        <Text style={styles.otpDescription}>
                            We've sent a 6-digit verification code to
                        </Text>
                        <Text style={styles.emailText}>{email}</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Verification Code</Text>
                        <TextInput
                            style={[
                                styles.otpInput,
                                touched.otp && errors.otp && styles.inputError
                            ]}
                            value={values.otp}
                            onChangeText={handleChange('otp')}
                            onBlur={handleBlur('otp')}
                            placeholder="000000"
                            placeholderTextColor={COLORS.textTertiary}
                            keyboardType="numeric"
                            maxLength={6}
                            textAlign="center"
                        />
                        {touched.otp && errors.otp && (
                            <Text style={styles.errorText}>{errors.otp}</Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, isVerifyingOTP && styles.submitButtonDisabled]}
                        onPress={() => handleSubmit()}
                        disabled={isVerifyingOTP}
                    >
                        {isVerifyingOTP ? (
                            <View style={styles.loadingButtonContent}>
                                <MaterialIcons name="hourglass-empty" size={20} color={COLORS.textInverse} />
                                <Text style={styles.submitButtonText}>Verifying...</Text>
                            </View>
                        ) : (
                            <Text style={styles.submitButtonText}>Verify Code</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.resendContainer}>
                        <Text style={styles.resendText}>Didn't receive the code? </Text>
                        <TouchableOpacity
                            onPress={handleResendOTP}
                            disabled={countdown > 0}
                        >
                            <Text style={[
                                styles.resendButton,
                                countdown > 0 && styles.resendButtonDisabled
                            ]}>
                                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </Formik>
    );

    const renderResetForm = () => (
        <Formik
            initialValues={{ password: '', confirmPassword: '' }}
            validationSchema={NewPasswordSchema}
            onSubmit={handleResetPassword}
        >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <>
                    <View style={styles.successInfo}>
                        <MaterialIcons name="security" size={48} color={COLORS.success} />
                        <Text style={styles.successDescription}>
                            Create a new secure password for your account
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>New Password</Text>
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
                                style={styles.textInput}
                                placeholder="Enter new password"
                                placeholderTextColor={COLORS.textTertiary}
                                value={values.password}
                                onChangeText={handleChange('password')}
                                onBlur={handleBlur('password')}
                                secureTextEntry
                            />
                        </View>
                        {touched.password && errors.password && (
                            <Text style={styles.errorText}>{errors.password}</Text>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Confirm New Password</Text>
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
                                style={styles.textInput}
                                placeholder="Confirm new password"
                                placeholderTextColor={COLORS.textTertiary}
                                value={values.confirmPassword}
                                onChangeText={handleChange('confirmPassword')}
                                onBlur={handleBlur('confirmPassword')}
                                secureTextEntry
                            />
                        </View>
                        {touched.confirmPassword && errors.confirmPassword && (
                            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.submitButton, isResettingPassword && styles.submitButtonDisabled]}
                        onPress={() => handleSubmit()}
                        disabled={isResettingPassword}
                    >
                        {isResettingPassword ? (
                            <View style={styles.loadingButtonContent}>
                                <MaterialIcons name="hourglass-empty" size={20} color={COLORS.textInverse} />
                                <Text style={styles.submitButtonText}>Updating Password...</Text>
                            </View>
                        ) : (
                            <Text style={styles.submitButtonText}>Update Password</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.passwordTips}>
                        <Text style={styles.tipsTitle}>Password Tips:</Text>
                        <Text style={styles.tipText}>• Use at least 6 characters</Text>
                        <Text style={styles.tipText}>• Mix uppercase and lowercase letters</Text>
                        <Text style={styles.tipText}>• Include numbers and special characters</Text>
                        <Text style={styles.tipText}>• Avoid common words or personal information</Text>
                    </View>
                </>
            )}
        </Formik>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Header */}
            <LinearGradient
                colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={COLORS.textInverse} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{getStepTitle()}</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.headerInfo}>
                    <Text style={styles.headerDescription}>{getStepDescription()}</Text>
                </View>
            </LinearGradient>

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Step Indicator */}
                {renderStepIndicator()}

                {/* Form Content */}
                <View style={styles.formContainer}>
                    {currentStep === 'request' && renderRequestForm()}
                    {currentStep === 'verify' && renderVerifyForm()}
                    {currentStep === 'reset' && renderResetForm()}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
    },
    header: {
        paddingTop: SPACING.base,
        paddingBottom: SPACING.xl,
        paddingHorizontal: SPACING.xl,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.base,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: SPACING.base,
    },
    placeholder: {
        width: 40,
    },
    headerInfo: {
        alignItems: 'center',
        paddingVertical: SPACING.base,
    },
    headerDescription: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.withOpacity(COLORS.textInverse, 0.9),
        textAlign: 'center',
        lineHeight: 24,
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['2xl'],
        borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
    },
    stepIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SPACING.xl,
        paddingHorizontal: SPACING.xl,
    },
    stepContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    stepCircleActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    stepCircleCompleted: {
        backgroundColor: COLORS.success,
        borderColor: COLORS.success,
    },
    stepNumber: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textTertiary,
    },
    stepNumberActive: {
        color: COLORS.textInverse,
    },
    stepLine: {
        width: 40,
        height: 2,
        backgroundColor: COLORS.border,
        marginHorizontal: SPACING.xs,
    },
    stepLineCompleted: {
        backgroundColor: COLORS.success,
    },
    formContainer: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING['4xl'],
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    inputLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.base,
        minHeight: 56,
    },
    inputContainerError: {
        borderColor: COLORS.error,
        backgroundColor: COLORS.withOpacity(COLORS.error, 0.05),
    },
    inputIcon: {
        marginRight: SPACING.sm,
    },
    textInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        paddingVertical: SPACING.base,
    },
    otpInput: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.base,
        fontSize: TYPOGRAPHY.fontSizes['2xl'],
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
        letterSpacing: 8,
        minHeight: 64,
    },
    inputError: {
        borderColor: COLORS.error,
        backgroundColor: COLORS.withOpacity(COLORS.error, 0.05),
    },
    errorText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.error,
        marginTop: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    helperText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginTop: SPACING.xs,
        fontStyle: 'italic',
    },
    otpInfo: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        paddingVertical: SPACING.base,
    },
    otpDescription: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.base,
        marginBottom: SPACING.xs,
    },
    emailText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.primary,
        textAlign: 'center',
    },
    successInfo: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        paddingVertical: SPACING.base,
    },
    successDescription: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.base,
        lineHeight: 24,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.lg,
        minHeight: 56,
        ...SHADOWS.colored(COLORS.primary),
    },
    submitButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    submitButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
    loadingButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.lg,
    },
    resendText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
    },
    resendButton: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.primary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    resendButtonDisabled: {
        color: COLORS.textTertiary,
    },
    passwordTips: {
        marginTop: SPACING.xl,
        padding: SPACING.base,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    tipsTitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    tipText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
        marginBottom: 2,
        lineHeight: 16,
    },
});