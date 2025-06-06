// app/bills/electricity.tsx
import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Text, Input, FormControl } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
    useGetServicesByCategoryQuery,
    useVerifyCustomerMutation,
    usePayBillMutation,
    useGetWalletBalanceQuery
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

const ElectricitySchema = Yup.object().shape({
    meterNumber: Yup.string()
        .min(8, 'Meter number must be at least 8 characters')
        .required('Meter number is required'),
    amount: Yup.number()
        .min(500, 'Minimum amount is ₦500')
        .max(500000, 'Maximum amount is ₦500,000')
        .required('Amount is required'),
    phone: Yup.string()
        .matches(/^[0-9]{11}$/, 'Phone number must be 11 digits')
        .required('Phone number is required'),
});

const quickAmounts = [1000, 2000, 5000, 10000, 15000, 20000];
const meterTypes = [
    { value: 'prepaid', label: 'Prepaid' },
    { value: 'postpaid', label: 'Postpaid' },
];

interface ElectricityProvider {
    serviceID: string;
    name: string;
    image: string;
    [key: string]: any;
}

interface CustomerInfo {
    Customer_Name: string;
    CustomerAddress: string;
    Customer_Type: string;
    [key: string]: any;
}

interface MeterType {
    value: string;
    label: string;
}

export default function ElectricityScreen() {
    const router = useRouter();
    const [selectedProvider, setSelectedProvider] = useState<ElectricityProvider | null>(null);
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [selectedMeterType, setSelectedMeterType] = useState<string>('prepaid');
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);

    const { data: electricityServices } = useGetServicesByCategoryQuery('electricity-bill');
    const { data: walletData } = useGetWalletBalanceQuery();
    const [verifyCustomer] = useVerifyCustomerMutation();
    const [payBill, { isLoading }] = usePayBillMutation();

    const providers = electricityServices?.content || [];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const handleVerifyCustomer = async (meterNumber: string) => {
        if (!selectedProvider || !meterNumber) return;

        setIsVerifying(true);
        try {
            const result = await verifyCustomer({
                serviceID: selectedProvider.serviceID,
                billersCode: meterNumber,
                type: selectedMeterType,
            }).unwrap();

            setCustomerInfo(result.content);
            Alert.alert('Customer Verified', `Customer: ${result.content.Customer_Name}`);
        } catch (error: any) {
            Alert.alert('Verification Failed', error.message || 'Unable to verify customer details');
            setCustomerInfo(null);
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePayment = async (values: any) => {
        if (!selectedProvider) {
            Alert.alert('Error', 'Please select an electricity provider');
            return;
        }

        if (!customerInfo) {
            Alert.alert('Error', 'Please verify meter number first');
            return;
        }

        if (walletData && values.amount > walletData.data.balance) {
            Alert.alert('Insufficient Balance', 'Please fund your wallet to continue');
            return;
        }

        try {
            const result = await payBill({
                serviceID: selectedProvider.serviceID,
                billersCode: values.meterNumber,
                variation_code: selectedMeterType,
                amount: values.amount,
                phone: `+234${values.phone.substring(1)}`,
            }).unwrap();

            Alert.alert(
                'Payment Successful!',
                `₦${values.amount} has been credited to meter ${values.meterNumber}`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            Alert.alert(
                'Payment Failed',
                error.message || 'Something went wrong. Please try again.'
            );
        }
    };

    const renderProvider = (provider: ElectricityProvider) => (
        <TouchableOpacity
            key={provider.serviceID}
            style={[
                styles.providerCard,
                selectedProvider?.serviceID === provider.serviceID && styles.providerCardSelected
            ]}
            onPress={() => {
                setSelectedProvider(provider);
                setCustomerInfo(null); // Reset customer info when provider changes
            }}
        >
            <Image
                source={{ uri: provider.image }}
                style={styles.providerImage}
                resizeMode="contain"
            />
            <Text style={styles.providerName}>
                {provider.name.replace(' Electric', '').replace(' - ', '\n')}
            </Text>
            {selectedProvider?.serviceID === provider.serviceID && (
                <View style={styles.selectedBadge}>
                    <MaterialIcons name="check" size={16} color={COLORS.textInverse} />
                </View>
            )}
        </TouchableOpacity>
    );

    const renderMeterType = (type: MeterType) => (
        <TouchableOpacity
            key={type.value}
            style={[
                styles.meterTypeCard,
                selectedMeterType === type.value && styles.meterTypeCardSelected
            ]}
            onPress={() => {
                setSelectedMeterType(type.value);
                setCustomerInfo(null); // Reset customer info when meter type changes
            }}
        >
            <Text style={[
                styles.meterTypeText,
                selectedMeterType === type.value && styles.meterTypeTextSelected
            ]}>
                {type.label}
            </Text>
        </TouchableOpacity>
    );

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
                    <Text style={styles.headerTitle}>Pay Electricity</Text>
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
                        meterNumber: '',
                        amount: selectedAmount || '',
                        phone: ''
                    }}
                    validationSchema={ElectricitySchema}
                    onSubmit={handlePayment}
                    enableReinitialize
                >
                    {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
                        <>
                            {/* Provider Selection */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Select Electricity Provider</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.providersGrid}>
                                        {providers.slice(0, 8).map(renderProvider)}
                                    </View>
                                </ScrollView>
                            </View>

                            {/* Meter Type */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Meter Type</Text>
                                <View style={styles.meterTypesGrid}>
                                    {meterTypes.map(renderMeterType)}
                                </View>
                            </View>

                            {/* Meter Number */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Meter Number</Text>
                                <FormControl isInvalid={touched.meterNumber && errors.meterNumber}>
                                    <View style={[
                                        styles.inputContainer,
                                        touched.meterNumber && errors.meterNumber && styles.inputContainerError
                                    ]}>
                                        <MaterialIcons
                                            name="electric-meter"
                                            size={20}
                                            color={COLORS.textTertiary}
                                            style={styles.inputIcon}
                                        />
                                        <Input
                                            flex={1}
                                            variant="unstyled"
                                            placeholder="Enter meter number"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.meterNumber}
                                            onChangeText={(text) => {
                                                handleChange('meterNumber')(text);
                                                setCustomerInfo(null); // Reset customer info when meter number changes
                                            }}
                                            onBlur={handleBlur('meterNumber')}
                                            fontSize={TYPOGRAPHY.fontSizes.base}
                                            color={COLORS.textPrimary}
                                            _focus={{ borderWidth: 0 }}
                                        />
                                        <TouchableOpacity
                                            style={styles.verifyButton}
                                            onPress={() => handleVerifyCustomer(values.meterNumber)}
                                            disabled={!selectedProvider || !values.meterNumber || isVerifying}
                                        >
                                            {isVerifying ? (
                                                <ActivityIndicator size="small" color={COLORS.primary} />
                                            ) : (
                                                <Text style={styles.verifyButtonText}>Verify</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                    {touched.meterNumber && errors.meterNumber && (
                                        <Text style={styles.errorText}>{errors.meterNumber}</Text>
                                    )}
                                </FormControl>
                            </View>

                            {/* Customer Info */}
                            {customerInfo && (
                                <View style={styles.customerInfoCard}>
                                    <Text style={styles.customerInfoTitle}>Customer Information</Text>
                                    <View style={styles.customerInfoRow}>
                                        <Text style={styles.customerInfoLabel}>Name:</Text>
                                        <Text style={styles.customerInfoValue}>{customerInfo.Customer_Name}</Text>
                                    </View>
                                    <View style={styles.customerInfoRow}>
                                        <Text style={styles.customerInfoLabel}>Address:</Text>
                                        <Text style={styles.customerInfoValue}>{customerInfo.CustomerAddress}</Text>
                                    </View>
                                    <View style={styles.customerInfoRow}>
                                        <Text style={styles.customerInfoLabel}>Type:</Text>
                                        <Text style={styles.customerInfoValue}>{customerInfo.Customer_Type}</Text>
                                    </View>
                                </View>
                            )}

                            {/* Phone Number */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Phone Number</Text>
                                <FormControl isInvalid={touched.phone && errors.phone}>
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
                                        <Input
                                            flex={1}
                                            variant="unstyled"
                                            placeholder="08012345678"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.phone}
                                            onChangeText={handleChange('phone')}
                                            onBlur={handleBlur('phone')}
                                            keyboardType="phone-pad"
                                            maxLength={11}
                                            fontSize={TYPOGRAPHY.fontSizes.base}
                                            color={COLORS.textPrimary}
                                            _focus={{ borderWidth: 0 }}
                                        />
                                    </View>
                                    {touched.phone && errors.phone && (
                                        <Text style={styles.errorText}>{errors.phone}</Text>
                                    )}
                                </FormControl>
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
                                            fontSize={TYPOGRAPHY.fontSizes.base}
                                            color={COLORS.textPrimary}
                                            _focus={{ borderWidth: 0 }}
                                        />
                                    </View>
                                    {touched.amount && errors.amount && (
                                        <Text style={styles.errorText}>{errors.amount}</Text>
                                    )}
                                </FormControl>
                            </View>

                            {/* Payment Summary */}
                            {selectedProvider && customerInfo && values.amount && values.phone && (
                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryTitle}>Payment Summary</Text>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Provider:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedProvider.name.replace(' Electric', '')}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Customer:</Text>
                                        <Text style={styles.summaryValue}>{customerInfo.Customer_Name}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Meter:</Text>
                                        <Text style={styles.summaryValue}>{values.meterNumber}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Type:</Text>
                                        <Text style={styles.summaryValue}>{selectedMeterType}</Text>
                                    </View>
                                    <View style={[styles.summaryRow, styles.summaryTotal]}>
                                        <Text style={styles.summaryTotalLabel}>Total:</Text>
                                        <Text style={styles.summaryTotalValue}>
                                            {formatCurrency(Number(values.amount))}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Payment Button */}
                            <TouchableOpacity
                                style={[
                                    styles.paymentButton,
                                    (!selectedProvider || !customerInfo || !values.amount || !values.phone || isLoading) && styles.paymentButtonDisabled
                                ]}
                                onPress={() => {
                                    if (selectedAmount && selectedAmount !== values.amount) {
                                        setFieldValue('amount', selectedAmount);
                                    }
                                    handleSubmit();
                                }}
                                disabled={!selectedProvider || !customerInfo || !values.amount || !values.phone || isLoading}
                            >
                                {isLoading ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color={COLORS.textInverse} />
                                        <Text style={styles.paymentButtonText}>Processing...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.paymentButtonText}>
                                        Pay Bill - {values.amount ? formatCurrency(Number(values.amount)) : '₦0'}
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
    providersGrid: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.base,
    },
    providerCard: {
        width: 120,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.border,
        marginRight: SPACING.base,
        position: 'relative',
        ...SHADOWS.sm,
    },
    providerCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    providerImage: {
        width: 50,
        height: 50,
        marginBottom: SPACING.sm,
    },
    providerName: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: TYPOGRAPHY.fontSizes.xs * 1.2,
    },
    selectedBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.full,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    meterTypesGrid: {
        flexDirection: 'row',
        gap: SPACING.base,
    },
    meterTypeCard: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    meterTypeCardSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    meterTypeText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
    },
    meterTypeTextSelected: {
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
    verifyButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.base,
        minWidth: 60,
        alignItems: 'center',
    },
    verifyButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    customerInfoCard: {
        margin: SPACING.xl,
        backgroundColor: COLORS.success + '10',
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.success + '40',
    },
    customerInfoTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.success + 'CC',
        marginBottom: SPACING.base,
    },
    customerInfoRow: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
    },
    customerInfoLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        width: 80,
    },
    customerInfoValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        flex: 1,
    },
    currencySymbol: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
        marginRight: SPACING.sm,
    },
    errorText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.error,
        marginTop: SPACING.xs,
        marginLeft: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
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
    summaryCard: {
        margin: SPACING.xl,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    summaryTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    summaryLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
    },
    summaryValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'right',
    },
    summaryTotal: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        marginTop: SPACING.sm,
    },
    summaryTotalLabel: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    summaryTotalValue: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
    },
    paymentButton: {
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
    paymentButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    paymentButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});