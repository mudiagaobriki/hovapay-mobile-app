// app/wallet/fund.tsx
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
    Image,
} from 'react-native';
import { Text, Input, FormControl } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
    useFundWalletMutation,
    useGetWalletBalanceQuery
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

const FundWalletSchema = Yup.object().shape({
    amount: Yup.number()
        .min(100, 'Minimum amount is ₦100')
        .max(500000, 'Maximum amount is ₦500,000')
        .required('Amount is required'),
});

const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

interface PaymentGateway {
    id: 'paystack' | 'monnify';
    name: string;
    description: string;
    logoUrl: string;
    color: string;
    primaryColor: string;
    features: string[];
    processingTime: string;
    fees: string;
}

const paymentGateways: PaymentGateway[] = [
    {
        id: 'paystack',
        name: 'Paystack',
        description: 'Nigeria\'s leading payment platform',
        logoUrl: 'https://res.cloudinary.com/dwyzq40iu/image/upload/v1748430825/paystack-logo-removebg-preview_c0y6oe.png',
        color: '#0FA958',
        primaryColor: '#011B33',
        features: ['Cards', 'Transfer', 'USSD'],
        processingTime: 'Instant',
        fees: 'Free',
    },
    {
        id: 'monnify',
        name: 'Monnify',
        description: 'Simple, secure, reliable payments',
        logoUrl: 'https://res.cloudinary.com/dwyzq40iu/image/upload/v1748430337/monnify-logo-removebg-preview_iyghhy.png',
        color: '#182CD1',
        primaryColor: '#182CD1',
        features: ['Bank Transfer', 'Cards', 'Virtual Account'],
        processingTime: 'Instant',
        fees: 'Free',
    },
];

