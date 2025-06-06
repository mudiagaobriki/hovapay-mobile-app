// app/bills/bulk-sms.tsx
import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Text, Input, FormControl, TextArea } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
    usePayBillMutation,
    useGetWalletBalanceQuery
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

const BulkSMSSchema = Yup.object().shape({
    recipients: Yup.string()
        .required('Recipients are required')
        .test('valid-numbers', 'Please enter valid phone numbers', function(value) {
            if (!value) return false;
            const numbers = value.split(/[,\n]/).map(num => num.trim()).filter(num => num);
            return numbers.every(num => /^[0-9]{11}$/.test(num));
        }),
    message: Yup.string()
        .min(1, 'Message cannot be empty')
        .max(160, 'Message cannot exceed 160 characters')
        .required('Message is required'),
    sender: Yup.string()
        .max(11, 'Sender ID cannot exceed 11 characters')
        .optional(),
});

const quickUnits = [10, 20, 50, 100, 200, 500];
const SMS_UNIT_PRICE = 4; // ₦4 per SMS unit

export default function BulkSMSScreen() {
    const router = useRouter();
    const [selectedUnits, setSelectedUnits] = useState<number | null>(null);
    const [recipientCount, setRecipientCount] = useState<number>(0);
    const [messageLength, setMessageLength] = useState<number>(0);
    const [estimatedCost, setEstimatedCost] = useState<number>(0);

    const { data: walletData } = useGetWalletBalanceQuery();
    const [payBill, { isLoading }] = usePayBillMutation();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const calculateSMSCost = (recipients: string, message: string) => {
        const numbers = recipients.split(/[,\n]/).map(num => num.trim()).filter(num => num && /^[0-9]{11}$/.test(num));
        const recipientCount = numbers.length;
        const messagePages = Math.ceil(message.length / 160) || 1;
        const totalUnits = recipientCount * messagePages;
        const cost = totalUnits * SMS_UNIT_PRICE;

        setRecipientCount(recipientCount);
        setEstimatedCost(cost);

        return { recipientCount, totalUnits, cost };
    };

    const handleSendSMS = async (values: any) => {
        const { recipientCount, totalUnits, cost } = calculateSMSCost(values.recipients, values.message);

        if (recipientCount === 0) {
            Alert.alert('Error', 'Please enter valid phone numbers');
            return;
        }

        if (walletData && cost > walletData.data.balance) {
            Alert.alert('Insufficient Balance', 'Please fund your wallet to continue');
            return;
        }

        Alert.alert(
            'Confirm SMS Sending',
            `Send SMS to ${recipientCount} recipients?\nTotal Cost: ${formatCurrency(cost)}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send SMS',
                    onPress: async () => {
                        try {
                            // For demo purposes, we'll use the SMSclone service
                            const result = await payBill({
                                serviceID: 'smsclone',
                                amount: cost,
                                phone: '+2348000000000', // Placeholder
                                // In a real implementation, you'd send the message and recipients
                                // as additional parameters or use a dedicated SMS API
                            }).unwrap();

                            Alert.alert(
                                'SMS Sent Successfully!',
                                `Your message has been sent to ${recipientCount} recipients`,
                                [{ text: 'OK', onPress: () => router.back() }]
                            );
                        } catch (error: any) {
                            Alert.alert(
                                'SMS Failed',
                                error.message || 'Something went wrong. Please try again.'
                            );
                        }
                    }
                }
            ]
        );
    };

    const renderQuickUnit = (units: number) => (
        <TouchableOpacity
            key={units}
            style={[
                styles.unitCard,
                selectedUnits === units && styles.unitCardSelected
            ]}
            onPress={() => setSelectedUnits(units)}
        >
            <Text style={[
                styles.unitText,
                selectedUnits === units && styles.unitTextSelected
            ]}>
                {units} Units
            </Text>
            <Text style={[
                styles.unitPrice,
                selectedUnits === units && styles.unitPriceSelected
            ]}>
                {formatCurrency(units * SMS_UNIT_PRICE)}
            </Text>
        </TouchableOpacity>
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
                    <Text style={styles.headerTitle}>Bulk SMS</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Wallet Balance</Text>
                    <Text style={styles.balanceAmount}>
                        {walletData ? formatCurrency(walletData.data.balance) : '₦0.00'}
                    </Text>
                </View>
            </LinearGradient>

            {/* Main Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Formik
                    initialValues={{
                        recipients: '',
                        message: '',
                        sender: ''
                    }}
                    validationSchema={BulkSMSSchema}
                    onSubmit={handleSendSMS}
                >
                    {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
                        <>
                            {/* SMS Pricing Info */}
                            <View style={styles.pricingCard}>
                                <MaterialIcons name="info" size={24} color={COLORS.info} />
                                <View style={styles.pricingInfo}>
                                    <Text style={styles.pricingTitle}>SMS Pricing</Text>
                                    <Text style={styles.pricingText}>
                                        ₦4 per SMS unit • 160 characters per page
                                    </Text>
                                </View>
                            </View>

                            {/* Recipients */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Recipients</Text>
                                <Text style={styles.sectionSubtitle}>
                                    Enter phone numbers separated by commas or new lines
                                </Text>
                                <FormControl isInvalid={touched.recipients && errors.recipients}>
                                    <TextArea
                                        h={20}
                                        placeholder="08012345678, 08087654321&#10;or one number per line"
                                        placeholderTextColor={COLORS.textTertiary}
                                        value={values.recipients}
                                        onChangeText={(text) => {
                                            handleChange('recipients')(text);
                                            calculateSMSCost(text, values.message);
                                        }}
                                        onBlur={handleBlur('recipients')}
                                        fontSize={TYPOGRAPHY.fontSizes.base}
                                        color={COLORS.textPrimary}
                                        borderColor={COLORS.border}
                                        backgroundColor={COLORS.backgroundSecondary}
                                        borderRadius={RADIUS.lg}
                                        _focus={{ borderColor: COLORS.primary }}
                                    />
                                    {touched.recipients && errors.recipients && (
                                        <Text style={styles.errorText}>{errors.recipients}</Text>
                                    )}
                                    {recipientCount > 0 && (
                                        <Text style={styles.recipientCount}>
                                            Valid recipients: {recipientCount}
                                        </Text>
                                    )}
                                </FormControl>
                            </View>

                            {/* Sender ID (Optional) */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Sender ID (Optional)</Text>
                                <FormControl isInvalid={touched.sender && errors.sender}>
                                    <View style={[
                                        styles.inputContainer,
                                        touched.sender && errors.sender && styles.inputContainerError
                                    ]}>
                                        <MaterialIcons
                                            name="person"
                                            size={20}
                                            color={COLORS.textTertiary}
                                            style={styles.inputIcon}
                                        />
                                        <Input
                                            flex={1}
                                            variant="unstyled"
                                            placeholder="Your Company"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.sender}
                                            onChangeText={handleChange('sender')}
                                            onBlur={handleBlur('sender')}
                                            maxLength={11}
                                            fontSize={TYPOGRAPHY.fontSizes.base}
                                            color={COLORS.textPrimary}
                                            _focus={{ borderWidth: 0 }}
                                        />
                                    </View>
                                    {touched.sender && errors.sender && (
                                        <Text style={styles.errorText}>{errors.sender}</Text>
                                    )}
                                </FormControl>
                            </View>

                            {/* Message */}
                            <View style={styles.section}>
                                <View style={styles.messageHeader}>
                                    <Text style={styles.sectionTitle}>Message</Text>
                                    <Text style={[
                                        styles.characterCount,
                                        messageLength > 160 && styles.characterCountOver
                                    ]}>
                                        {messageLength}/160
                                    </Text>
                                </View>
                                <FormControl isInvalid={touched.message && errors.message}>
                                    <TextArea
                                        h={32}
                                        placeholder="Type your message here..."
                                        placeholderTextColor={COLORS.textTertiary}
                                        value={values.message}
                                        onChangeText={(text) => {
                                            handleChange('message')(text);
                                            setMessageLength(text.length);
                                            calculateSMSCost(values.recipients, text);
                                        }}
                                        onBlur={handleBlur('message')}
                                        fontSize={TYPOGRAPHY.fontSizes.base}
                                        color={COLORS.textPrimary}
                                        borderColor={COLORS.border}
                                        backgroundColor={COLORS.backgroundSecondary}
                                        borderRadius={RADIUS.lg}
                                        _focus={{ borderColor: COLORS.primary }}
                                    />
                                    {touched.message && errors.message && (
                                        <Text style={styles.errorText}>{errors.message}</Text>
                                    )}
                                    {messageLength > 160 && (
                                        <Text style={styles.pageInfo}>
                                            This message will be sent as {Math.ceil(messageLength / 160)} pages
                                        </Text>
                                    )}
                                </FormControl>
                            </View>

                            {/* Quick Units */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Quick Purchase (SMS Units)</Text>
                                <View style={styles.unitsGrid}>
                                    {quickUnits.map(renderQuickUnit)}
                                </View>
                            </View>

                            {/* Cost Estimate */}
                            {recipientCount > 0 && messageLength > 0 && (
                                <View style={styles.estimateCard}>
                                    <Text style={styles.estimateTitle}>Cost Estimate</Text>
                                    <View style={styles.estimateRow}>
                                        <Text style={styles.estimateLabel}>Recipients:</Text>
                                        <Text style={styles.estimateValue}>{recipientCount}</Text>
                                    </View>
                                    <View style={styles.estimateRow}>
                                        <Text style={styles.estimateLabel}>Message Pages:</Text>
                                        <Text style={styles.estimateValue}>{Math.ceil(messageLength / 160)}</Text>
                                    </View>
                                    <View style={styles.estimateRow}>
                                        <Text style={styles.estimateLabel}>Total Units:</Text>
                                        <Text style={styles.estimateValue}>
                                            {recipientCount * Math.ceil(messageLength / 160)}
                                        </Text>
                                    </View>
                                    <View style={[styles.estimateRow, styles.estimateTotal]}>
                                        <Text style={styles.estimateTotalLabel}>Total Cost:</Text>
                                        <Text style={styles.estimateTotalValue}>
                                            {formatCurrency(estimatedCost)}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Send Button */}
                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    (!values.recipients || !values.message || recipientCount === 0 || isLoading) && styles.sendButtonDisabled
                                ]}
                                onPress={handleSubmit}
                                disabled={!values.recipients || !values.message || recipientCount === 0 || isLoading}
                            >
                                {isLoading ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color={COLORS.textInverse} />
                                        <Text style={styles.sendButtonText}>Sending...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.sendButtonText}>
                                        Send SMS - {formatCurrency(estimatedCost)}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </Formik>
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
        marginBottom: SPACING.xl,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
    },
    placeholder: {
        width: 32,
    },
    balanceCard: {
        backgroundColor: COLORS.withOpacity(COLORS.white, 0.15),
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.withOpacity(COLORS.textInverse, 0.8),
        marginBottom: SPACING.xs,
    },
    balanceAmount: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['2xl'],
        borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
        paddingTop: SPACING.xl,
    },
    pricingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.info + '10',
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginHorizontal: SPACING.xl,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.info + '40',
    },
    pricingInfo: {
        marginLeft: SPACING.base,
    },
    pricingTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.info,
        marginBottom: SPACING.xs,
    },
    pricingText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
    },
    section: {
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    sectionSubtitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.base,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    characterCount: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    characterCountOver: {
        color: COLORS.warning,
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
    errorText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.error,
        marginTop: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    recipientCount: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.success,
        marginTop: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    pageInfo: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.warning,
        marginTop: SPACING.xs,
        fontStyle: 'italic',
    },
    unitsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    unitCard: {
        width: (width - SPACING.xl * 2 - SPACING.base * 2) / 3,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.base,
    },
    unitCardSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    unitText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    unitTextSelected: {
        color: COLORS.textInverse,
    },
    unitPrice: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
    },
    unitPriceSelected: {
        color: COLORS.textInverse,
    },
    estimateCard: {
        margin: SPACING.xl,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    estimateTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    estimateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    estimateLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
    },
    estimateValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    estimateTotal: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        marginTop: SPACING.sm,
    },
    estimateTotalLabel: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    estimateTotalValue: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: SPACING.xl,
        marginBottom: SPACING['2xl'],
        minHeight: 56,
        ...SHADOWS.colored(COLORS.primary),
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    sendButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});