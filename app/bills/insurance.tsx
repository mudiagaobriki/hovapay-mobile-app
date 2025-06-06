// app/bills/insurance.tsx
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
    useGetServiceVariationsQuery,
    useVerifyCustomerMutation,
    usePayBillMutation,
    useGetWalletBalanceQuery
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

const InsuranceSchema = Yup.object().shape({
    policyNumber: Yup.string()
        .min(8, 'Policy number must be at least 8 characters')
        .required('Policy number is required'),
    amount: Yup.number()
        .min(1000, 'Minimum amount is ₦1,000')
        .max(1000000, 'Maximum amount is ₦1,000,000')
        .required('Amount is required'),
    phone: Yup.string()
        .matches(/^[0-9]{11}$/, 'Phone number must be 11 digits')
        .required('Phone number is required'),
    customerName: Yup.string()
        .min(2, 'Customer name must be at least 2 characters')
        .required('Customer name is required'),
});

const quickAmounts = [5000, 10000, 25000, 50000, 100000, 200000];

const insuranceTypes = [
    { value: 'life', label: 'Life Insurance' },
    { value: 'health', label: 'Health Insurance' },
    { value: 'auto', label: 'Auto Insurance' },
    { value: 'property', label: 'Property Insurance' },
    { value: 'business', label: 'Business Insurance' },
    { value: 'travel', label: 'Travel Insurance' },
];

