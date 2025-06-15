// app/bills/insurance.tsx - Fixed with Pure React Native Components
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
    TextInput,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik, FormikProps } from 'formik';
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

interface InsuranceProvider {
    serviceID: string;
    name: string;
    image: string;
    [key: string]: any;
}

interface InsurancePlan {
    variation_code: string;
    name: string;
    variation_amount: number;
    [key: string]: any;
}

interface CustomerInfo {
    Customer_Name: string;
    CustomerNumber?: string;
    Status?: string;
    DueDate?: string;
    _verified?: boolean;
    [key: string]: any;
}

interface FormValues {
    policyNumber: string;
    amount: string;
    phone: string;
    customerName: string;
}

export default function InsuranceScreen() {
    const router = useRouter();
    const [selectedProvider, setSelectedProvider] = useState<InsuranceProvider | null>(null);
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [selectedInsuranceType, setSelectedInsuranceType] = useState('life');
    const [selectedPlan, setSelectedPlan] = useState<InsurancePlan | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const { data: insuranceServices } = useGetServicesByCategoryQuery('insurance');
    const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
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

    // Enhanced customer verification with better error handling
    const handleVerifyCustomer = async (policyNumber: string, formik: FormikProps<FormValues>) => {
        if (!selectedProvider || !policyNumber) return;

        setIsVerifying(true);
        try {
            const result = await verifyCustomer({
                serviceID: selectedProvider.serviceID,
                billersCode: policyNumber,
                type: selectedInsuranceType,
            }).unwrap();

            console.log('Policy verification result:', result);

            // Check for verification success
            if (result.content && result.content.Customer_Name) {
                setCustomerInfo({
                    ...result.content,
                    _verified: true
                });
                Alert.alert(
                    'Policy Verified!',
                    `Policy Holder: ${result.content.Customer_Name}${result.content.Status ? `\nStatus: ${result.content.Status}` : ''}`,
                    [{ text: 'Continue', style: 'default' }]
                );
            } else {
                throw new Error('Policy details not found');
            }
        } catch (error: any) {
            console.error('Policy verification failed:', error);

            let errorMessage = 'Unable to verify policy details.';

            if (error.message) {
                errorMessage = error.message;
            } else if (error.data?.message) {
                errorMessage = error.data.message;
            } else if (error.data?.response_description) {
                errorMessage = error.data.response_description;
            }

            // Enhanced error handling for insurance verification
            const isTestingError = errorMessage.toLowerCase().includes('invalid') ||
                errorMessage.toLowerCase().includes('not found') ||
                errorMessage.toLowerCase().includes('may be invalid');

            if (isTestingError) {
                Alert.alert(
                    'Policy Verification Failed',
                    `${errorMessage}\n\nThis often happens in sandbox mode with real policy numbers. Would you like to:`,
                    [
                        {
                            text: 'Try Different Number',
                            style: 'default',
                            onPress: () => {
                                formik.setFieldValue('policyNumber', '');
                                setCustomerInfo(null);
                            }
                        },
                        {
                            text: 'Use Test Data',
                            style: 'destructive',
                            onPress: () => {
                                Alert.alert(
                                    'Test Policy Numbers',
                                    `Try these test numbers for ${selectedProvider.name}:\n\n` +
                                    `• INS1234567890\n` +
                                    `• POL123456789\n` +
                                    `• TEST987654321\n` +
                                    `• 1234567890\n\n` +
                                    `These are commonly used test numbers in VTPass sandbox.`,
                                    [{ text: 'OK', style: 'default' }]
                                );
                            }
                        },
                        {
                            text: 'Continue Anyway',
                            style: 'cancel',
                            onPress: () => {
                                const fallbackCustomerInfo = {
                                    Customer_Name: formik.values.customerName || 'Test Policy Holder',
                                    CustomerNumber: policyNumber,
                                    Status: 'Active',
                                    _verified: false
                                };
                                setCustomerInfo(fallbackCustomerInfo);
                            }
                        }
                    ]
                );
            } else {
                Alert.alert(
                    'Verification Error',
                    errorMessage,
                    [
                        {
                            text: 'Try Again',
                            style: 'default',
                            onPress: () => {
                                formik.setFieldValue('policyNumber', '');
                                setCustomerInfo(null);
                            }
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel'
                        }
                    ]
                );
            }
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePayment = async (values: FormValues) => {
        if (!selectedProvider) {
            Alert.alert('Error', 'Please select an insurance provider');
            return;
        }

        const amount = selectedPlan ? selectedPlan.variation_amount : Number(values.amount);

        // Check wallet balance
        if (walletData && amount > walletData?.data?.balance) {
            const shortfall = amount - walletData.data.balance;
            Alert.alert(
                'Insufficient Balance',
                `You need ${formatCurrency(shortfall)} more to complete this transaction.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Fund Wallet',
                        onPress: () => router.push('/(tabs)/wallet'),
                        style: 'default'
                    }
                ]
            );
            return;
        }

        try {
            // Prepare the payload according to VTPass insurance API specification
            const payload = {
                request_id: `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                serviceID: selectedProvider.serviceID,
                billersCode: values.policyNumber,
                variation_code: selectedPlan?.variation_code || selectedInsuranceType,
                amount: amount,
                phone: values.phone,
            };

            console.log('Sending insurance payment request:', payload);

            const result = await payBill(payload).unwrap();

            console.log('Insurance payment result:', result);

            // Check the actual success status from the response
            const isActuallySuccessful = result.success === true;

            console.log('Transaction status check:', {
                resultSuccess: result.success,
                resultMessage: result.message,
                resultData: result.data,
                isActuallySuccessful
            });

            // Refetch wallet balance to update UI
            refetchWallet();

            if (isActuallySuccessful) {
                // Success
                Alert.alert(
                    'Payment Successful!',
                    `₦${amount} has been paid for policy ${values.policyNumber}${values.customerName ? ` for ${values.customerName}` : ''}`,
                    [
                        {
                            text: 'View Receipt',
                            onPress: () => {
                                router.push({
                                    pathname: '/bills/receipt',
                                    params: {
                                        transactionRef: result.data?.transactionRef || payload.request_id,
                                        type: 'insurance',
                                        network: selectedProvider.name,
                                        billersCode: values.policyNumber,
                                        amount: amount.toString(),
                                        status: 'successful',
                                        serviceName: selectedPlan?.name || `${selectedInsuranceType} Insurance`,
                                        phone: values.phone
                                    }
                                });
                            }
                        },
                        {
                            text: 'Done',
                            onPress: () => router.back(),
                            style: 'default'
                        }
                    ]
                );
            } else {
                // Transaction failed
                const errorMessage = result.message || result.data?.vtpassResponse?.message || 'Transaction failed. Please try again.';

                Alert.alert(
                    'Transaction Failed',
                    errorMessage,
                    [
                        {
                            text: 'View Details',
                            onPress: () => {
                                router.push({
                                    pathname: '/bills/receipt',
                                    params: {
                                        transactionRef: result.data?.transactionRef || payload.request_id,
                                        type: 'insurance',
                                        network: selectedProvider.name,
                                        billersCode: values.policyNumber,
                                        amount: amount.toString(),
                                        status: 'failed',
                                        errorMessage: errorMessage,
                                        serviceName: selectedPlan?.name || `${selectedInsuranceType} Insurance`,
                                        phone: values.phone
                                    }
                                });
                            }
                        },
                        {
                            text: 'Try Again',
                            style: 'default'
                        }
                    ]
                );
            }
        } catch (error: any) {
            console.error('Insurance payment error:', error);

            let errorMessage = 'Something went wrong. Please try again.';

            if (error.data?.message) {
                errorMessage = error.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Payment Failed', errorMessage, [
                {
                    text: 'OK',
                    style: 'default'
                }
            ]);
        }
    };

    const renderProvider = (provider: InsuranceProvider) => (
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

    const renderInsurancePlan = (plan: InsurancePlan) => (
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

    const renderQuickAmount = (amount: number, setFieldValue: (field: string, value: any) => void) => (
        <TouchableOpacity
            key={amount}
            style={[
                styles.amountCard,
                selectedAmount === amount && styles.amountCardSelected
            ]}
            onPress={() => {
                setSelectedAmount(amount);
                setFieldValue('amount', amount.toString());
            }}
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
                        {walletData ? formatCurrency(walletData?.data?.balance) : '₦0.00'}
                    </Text>
                </View>
            </LinearGradient>

            {/* Main Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Formik
                    initialValues={{
                        policyNumber: '',
                        amount: '',
                        phone: '',
                        customerName: ''
                    }}
                    validationSchema={InsuranceSchema}
                    onSubmit={handlePayment}
                >
                    {(formik) => {
                        const { handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue } = formik;

                        return (
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
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Enter policy holder name"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.customerName}
                                            onChangeText={handleChange('customerName')}
                                            onBlur={handleBlur('customerName')}
                                            returnKeyType="next"
                                        />
                                    </View>
                                    {touched.customerName && errors.customerName && (
                                        <Text style={styles.errorText}>{errors.customerName}</Text>
                                    )}
                                </View>

                                {/* Policy Number */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Policy Number</Text>
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
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Enter policy number"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.policyNumber}
                                            onChangeText={(text) => {
                                                handleChange('policyNumber')(text);
                                                setCustomerInfo(null);
                                            }}
                                            onBlur={handleBlur('policyNumber')}
                                            returnKeyType="done"
                                        />
                                        <TouchableOpacity
                                            style={[
                                                styles.verifyButton,
                                                (!selectedProvider || !values.policyNumber || isVerifying) && styles.verifyButtonDisabled
                                            ]}
                                            onPress={() => handleVerifyCustomer(values.policyNumber, formik)}
                                            disabled={!selectedProvider || !values.policyNumber || isVerifying}
                                        >
                                            {isVerifying ? (
                                                <ActivityIndicator size="small" color={COLORS.textInverse} />
                                            ) : (
                                                <Text style={styles.verifyButtonText}>Verify</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                    {touched.policyNumber && errors.policyNumber && (
                                        <Text style={styles.errorText}>{errors.policyNumber}</Text>
                                    )}

                                    {/* Helpful hint for sandbox testing */}
                                    {selectedProvider && !customerInfo && (
                                        <View style={styles.hintCard}>
                                            <MaterialIcons name="info" size={16} color={COLORS.info} />
                                            <Text style={styles.hintText}>
                                                Testing in sandbox? Try: INS1234567890, POL123456789, or TEST987654321
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Customer Info */}
                                {customerInfo && (
                                    <View style={styles.customerInfoCard}>
                                        <View style={styles.customerInfoHeader}>
                                            <MaterialIcons
                                                name={customerInfo._verified ? "check-circle" : "info"}
                                                size={24}
                                                color={customerInfo._verified ? COLORS.success : COLORS.warning}
                                            />
                                            <Text style={styles.customerInfoTitle}>
                                                {customerInfo._verified ? 'Policy Verified' : 'Using Test Data'}
                                            </Text>
                                        </View>
                                        <View style={styles.customerInfoRow}>
                                            <Text style={styles.customerInfoLabel}>Policy Holder:</Text>
                                            <Text style={styles.customerInfoValue}>{customerInfo.Customer_Name}</Text>
                                        </View>
                                        {customerInfo.CustomerNumber && (
                                            <View style={styles.customerInfoRow}>
                                                <Text style={styles.customerInfoLabel}>Policy Number:</Text>
                                                <Text style={styles.customerInfoValue}>{customerInfo.CustomerNumber}</Text>
                                            </View>
                                        )}
                                        {customerInfo.Status && (
                                            <View style={styles.customerInfoRow}>
                                                <Text style={styles.customerInfoLabel}>Status:</Text>
                                                <Text style={styles.customerInfoValue}>{customerInfo.Status}</Text>
                                            </View>
                                        )}
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
                                            style={styles.textInput}
                                            placeholder="08012345678"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.phone}
                                            onChangeText={handleChange('phone')}
                                            onBlur={handleBlur('phone')}
                                            keyboardType="phone-pad"
                                            maxLength={11}
                                            returnKeyType="done"
                                        />
                                    </View>
                                    {touched.phone && errors.phone && (
                                        <Text style={styles.errorText}>{errors.phone}</Text>
                                    )}
                                </View>

                                {/* Quick Amounts */}
                                {!selectedPlan && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Quick Amount</Text>
                                        <View style={styles.amountsGrid}>
                                            {quickAmounts.map(amount => renderQuickAmount(amount, setFieldValue))}
                                        </View>
                                    </View>
                                )}

                                {/* Custom Amount */}
                                {!selectedPlan && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Or Enter Amount</Text>
                                        <View style={[
                                            styles.inputContainer,
                                            touched.amount && errors.amount && styles.inputContainerError
                                        ]}>
                                            <Text style={styles.currencySymbol}>₦</Text>
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="0"
                                                placeholderTextColor={COLORS.textTertiary}
                                                value={values.amount.toString()}
                                                onChangeText={(text) => {
                                                    setFieldValue('amount', text);
                                                    // Reset selected amount when typing custom amount
                                                    if (text && !quickAmounts.includes(Number(text))) {
                                                        setSelectedAmount(null);
                                                    }
                                                }}
                                                onBlur={handleBlur('amount')}
                                                keyboardType="numeric"
                                                returnKeyType="done"
                                            />
                                        </View>
                                        {touched.amount && errors.amount && (
                                            <Text style={styles.errorText}>{errors.amount}</Text>
                                        )}
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
                                            <Text style={styles.summaryValue} numberOfLines={2}>{values.customerName}</Text>
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
                                                <Text style={styles.summaryValue} numberOfLines={2}>{selectedPlan.name}</Text>
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
                                        if (selectedPlan) {
                                            setFieldValue('amount', selectedPlan.variation_amount.toString());
                                        }
                                        handleSubmit();
                                    }}
                                    disabled={!selectedProvider || !values.customerName || !values.policyNumber || (!values.amount && !selectedPlan) || !values.phone || isLoading}
                                >
                                    {isLoading ? (
                                        <View style={styles.loadingButtonContainer}>
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
                        );
                    }}
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
    loadingButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.base,
        textAlign: 'center',
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
    textInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: 0,
        textAlignVertical: 'center',
    },
    verifyButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.base,
        minWidth: 60,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    verifyButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    verifyButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    hintCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.info + '10',
        borderRadius: RADIUS.base,
        padding: SPACING.sm,
        marginTop: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.info + '30',
    },
    hintText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.info,
        marginLeft: SPACING.sm,
        flex: 1,
        fontStyle: 'italic',
    },
    customerInfoCard: {
        margin: SPACING.xl,
        backgroundColor: COLORS.success + '10',
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.success + '40',
        ...SHADOWS.sm,
    },
    customerInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.base,
    },
    customerInfoTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.success + 'CC',
        marginLeft: SPACING.sm,
    },
    customerInfoRow: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
        alignItems: 'flex-start',
    },
    customerInfoLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        width: 100,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
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
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    summaryLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        flex: 1,
    },
    summaryValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        flex: 2,
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
        marginLeft: SPACING.sm,
    },
});