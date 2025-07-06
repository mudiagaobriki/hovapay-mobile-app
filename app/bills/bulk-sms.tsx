// app/bills/bulk-sms.tsx - Updated with VTPass SMS DND Route
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
    TextInput,
} from 'react-native';
import { Text } from 'native-base';
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
            return numbers.length > 0 && numbers.every(num => /^[0-9]{11}$/.test(num));
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
    const [selectedUnits, setSelectedUnits] = useState(null);
    const [recipientCount, setRecipientCount] = useState(0);
    const [messageLength, setMessageLength] = useState(0);
    const [estimatedCost, setEstimatedCost] = useState(0);

    const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
    const [payBill, { isLoading }] = usePayBillMutation();

    // const formatCurrency = (amount) => {
    //     return new Intl.NumberFormat('en-NG', {
    //         style: 'currency',
    //         currency: 'NGN',
    //         minimumFractionDigits: 0,
    //     }).format(amount);
    // };

    // const calculateSMSCost = (recipients, message) => {
    //     const numbers = recipients.split(/[,\n]/).map(num => num.trim()).filter(num => num && /^[0-9]{11}$/.test(num));
    //     const recipientCount = numbers.length;
    //     const messagePages = Math.ceil(message.length / 160) || 1;
    //     const totalUnits = recipientCount * messagePages;
    //     const cost = totalUnits * SMS_UNIT_PRICE;
    //
    //     setRecipientCount(recipientCount);
    //     setEstimatedCost(cost);
    //
    //     return { recipientCount, totalUnits, cost };
    // };

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

    const handleSendSMS = async (values) => {
        const { recipientCount, totalUnits, cost } = calculateSMSCost(values.recipients, values.message);

        if (recipientCount === 0) {
            Alert.alert('Error', 'Please enter valid phone numbers');
            return;
        }

        if (walletData && cost > walletData.data.balance) {
            Alert.alert(
                'Insufficient Balance',
                `You need ${formatCurrency(cost)} but only have ${formatCurrency(walletData.data.balance)}. Please fund your wallet first.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Fund Wallet', onPress: () => router.push('/wallet/fund') }
                ]
            );
            return;
        }

        Alert.alert(
            'Confirm SMS Sending',
            `Send SMS to ${recipientCount} recipients?\nTotal Cost: ${formatCurrency(cost)}\nMessage: "${values.message.substring(0, 50)}${values.message.length > 50 ? '...' : ''}"`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send SMS',
                    onPress: async () => {
                        try {
                            console.log('Sending bulk SMS with values:', {
                                recipientCount,
                                messageLength: values.message.length,
                                cost,
                                sender: values.sender || 'Hovapay'
                            });

                            // Create the payload for SMS service using the existing payBill endpoint
                            const smsPayload = {
                                serviceID: 'bulk-sms',
                                amount: cost,
                                phone: values.recipients,
                                billersCode: values.sender || 'Hovapay',
                                variation_code: 'bulk-sms',
                                request_id: `SMS_${Date.now()}`,
                                recipients: values.recipients,
                                message: values.message,
                                sender: values.sender || 'Hovapay'
                            };

                            console.log('Sending SMS with payload:', smsPayload);

                            const result = await payBill(smsPayload).unwrap();

                            console.log('Bulk SMS API result:', result);

                            // Refetch wallet balance after successful transaction
                            await refetchWallet();

                            Alert.alert(
                                'SMS Sent Successfully!',
                                `Your message has been sent to ${recipientCount} recipients.\n\nTransaction Reference: ${result.data?.transactionRef || 'N/A'}`,
                                [
                                    {
                                        text: 'View Receipt',
                                        onPress: () => {
                                            router.push({
                                                pathname: '/bills/receipt',
                                                params: {
                                                    transactionRef: result.data?.transactionRef || `SMS_${Date.now()}`,
                                                    type: 'bulk-sms',
                                                    phone: `${recipientCount} recipients`,
                                                    amount: cost.toString(),
                                                    status: result.success ? 'successful' : 'failed',
                                                    serviceName: 'Bulk SMS',
                                                }
                                            });
                                        }
                                    },
                                    {
                                        text: 'View Transactions',
                                        onPress: () => router.push('/(tabs)/transactions')
                                    }
                                ]
                            );
                        } catch (error) {
                            console.error('Bulk SMS sending error:', error);

                            let errorMessage = 'Something went wrong. Please try again.';

                            if (error.status) {
                                switch (error.status) {
                                    case 400:
                                        errorMessage = error.data?.message || 'Invalid request. Please check your inputs.';
                                        break;
                                    case 401:
                                        errorMessage = 'Authentication failed. Please login again.';
                                        break;
                                    case 402:
                                        errorMessage = 'Insufficient wallet balance.';
                                        break;
                                    case 500:
                                        errorMessage = 'Server error. Please try again later.';
                                        break;
                                    default:
                                        errorMessage = error.data?.message || error.message || errorMessage;
                                }
                            } else if (error.message) {
                                errorMessage = error.message;
                            }

                            Alert.alert(
                                'SMS Failed',
                                errorMessage,
                                [
                                    { text: 'OK' },
                                    {
                                        text: 'View Transactions',
                                        onPress: () => router.push('/(tabs)/transactions')
                                    }
                                ]
                            );
                        }
                    }
                }
            ]
        );
    };

    const handleQuickUnitSelect = (units, setFieldValue) => {
        setSelectedUnits(units);
        // Don't reset form inputs, just calculate based on selected units
        // This allows users to use quick purchase without losing their message/recipients
    };

    const handleQuickPurchase = async () => {
        if (!selectedUnits) return;

        const cost = selectedUnits * SMS_UNIT_PRICE;

        if (walletData && cost > walletData.data.balance) {
            Alert.alert(
                'Insufficient Balance',
                `You need ${formatCurrency(cost)} but only have ${formatCurrency(walletData.data.balance)}. Please fund your wallet first.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Fund Wallet', onPress: () => router.push('/wallet/fund') }
                ]
            );
            return;
        }

        Alert.alert(
            'Purchase SMS Units',
            `Purchase ${selectedUnits} SMS units for ${formatCurrency(cost)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Purchase',
                    onPress: async () => {
                        try {
                            console.log('Purchasing SMS units:', {
                                units: selectedUnits,
                                cost
                            });

                            // Create the payload for SMS units service
                            const unitsPayload = {
                                serviceID: 'sms-units',
                                amount: cost,
                                phone: '08000000000', // Placeholder for units purchase
                                variation_code: 'sms-units',
                                request_id: `UNITS_${Date.now()}`,
                            };

                            const result = await payBill(unitsPayload).unwrap();

                            console.log('SMS units purchase result:', result);

                            await refetchWallet();
                            setSelectedUnits(null);

                            Alert.alert(
                                'Purchase Successful!',
                                `${selectedUnits} SMS units have been added to your account.\n\nTransaction Reference: ${result.data?.transactionRef || 'N/A'}`,
                                [
                                    {
                                        text: 'View Receipt',
                                        onPress: () => {
                                            router.push({
                                                pathname: '/bills/receipt',
                                                params: {
                                                    transactionRef: result.data?.transactionRef || `UNITS_${Date.now()}`,
                                                    type: 'sms-units',
                                                    phone: 'SMS Units',
                                                    amount: cost.toString(),
                                                    status: result.success ? 'successful' : 'failed',
                                                    serviceName: 'SMS Units',
                                                }
                                            });
                                        }
                                    },
                                    { text: 'OK' }
                                ]
                            );
                        } catch (error) {
                            console.error('SMS units purchase error:', error);
                            Alert.alert(
                                'Purchase Failed',
                                error.data?.message || error.message || 'Unable to purchase units. Please try again.'
                            );
                        }
                    }
                }
            ]
        );
    };

    const renderQuickUnit = (units, setFieldValue) => (
        <TouchableOpacity
            key={units}
            style={[
                styles.unitCard,
                selectedUnits === units && styles.unitCardSelected
            ]}
            onPress={() => handleQuickUnitSelect(units, setFieldValue)}
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
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
                        <TouchableOpacity
                            style={styles.fundButton}
                            onPress={() => router.push('/wallet/fund')}
                        >
                            <MaterialIcons name="add" size={16} color={COLORS.textInverse} />
                            <Text style={styles.fundButtonText}>Add Money</Text>
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
                <View style={styles.contentContainer}>
                {/* Main Content */}
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
                                    Enter phone numbers separated by commas or new lines (11 digits each)
                                </Text>
                                <View style={[
                                    styles.textAreaContainer,
                                    touched.recipients && errors.recipients && styles.inputContainerError
                                ]}>
                                    <TextInput
                                        style={styles.textArea}
                                        placeholder="08012345678, 08087654321&#10;or one number per line"
                                        placeholderTextColor={COLORS.textTertiary}
                                        value={values.recipients}
                                        onChangeText={(text) => {
                                            handleChange('recipients')(text);
                                            calculateSMSCost(text, values.message);
                                        }}
                                        onBlur={handleBlur('recipients')}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                    />
                                </View>
                                {touched.recipients && errors.recipients && (
                                    <Text style={styles.errorText}>{errors.recipients}</Text>
                                )}
                                {recipientCount > 0 && (
                                    <Text style={styles.recipientCount}>
                                        Valid recipients: {recipientCount}
                                    </Text>
                                )}
                            </View>

                            {/* Sender ID (Optional) */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Sender ID (Optional)</Text>
                                <Text style={styles.sectionSubtitle}>
                                    Custom sender name (max 11 characters). Leave blank to use "Hovapay"
                                </Text>
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
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Your Company"
                                        placeholderTextColor={COLORS.textTertiary}
                                        value={values.sender}
                                        onChangeText={handleChange('sender')}
                                        onBlur={handleBlur('sender')}
                                        maxLength={11}
                                        returnKeyType="next"
                                    />
                                </View>
                                {touched.sender && errors.sender && (
                                    <Text style={styles.errorText}>{errors.sender}</Text>
                                )}
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
                                <View style={[
                                    styles.textAreaContainer,
                                    touched.message && errors.message && styles.inputContainerError
                                ]}>
                                    <TextInput
                                        style={[styles.textArea, { height: 120 }]}
                                        placeholder="Type your message here..."
                                        placeholderTextColor={COLORS.textTertiary}
                                        value={values.message}
                                        onChangeText={(text) => {
                                            handleChange('message')(text);
                                            setMessageLength(text.length);
                                            calculateSMSCost(values.recipients, text);
                                        }}
                                        onBlur={handleBlur('message')}
                                        multiline
                                        numberOfLines={5}
                                        textAlignVertical="top"
                                    />
                                </View>
                                {touched.message && errors.message && (
                                    <Text style={styles.errorText}>{errors.message}</Text>
                                )}
                                {messageLength > 160 && (
                                    <Text style={styles.pageInfo}>
                                        This message will be sent as {Math.ceil(messageLength / 160)} pages
                                    </Text>
                                )}
                            </View>

                            {/* Quick Units */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Quick Purchase (SMS Units)</Text>
                                <Text style={styles.sectionSubtitle}>
                                    Purchase SMS units separately (doesn't affect your current message)
                                </Text>
                                <View style={styles.unitsGrid}>
                                    {quickUnits.map(units => renderQuickUnit(units, setFieldValue))}
                                </View>
                                {selectedUnits && (
                                    <TouchableOpacity
                                        style={[
                                            styles.quickPurchaseButton,
                                            isLoading && styles.quickPurchaseButtonDisabled
                                        ]}
                                        onPress={handleQuickPurchase}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <View style={styles.loadingContainer}>
                                                <ActivityIndicator size="small" color={COLORS.textInverse} />
                                                <Text style={styles.quickPurchaseButtonText}>Purchasing...</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.quickPurchaseButtonText}>
                                                Purchase {selectedUnits} Units - {formatCurrency(selectedUnits * SMS_UNIT_PRICE)}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                )}
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
                                        <Text style={styles.sendButtonText}>Sending SMS...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.sendButtonText}>
                                        Send SMS - {formatCurrency(estimatedCost)}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <View style={{ height: SPACING['4xl'] }} />
                        </>
                    )}
                </Formik>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.primary,
    },
    header: {
        paddingTop: SPACING.base,
        paddingBottom: SPACING['2.5xl'],
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
        textAlign: 'center',
    },
    balanceAmount: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    fundButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.withOpacity(COLORS.white, 0.2),
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.base,
    },
    fundButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textInverse,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        marginLeft: SPACING.xs,
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['2xl'],
        borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
        paddingTop: SPACING.sm,
    },
    pricingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.info + '10',
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginHorizontal: SPACING.xl,
        marginVertical: SPACING.xl,
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
    textAreaContainer: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
    },
    inputIcon: {
        marginRight: SPACING.md,
    },
    textInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: 0,
    },
    textArea: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        minHeight: 80,
        paddingVertical: SPACING.xs,
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
    quickPurchaseButton: {
        backgroundColor: COLORS.secondary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        marginTop: SPACING.base,
    },
    quickPurchaseButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    quickPurchaseButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
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
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        backgroundColor: COLORS.background,
        // borderTopLeftRadius: RADIUS['2xl'],
        // borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
        paddingTop: SPACING.sm,
        flex: 1,
    },
});