export default function FundWalletScreen() {
    const router = useRouter();
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(paymentGateways[0]);

    const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
    const [fundWallet, { isLoading }] = useFundWalletMutation();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const handleFundWallet = async (values: any) => {
        if (!selectedGateway) {
            Alert.alert('Error', 'Please select a payment method');
            return;
        }

        try {
            const result = await fundWallet({
                amount: values.amount,
                gateway: selectedGateway.id,
            }).unwrap();

            // The API should return payment initialization data
            // In a real implementation, you would redirect to the payment gateway
            Alert.alert(
                'Payment Initialized',
                `Redirecting to ${selectedGateway.name} to complete your ₦${values.amount} payment`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Continue',
                        onPress: () => {
                            // Here you would typically:
                            // 1. Open payment gateway URL in WebView or browser
                            // 2. Handle payment callback
                            // 3. Refresh wallet balance
                            console.log('Payment result:', result);

                            // For demo purposes, simulate successful payment
                            setTimeout(() => {
                                refetchWallet();
                                Alert.alert(
                                    'Payment Successful!',
                                    `₦${values.amount} has been added to your wallet`,
                                    [{ text: 'OK', onPress: () => router.back() }]
                                );
                            }, 2000);
                        },
                    },
                ]
            );
        } catch (error: any) {
            Alert.alert(
                'Payment Failed',
                error.message || 'Something went wrong. Please try again.'
            );
        }
    };

    const renderQuickAmount = (amount: number) => (
        <TouchableOpacity
            key={amount}
            style={[
                styles.amountCard,
                selectedAmount === amount && styles.amountCardSelected
            ]}
            onPress={() => setSelectedAmount(amount)}
        >
            <Text style={[
                styles.amountText,
                selectedAmount === amount && styles.amountTextSelected
            ]}>
                {formatCurrency(amount)}
            </Text>
        </TouchableOpacity>
    );

    const renderPaymentGateway = (gateway: PaymentGateway) => (
        <TouchableOpacity
            key={gateway.id}
            style={[
                styles.gatewayCard,
                selectedGateway?.id === gateway.id && [
                    styles.gatewayCardSelected,
                    { borderColor: gateway.primaryColor }
                ]
            ]}
            onPress={() => setSelectedGateway(gateway)}
            activeOpacity={0.7}
        >
            {/* Selection Indicator */}
            <View style={styles.selectionIndicator}>
                <View style={[
                    styles.radioButton,
                    selectedGateway?.id === gateway.id && [
                        styles.radioButtonSelected,
                        { backgroundColor: gateway.primaryColor }
                    ]
                ]}>
                    {selectedGateway?.id === gateway.id && (
                        <MaterialIcons name="check" size={12} color={COLORS.textInverse} />
                    )}
                </View>
            </View>

            {/* Gateway Header */}
            <View style={styles.gatewayHeader}>
                <View style={styles.gatewayLogoContainer}>
                    <Image
                        source={{ uri: gateway.logoUrl }}
                        style={styles.gatewayLogo}
                        resizeMode="contain"
                    />
                </View>

                <View style={styles.gatewayInfo}>
                    <View style={styles.gatewayTitleRow}>
                        <Text style={[
                            styles.gatewayName,
                            selectedGateway?.id === gateway.id && { color: gateway.primaryColor }
                        ]}>
                            {gateway.name}
                        </Text>
                        <View style={styles.badgesRow}>
                            <View style={[styles.processingBadge, { backgroundColor: gateway.color + '15' }]}>
                                <MaterialIcons name="flash-on" size={10} color={gateway.color} />
                                <Text style={[styles.processingText, { color: gateway.color }]}>
                                    {gateway.processingTime}
                                </Text>
                            </View>
                            <View style={styles.feesBadge}>
                                <Text style={styles.feesText}>{gateway.fees}</Text>
                            </View>
                        </View>
                    </View>
                    <Text style={styles.gatewayDescription}>{gateway.description}</Text>

                    {/* Payment Methods */}
                    <View style={styles.gatewayFeatures}>
                        {gateway.features.map((feature, index) => (
                            <View key={index} style={[
                                styles.featureTag,
                                { borderColor: gateway.primaryColor + '30' }
                            ]}>
                                <Text style={[styles.featureText, { color: gateway.primaryColor }]}>
                                    {feature}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
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
                    <Text style={styles.headerTitle}>Fund Wallet</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Current Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={styles.balanceAmount}>
                        {walletData ? formatCurrency(walletData.balance) : '₦0.00'}
                    </Text>
                </View>
            </LinearGradient>

            {/* Main Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Formik
                    initialValues={{ amount: selectedAmount || '' }}
                    validationSchema={FundWalletSchema}
                    onSubmit={handleFundWallet}
                    enableReinitialize
                >
                    {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
                        <>
                            {/* Funding Info */}
                            <View style={styles.infoCard}>
                                <MaterialIcons name="info" size={24} color={COLORS.info} />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoTitle}>Safe & Secure</Text>
                                    <Text style={styles.infoText}>
                                        Your payment is secured with bank-level encryption
                                    </Text>
                                </View>
                            </View>

                            {/* Quick Amounts */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Quick Amount</Text>
                                <View style={styles.amountsGrid}>
                                    {quickAmounts.map(renderQuickAmount)}
                                </View>
                            </View>

                            {/* Custom Amount */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Or Enter Amount</Text>
                                <FormControl isInvalid={touched.amount && errors.amount}>
                                    <View style={[
                                        styles.inputContainer,
                                        touched.amount && errors.amount && styles.inputContainerError
                                    ]}>
                                        <Text style={styles.currencySymbol}>₦</Text>
                                        <Input
                                            flex={1}
                                            variant="unstyled"
                                            placeholder="0"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.amount.toString()}
                                            onChangeText={(text) => {
                                                setFieldValue('amount', text);
                                                setSelectedAmount(null);
                                            }}
                                            onBlur={handleBlur('amount')}
                                            keyboardType="numeric"
                                            fontSize={TYPOGRAPHY.fontSizes.lg}
                                            color={COLORS.textPrimary}
                                            fontWeight={TYPOGRAPHY.fontWeights.semibold}
                                            _focus={{ borderWidth: 0 }}
                                        />
                                    </View>
                                    {touched.amount && errors.amount && (
                                        <Text style={styles.errorText}>{errors.amount}</Text>
                                    )}
                                    <Text style={styles.amountInfo}>
                                        Minimum: ₦100 • Maximum: ₦500,000
                                    </Text>
                                </FormControl>
                            </View>

                            {/* Payment Methods */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Choose Payment Method</Text>
                                <Text style={styles.sectionSubtitle}>
                                    Select your preferred way to fund your wallet
                                </Text>
                                <View style={styles.gatewaysContainer}>
                                    {paymentGateways.map(renderPaymentGateway)}
                                </View>

                                {/* Trust Indicators */}
                                <View style={styles.trustIndicators}>
                                    <View style={styles.trustItem}>
                                        <MaterialIcons name="verified-user" size={16} color={COLORS.success} />
                                        <Text style={styles.trustText}>Bank-level security</Text>
                                    </View>
                                    <View style={styles.trustItem}>
                                        <MaterialIcons name="schedule" size={16} color={COLORS.info} />
                                        <Text style={styles.trustText}>Instant processing</Text>
                                    </View>
                                    <View style={styles.trustItem}>
                                        <MaterialIcons name="money-off" size={16} color={COLORS.primary} />
                                        <Text style={styles.trustText}>No hidden fees</Text>
                                    </View>
                                </View>
                            </View>

                            {/* New Balance Preview */}
                            {values.amount && (
                                <View style={styles.previewCard}>
                                    <Text style={styles.previewTitle}>After Funding</Text>
                                    <View style={styles.previewRow}>
                                        <Text style={styles.previewLabel}>Current Balance:</Text>
                                        <Text style={styles.previewValue}>
                                            {walletData ? formatCurrency(walletData.balance) : '₦0.00'}
                                        </Text>
                                    </View>
                                    <View style={styles.previewRow}>
                                        <Text style={styles.previewLabel}>Amount to Add:</Text>
                                        <Text style={styles.previewValue}>
                                            +{formatCurrency(Number(values.amount))}
                                        </Text>
                                    </View>
                                    <View style={[styles.previewRow, styles.previewTotal]}>
                                        <Text style={styles.previewTotalLabel}>New Balance:</Text>
                                        <Text style={styles.previewTotalValue}>
                                            {formatCurrency((walletData?.balance || 0) + Number(values.amount))}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Security Features */}
                            <View style={styles.securityCard}>
                                <View style={styles.securityHeader}>
                                    <MaterialIcons name="security" size={24} color={COLORS.success} />
                                    <Text style={styles.securityTitle}>Your Security is Our Priority</Text>
                                </View>
                                <View style={styles.securityFeatures}>
                                    <View style={styles.securityFeature}>
                                        <MaterialIcons name="https" size={16} color={COLORS.success} />
                                        <Text style={styles.securityText}>256-bit SSL Encryption</Text>
                                    </View>
                                    <View style={styles.securityFeature}>
                                        <MaterialIcons name="verified-user" size={16} color={COLORS.success} />
                                        <Text style={styles.securityText}>PCI DSS Level 1 Certified</Text>
                                    </View>
                                    <View style={styles.securityFeature}>
                                        <MaterialIcons name="shield" size={16} color={COLORS.success} />
                                        <Text style={styles.securityText}>Fraud Protection</Text>
                                    </View>
                                    <View style={styles.securityFeature}>
                                        <MaterialIcons name="lock" size={16} color={COLORS.success} />
                                        <Text style={styles.securityText}>Secure Payment Processing</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Fund Button */}
                            <TouchableOpacity
                                style={[
                                    styles.fundButton,
                                    (!values.amount || !selectedGateway || isLoading) && styles.fundButtonDisabled
                                ]}
                                onPress={() => {
                                    if (selectedAmount && selectedAmount !== values.amount) {
                                        setFieldValue('amount', selectedAmount);
                                    }
                                    handleSubmit();
                                }}
                                disabled={!values.amount || !selectedGateway || isLoading}
                            >
                                {isLoading ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color={COLORS.textInverse} />
                                        <Text style={styles.fundButtonText}>Processing...</Text>
                                    </View>
                                ) : (
                                    <View style={styles.buttonContent}>
                                        <MaterialIcons name="account-balance-wallet" size={20} color={COLORS.textInverse} />
                                        <Text style={styles.fundButtonText}>
                                            Fund Wallet - {values.amount ? formatCurrency(Number(values.amount)) : '₦0'}
                                        </Text>
                                    </View>
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
    infoCard: {
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
    infoContent: {
        marginLeft: SPACING.base,
    },
    infoTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.info,
        marginBottom: SPACING.xs,
    },
    infoText: {
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
        marginBottom: SPACING.base,
    },
    amountsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    amountCard: {
        width: (width - SPACING.xl * 2 - SPACING.base * 2) / 3,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.base,
    },
    amountCardSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    amountText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
    },
    amountTextSelected: {
        color: COLORS.textInverse,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.sm,
        minHeight: 64,
    },
    inputContainerError: {
        borderColor: COLORS.error,
        backgroundColor: COLORS.withOpacity(COLORS.error, 0.05),
    },
    currencySymbol: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textSecondary,
        marginRight: SPACING.sm,
    },
    errorText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.error,
        marginTop: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    amountInfo: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    sectionSubtitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
        lineHeight: TYPOGRAPHY.fontSizes.sm * 1.4,
    },
    gatewaysContainer: {
        gap: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    gatewayCard: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 2,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
        position: 'relative',
    },
    gatewayCardSelected: {
        borderWidth: 2,
        ...SHADOWS.base,
    },
    selectionIndicator: {
        position: 'absolute',
        top: SPACING.sm,
        right: SPACING.sm,
        zIndex: 1,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.border,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        borderColor: 'transparent',
    },
    gatewayHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    gatewayLogoContainer: {
        marginRight: SPACING.base,
    },
    gatewayLogo: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.base,
        backgroundColor: COLORS.backgroundSecondary,
    },
    gatewayInfo: {
        flex: 1,
        paddingRight: SPACING.lg,
    },
    gatewayTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.xs,
    },
    gatewayName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
    },
    badgesRow: {
        flexDirection: 'row',
        gap: SPACING.xs,
    },
    processingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    processingText: {
        fontSize: TYPOGRAPHY.fontSizes.xs - 1,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        marginLeft: 2,
    },
    feesBadge: {
        backgroundColor: COLORS.success + '15',
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    feesText: {
        fontSize: TYPOGRAPHY.fontSizes.xs - 1,
        color: COLORS.success,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    gatewayDescription: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
        lineHeight: TYPOGRAPHY.fontSizes.sm * 1.2,
    },
    gatewayFeatures: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
    },
    featureTag: {
        backgroundColor: COLORS.backgroundSecondary,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.xs,
        borderWidth: 1,
    },
    featureText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    trustIndicators: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    trustText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
        marginLeft: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    previewCard: {
        margin: SPACING.xl,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    previewTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    previewRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    previewLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
    },
    previewValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    previewTotal: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        marginTop: SPACING.sm,
    },
    previewTotalLabel: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    previewTotalValue: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.success,
    },
    securityCard: {
        marginHorizontal: SPACING.xl,
        backgroundColor: COLORS.success + '08',
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.success + '20',
    },
    securityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.base,
    },
    securityTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.success,
        marginLeft: SPACING.sm,
    },
    securityFeatures: {
        gap: SPACING.sm,
    },
    securityFeature: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    securityText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginLeft: SPACING.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    fundButton: {
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
    fundButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    fundButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});