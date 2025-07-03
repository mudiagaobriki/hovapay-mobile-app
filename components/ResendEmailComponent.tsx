import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Alert,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';

// Import your existing hooks and store
import { useAppSelector } from '@/store/hooks';
import { selectCurrentUser } from '@/store/slices/authSlice';
import { useResendVerificationEmailMutation } from '@/store/api/authApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

interface ResendEmailComponentProps {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    showInstructions?: boolean;
    variant?: 'card' | 'banner' | 'button';
}

export default function ResendEmailComponent({
                                                 onSuccess,
                                                 onError,
                                                 showInstructions = true,
                                                 variant = 'card'
                                             }: ResendEmailComponentProps) {
    const user = useAppSelector(selectCurrentUser);
    const [countdown, setCountdown] = useState(0);
    const [emailSent, setEmailSent] = useState(false);

    // API hook
    const [resendEmail, { isLoading: isResending }] = useResendVerificationEmailMutation();

    // Countdown timer for resend button
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (countdown > 0) {
            interval = setInterval(() => {
                setCountdown(countdown => countdown - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [countdown]);

    // Don't show component if user is already verified
    if (user?.verified) {
        return null;
    }

    const handleResendEmail = async () => {
        if (!user?.email) {
            const errorMsg = 'Email address not found. Please try logging in again.';
            Alert.alert('Error', errorMsg);
            onError?.(errorMsg);
            return;
        }

        if (countdown > 0) {
            return; // Prevent spam clicking
        }

        try {
            const result = await resendEmail({ email: user.email }).unwrap();

            setEmailSent(true);
            setCountdown(60); // 60 seconds countdown

            const successMsg = `Verification email sent to ${user.email}`;
            Alert.alert('Email Sent!', successMsg);
            onSuccess?.();

        } catch (error: any) {
            console.error('Resend email error:', error);
            const errorMessage = error.data?.message || 'Failed to send verification email. Please try again.';
            Alert.alert('Error', errorMessage);
            onError?.(errorMessage);
        }
    };

    const formatCountdown = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Button variant - just the resend button
    if (variant === 'button') {
        return (
            <TouchableOpacity
                style={[
                    styles.resendButton,
                    (isResending || countdown > 0) && styles.resendButtonDisabled
                ]}
                onPress={handleResendEmail}
                disabled={isResending || countdown > 0}
            >
                {isResending ? (
                    <View style={styles.loadingButtonContent}>
                        <MaterialIcons name="hourglass-empty" size={20} color={COLORS.textInverse} />
                        <Text style={styles.resendButtonText}>Sending...</Text>
                    </View>
                ) : countdown > 0 ? (
                    <View style={styles.countdownContent}>
                        <MaterialIcons name="timer" size={20} color={COLORS.textTertiary} />
                        <Text style={styles.countdownText}>
                            Resend in {formatCountdown(countdown)}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.resendButtonContent}>
                        <MaterialIcons name="refresh" size={20} color={COLORS.textInverse} />
                        <Text style={styles.resendButtonText}>
                            {emailSent ? 'Resend Email' : 'Send Verification Email'}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }

    // Banner variant - compact notification bar
    if (variant === 'banner') {
        return (
            <View style={styles.bannerContainer}>
                <View style={styles.bannerContent}>
                    <MaterialIcons name="warning" size={20} color={COLORS.warning} />
                    <Text style={styles.bannerText}>
                        Please verify your email address
                    </Text>
                </View>
                <TouchableOpacity
                    style={[
                        styles.bannerButton,
                        (isResending || countdown > 0) && styles.bannerButtonDisabled
                    ]}
                    onPress={handleResendEmail}
                    disabled={isResending || countdown > 0}
                >
                    <Text style={[
                        styles.bannerButtonText,
                        (isResending || countdown > 0) && styles.bannerButtonTextDisabled
                    ]}>
                        {isResending
                            ? 'Sending...'
                            : countdown > 0
                                ? `${countdown}s`
                                : 'Resend'
                        }
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Card variant - full component with instructions
    return (
        <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
                <MaterialIcons name="mark-email-unread" size={24} color={COLORS.warning} />
                <Text style={styles.cardTitle}>Email Verification Required</Text>
            </View>

            <Text style={styles.cardDescription}>
                Your email address needs to be verified to secure your account and unlock all features.
            </Text>

            <View style={styles.emailDisplay}>
                <MaterialIcons name="email" size={16} color={COLORS.textTertiary} />
                <Text style={styles.emailText}>{user?.email}</Text>
            </View>

            {showInstructions && (
                <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsTitle}>How to verify:</Text>
                    <Text style={styles.instructionText}>
                        1. Check your email inbox for a message from Hovapay
                    </Text>
                    <Text style={styles.instructionText}>
                        2. Click the "Verify Email Address" button in the email
                    </Text>
                    <Text style={styles.instructionText}>
                        3. Return to the app - your email will be verified automatically
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[
                    styles.resendButton,
                    (isResending || countdown > 0) && styles.resendButtonDisabled
                ]}
                onPress={handleResendEmail}
                disabled={isResending || countdown > 0}
            >
                {isResending ? (
                    <View style={styles.loadingButtonContent}>
                        <MaterialIcons name="hourglass-empty" size={20} color={COLORS.textInverse} />
                        <Text style={styles.resendButtonText}>Sending...</Text>
                    </View>
                ) : countdown > 0 ? (
                    <View style={styles.countdownContent}>
                        <MaterialIcons name="timer" size={20} color={COLORS.textTertiary} />
                        <Text style={styles.countdownText}>
                            Resend in {formatCountdown(countdown)}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.resendButtonContent}>
                        <MaterialIcons name="refresh" size={20} color={COLORS.textInverse} />
                        <Text style={styles.resendButtonText}>
                            {emailSent ? 'Resend Verification Email' : 'Send Verification Email'}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            <Text style={styles.helpText}>
                Don't see the email? Check your spam folder or contact support.
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    // Card variant styles
    cardContainer: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginHorizontal: SPACING.xl,
        marginBottom: SPACING.lg,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.warning,
        ...SHADOWS.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    cardTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginLeft: SPACING.sm,
    },
    cardDescription: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        lineHeight: 24,
        marginBottom: SPACING.base,
    },
    emailDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        marginBottom: SPACING.base,
    },
    emailText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textPrimary,
        marginLeft: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    instructionsContainer: {
        marginBottom: SPACING.base,
    },
    instructionsTitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    instructionText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
        marginBottom: 2,
        lineHeight: 16,
    },
    helpText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        textAlign: 'center',
        marginTop: SPACING.sm,
        lineHeight: 16,
    },

    // Banner variant styles
    bannerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.withOpacity(COLORS.warning, 0.1),
        borderWidth: 1,
        borderColor: COLORS.withOpacity(COLORS.warning, 0.3),
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        marginHorizontal: SPACING.xl,
        marginBottom: SPACING.base,
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    bannerText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.warning,
        marginLeft: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    bannerButton: {
        backgroundColor: COLORS.warning,
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
    },
    bannerButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    bannerButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textInverse,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
    bannerButtonTextDisabled: {
        color: COLORS.textTertiary,
    },

    // Button styles (shared)
    resendButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 48,
        ...SHADOWS.colored(COLORS.primary),
    },
    resendButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    resendButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    resendButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
    loadingButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    countdownContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    countdownText: {
        color: COLORS.textTertiary,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
});