export default function InsuranceScreen() {
    const router = useRouter();
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [selectedAmount, setSelectedAmount] = useState(null);
    const [selectedInsuranceType, setSelectedInsuranceType] = useState('life');
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [customerInfo, setCustomerInfo] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const { data: insuranceServices } = useGetServicesByCategoryQuery('insurance');
    const { data: walletData } = useGetWalletBalanceQuery();
    const { data: variations, isLoading: variationsLoading } = useGetServiceVariationsQuery(
        selectedProvider?.serviceID,
        { skip: !selectedProvider }
    );
    const [verifyCustomer] = useVerifyCustomerMutation();
    const [payBill, { isLoading }] = usePayBillMutation();

    const providers = insuranceServices?.content || [];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const handleVerifyCustomer = async (policyNumber: string) => {
        if (!selectedProvider || !policyNumber) return;

        setIsVerifying(true);
        try {
            const result = await verifyCustomer({
                serviceID: selectedProvider.serviceID,
                billersCode: policyNumber,
                type: selectedInsuranceType,
            }).unwrap();

            setCustomerInfo(result.content);
            Alert.alert('Policy Verified', `Policy Holder: ${result.content.Customer_Name}`);
        } catch (error: any) {
            Alert.alert('Verification Failed', error.message || 'Unable to verify policy details');
            setCustomerInfo(null);
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePayment = async (values: any) => {
        if (!selectedProvider) {
            Alert.alert('Error', 'Please select an insurance provider');
            return;
        }

        if (walletData && values.amount > walletData.balance) {
            Alert.alert('Insufficient Balance', 'Please fund your wallet to continue');
            return;
        }

        try {
            const result = await payBill({
                serviceID: selectedProvider.serviceID,
                billersCode: values.policyNumber,
                variation_code: selectedPlan?.variation_code || selectedInsuranceType,
                amount: values.amount,
                phone: `+234${values.phone.substring(1)}`,
            }).unwrap();

            Alert.alert(
                'Payment Successful!',
                `₦${values.amount} has been paid for policy ${values.policyNumber}`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            Alert.alert(
                'Payment Failed',
                error.message || 'Something went wrong. Please try again.'
            );
        }
    };

    const renderProvider = (provider: any) => (
        <TouchableOpacity
            key={provider.serviceID}
            style={[
                styles.providerCard,
                selectedProvider?.serviceID === provider.serviceID && styles.providerCardSelected
            ]}
            onPress={() => {
                setSelectedProvider(provider);
                setCustomerInfo(null);
                setSelectedPlan(null);
            }}
        >
            <Image
                source={{ uri: provider.image }}
                style={styles.providerImage}
                resizeMode="contain"
            />
            <Text style={styles.providerName}>
                {provider.name.replace(' Insurance', '').replace(' - ', '\n')}
            </Text>
            {selectedProvider?.serviceID === provider.serviceID && (
                <View style={styles.selectedBadge}>
                    <MaterialIcons name="check" size={16} color={COLORS.textInverse} />
                </View>
            )}
        </TouchableOpacity>
    );

    const renderInsuranceType = (type: any) => (
        <TouchableOpacity
            key={type.value}
            style={[
                styles.typeCard,
                selectedInsuranceType === type.value && styles.typeCardSelected
            ]}
            onPress={() => {
                setSelectedInsuranceType(type.value);
                setCustomerInfo(null);
                setSelectedPlan(null);
            }}
        >
            <Text style={[
                styles.typeText,
                selectedInsuranceType === type.value && styles.typeTextSelected
            ]}>
                {type.label}
            </Text>
        </TouchableOpacity>
    );

    const renderInsurancePlan = (plan: any) => (
        <TouchableOpacity
            key={plan.variation_code}
            style={[
                styles.planCard,
                selectedPlan?.variation_code === plan.variation_code && styles.planCardSelected
            ]}
            onPress={() => setSelectedPlan(plan)}
        >
            <View style={styles.planContent}>
                <View style={styles.planInfo}>
                    <Text style={[
                        styles.planName,
                        selectedPlan?.variation_code === plan.variation_code && styles.planNameSelected
                    ]}>
                        {plan.name}
                    </Text>
                    <Text style={styles.planPrice}>
                        {formatCurrency(plan.variation_amount)}
                    </Text>
                </View>
                {selectedPlan?.variation_code === plan.variation_code && (
                    <MaterialIcons name="check-circle" size={24} color={COLORS.primary} />
                )}
            </View>
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
                    <Text style={styles.headerTitle}>Pay Insurance</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Wallet Balance</Text>
                    <Text style={styles.balanceAmount}>
                        {walletData ? formatCurrency(walletData.balance) : '₦0.00'}
                    </Text>
                </View>
            </LinearGradient>

            {/* Main Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Formik
                    initialValues={{
                        policyNumber: '',
                        amount: selectedAmount || '',
                        phone: '',
                        customerName: ''
                    }}
                    validationSchema={InsuranceSchema}
                    onSubmit={handlePayment}
                    enableReinitialize
                >
                    {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
                        <>
                            {/* Provider Selection */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Select Insurance Provider</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.providersGrid}>
                                        {providers.slice(0, 8).map(renderProvider)}
                                    </View>
                                </ScrollView>
                            </View>

                            {/* Insurance Type */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Insurance Type</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    <View style={styles.typesGrid}>
                                        {insuranceTypes.map(renderInsuranceType)}
                                    </View>
                                </ScrollView>
                            </View>

                            {/* Insurance Plans (if available) */}
                            {selectedProvider && variations?.content?.variations?.length > 0 && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Select Plan</Text>
                                    {variationsLoading ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="large" color={COLORS.primary} />
                                            <Text style={styles.loadingText}>Loading plans...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.plansContainer}>
                                            {variations.content.variations.map(renderInsurancePlan)}
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Customer Name */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Policy Holder Name</Text>
                                <FormControl isInvalid={touched.customerName && errors.customerName}>
                                    <View style={[
                                        styles.inputContainer,
                                        touched.customerName && errors.customerName && styles.inputContainerError
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
                                            placeholder="Enter policy holder name"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.customerName}
                                            onChangeText={handleChange('customerName')}
                                            onBlur={handleBlur('customerName')}
                                            fontSize={TYPOGRAPHY.fontSizes.base}
                                            color={COLORS.textPrimary}
                                            _focus={{ borderWidth: 0 }}
                                        />
                                    </View>
                                    {touched.customerName && errors.customerName && (
                                        <Text style={styles.errorText}>{errors.customerName}</Text>
                                    )}
                                </FormControl>
                            </View>

                            {/* Policy Number */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Policy Number</Text>
                                <FormControl isInvalid={touched.policyNumber && errors.policyNumber}>
                                    <View style={[
                                        styles.inputContainer,
                                        touched.policyNumber && errors.policyNumber && styles.inputContainerError
                                    ]}>
                                        <MaterialIcons
                                            name="security"
                                            size={20}
                                            color={COLORS.textTertiary}
                                            style={styles.inputIcon}
                                        />
                                        <Input
                                            flex={1}
                                            variant="unstyled"
                                            placeholder="Enter policy number"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.policyNumber}
                                            onChangeText={(text) => {
                                                handleChange('policyNumber')(text);
                                                setCustomerInfo(null);
                                            }}
                                            onBlur={handleBlur('policyNumber')}
                                            fontSize={TYPOGRAPHY.fontSizes.base}
                                            color={COLORS.textPrimary}
                                            _focus={{ borderWidth: 0 }}
                                        />
                                        <TouchableOpacity
                                            style={styles.verifyButton}
                                            onPress={() => handleVerifyCustomer(values.policyNumber)}
                                            disabled={!selectedProvider || !values.policyNumber || isVerifying}
                                        >
                                            {isVerifying ? (
                                                <ActivityIndicator size="small" color={COLORS.primary} />
                                            ) : (
                                                <Text style={styles.verifyButtonText}>Verify</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                    {touched.policyNumber && errors.policyNumber && (
                                        <Text style={styles.errorText}>{errors.policyNumber}</Text>
                                    )}
                                </FormControl>
                            </View>

                            {/* Customer Info */}
                            {customerInfo && (
                                <View style={styles.customerInfoCard}>
                                    <Text style={styles.customerInfoTitle}>Policy Information</Text>
                                    <View style={styles.customerInfoRow}>
                                        <Text style={styles.customerInfoLabel}>Policy Holder:</Text>
                                        <Text style={styles.customerInfoValue}>{customerInfo.Customer_Name}</Text>
                                    </View>
                                    <View style={styles.customerInfoRow}>
                                        <Text style={styles.customerInfoLabel}>Policy Number:</Text>
                                        <Text style={styles.customerInfoValue}>{customerInfo.CustomerNumber}</Text>
                                    </View>
                                    <View style={styles.customerInfoRow}>
                                        <Text style={styles.customerInfoLabel}>Status:</Text>
                                        <Text style={styles.customerInfoValue}>{customerInfo.Status}</Text>
                                    </View>
                                    {customerInfo.DueDate && (
                                        <View style={styles.customerInfoRow}>
                                            <Text style={styles.customerInfoLabel}>Due Date:</Text>
                                            <Text style={styles.customerInfoValue}>{customerInfo.DueDate}</Text>
                                        </View>
                                    )}
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
                            {!selectedPlan && (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Quick Amount</Text>
                                    <View style={styles.amountsGrid}>
                                        {quickAmounts.map(renderQuickAmount)}
                                    </View>
                                </View>
                            )}

                            {/* Custom Amount */}
                            {!selectedPlan && (
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
                            )}

                            {/* Payment Summary */}
                            {selectedProvider && values.customerName && values.policyNumber && (values.amount || selectedPlan) && values.phone && (
                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryTitle}>Payment Summary</Text>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Provider:</Text>
                                        <Text style={styles.summaryValue}>
                                            {selectedProvider.name.replace(' Insurance', '')}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Policy Holder:</Text>
                                        <Text style={styles.summaryValue}>{values.customerName}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Policy Number:</Text>
                                        <Text style={styles.summaryValue}>{values.policyNumber}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Insurance Type:</Text>
                                        <Text style={styles.summaryValue}>
                                            {insuranceTypes.find(t => t.value === selectedInsuranceType)?.label}
                                        </Text>
                                    </View>
                                    {selectedPlan && (
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Plan:</Text>
                                            <Text style={styles.summaryValue}>{selectedPlan.name}</Text>
                                        </View>
                                    )}
                                    <View style={[styles.summaryRow, styles.summaryTotal]}>
                                        <Text style={styles.summaryTotalLabel}>Total:</Text>
                                        <Text style={styles.summaryTotalValue}>
                                            {formatCurrency(
                                                selectedPlan ? selectedPlan.variation_amount : Number(values.amount)
                                            )}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Payment Button */}
                            <TouchableOpacity
                                style={[
                                    styles.paymentButton,
                                    (!selectedProvider || !values.customerName || !values.policyNumber || (!values.amount && !selectedPlan) || !values.phone || isLoading) && styles.paymentButtonDisabled
                                ]}
                                onPress={() => {
                                    if (selectedAmount && selectedAmount !== values.amount && !selectedPlan) {
                                        setFieldValue('amount', selectedAmount);
                                    }
                                    if (selectedPlan) {
                                        setFieldValue('amount', selectedPlan.variation_amount);
                                    }
                                    handleSubmit();
                                }}
                                disabled={!selectedProvider || !values.customerName || !values.policyNumber || (!values.amount && !selectedPlan) || !values.phone || isLoading}
                            >
                                {isLoading ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color={COLORS.textInverse} />
                                        <Text style={styles.paymentButtonText}>Processing...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.paymentButtonText}>
                                        Pay Premium - {selectedPlan
                                        ? formatCurrency(selectedPlan.variation_amount)
                                        : values.amount
                                            ? formatCurrency(Number(values.amount))
                                            : '₦0'
                                    }
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
    typesGrid: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.base,
    },
    typeCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: SPACING.base,
        minWidth: 100,
    },
    typeCardSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    typeText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    typeTextSelected: {
        color: COLORS.textInverse,
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    loadingText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.base,
    },
    plansContainer: {
        gap: SPACING.base,
    },
    planCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    planCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    planContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    planNameSelected: {
        color: COLORS.primary,
    },
    planPrice: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
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
        width: 100,
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
});