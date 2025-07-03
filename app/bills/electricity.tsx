// app/bills/electricity.tsx - Fixed with Pure React Native Components
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

interface FormValues {
    meterNumber: string;
    amount: string;
    phone: string;
}

export default function ElectricityScreen() {
    const router = useRouter();
    const [selectedProvider, setSelectedProvider] = useState<ElectricityProvider | null>(null);
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [selectedMeterType, setSelectedMeterType] = useState<string>('prepaid');
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);

    const { data: electricityServices } = useGetServicesByCategoryQuery('electricity-bill');
    const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
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

    // Enhanced customer verification with better error handling
    const handleVerifyCustomer = async (meterNumber: string, formik: FormikProps<FormValues>) => {
        if (!selectedProvider || !meterNumber) return;

        setIsVerifying(true);
        try {
            const result = await verifyCustomer({
                serviceID: selectedProvider.serviceID,
                billersCode: meterNumber,
                type: selectedMeterType,
            }).unwrap();

            console.log('Customer verification result:', result);

            // Check for verification success
            if (result.content && result.content.Customer_Name) {
                setCustomerInfo(result.content);
                Alert.alert(
                    'Customer Verified!',
                    `Customer: ${result.content.Customer_Name}\nAddress: ${result.content.CustomerAddress || 'N/A'}`,
                    [{ text: 'Continue', style: 'default' }]
                );
            } else {
                throw new Error('Customer details not found');
            }
        } catch (error: any) {
            console.error('Customer verification failed:', error);

            let errorMessage = 'Unable to verify meter number.';

            if (error.message) {
                errorMessage = error.message;
            } else if (error.data?.message) {
                errorMessage = error.data.message;
            } else if (error.data?.response_description) {
                errorMessage = error.data.response_description;
            }

            // Enhanced error handling for electricity verification
            const isTestingError = errorMessage.toLowerCase().includes('invalid') ||
                errorMessage.toLowerCase().includes('not found') ||
                errorMessage.toLowerCase().includes('may be invalid');

            if (isTestingError) {
                Alert.alert(
                    'Meter Verification Failed',
                    `${errorMessage}\n\nThis often happens in sandbox mode with real meter numbers. Would you like to:`,
                    [
                        {
                            text: 'Try Different Number',
                            style: 'default',
                            onPress: () => {
                                formik.setFieldValue('meterNumber', '');
                                setCustomerInfo(null);
                            }
                        },
                        {
                            text: 'Use Test Data',
                            style: 'destructive',
                            onPress: () => {
                                Alert.alert(
                                    'Test Meter Numbers',
                                    `Try these test numbers for ${selectedProvider.name}:\n\n` +
                                    `• 1234567890\n` +
                                    `• 0123456789\n` +
                                    `• 8765432109\n` +
                                    `• 1111111111\n\n` +
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
                                    Customer_Name: `Test Customer`,
                                    CustomerAddress: 'Test Address, Lagos State',
                                    Customer_Type: selectedMeterType,
                                    _verified: false,
                                    _originalData: null
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
                                formik.setFieldValue('meterNumber', '');
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
            Alert.alert('Error', 'Please select an electricity provider');
            return;
        }

        if (!customerInfo) {
            Alert.alert('Error', 'Please verify meter number first');
            return;
        }

        const amount = Number(values.amount);

        // Check wallet balance
        if (walletData && amount > walletData.data.balance) {
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
            // Prepare the payload according to VTPass electricity API specification
            const payload = {
                request_id: `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                serviceID: selectedProvider.serviceID,
                billersCode: values.meterNumber,
                variation_code: selectedMeterType,
                amount: amount,
                phone: values.phone,
            };

            console.log('Sending electricity payment request:', payload);

            const result = await payBill(payload).unwrap();

            console.log('Electricity payment result:', result);

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
                    `₦${amount} has been credited to meter ${values.meterNumber} for ${customerInfo.Customer_Name}`,
                    [
                        {
                            text: 'View Receipt',
                            onPress: () => {
                                router.push({
                                    pathname: '/bills/receipt',
                                    params: {
                                        transactionRef: result.data?.transactionRef || payload.request_id,
                                        type: 'electricity',
                                        network: selectedProvider.name,
                                        billersCode: values.meterNumber,
                                        amount: amount.toString(),
                                        status: 'successful',
                                        serviceName: `${selectedProvider.name} - ${selectedMeterType}`,
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
                                        type: 'electricity',
                                        network: selectedProvider.name,
                                        billersCode: values.meterNumber,
                                        amount: amount.toString(),
                                        status: 'failed',
                                        errorMessage: errorMessage,
                                        serviceName: `${selectedProvider.name} - ${selectedMeterType}`,
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
            console.error('Electricity payment error:', error);

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
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                <Formik
                    initialValues={{
                        meterNumber: '',
                        amount: '',
                        phone: ''
                    }}
                    validationSchema={ElectricitySchema}
                    onSubmit={handlePayment}
                >
                    {(formik) => {
                        const { handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue } = formik;

                        return (
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
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Enter meter number"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.meterNumber}
                                            onChangeText={(text) => {
                                                handleChange('meterNumber')(text);
                                                setCustomerInfo(null); // Reset customer info when meter number changes
                                            }}
                                            onBlur={handleBlur('meterNumber')}
                                            keyboardType="numeric"
                                            returnKeyType="done"
                                        />
                                        <TouchableOpacity
                                            style={[
                                                styles.verifyButton,
                                                (!selectedProvider || !values.meterNumber || isVerifying) && styles.verifyButtonDisabled
                                            ]}
                                            onPress={() => handleVerifyCustomer(values.meterNumber, formik)}
                                            disabled={!selectedProvider || !values.meterNumber || isVerifying}
                                        >
                                            {isVerifying ? (
                                                <ActivityIndicator size="small" color={COLORS.textInverse} />
                                            ) : (
                                                <Text style={styles.verifyButtonText}>Verify</Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                    {touched.meterNumber && errors.meterNumber && (
                                        <Text style={styles.errorText}>{errors.meterNumber}</Text>
                                    )}

                                    {/* Helpful hint for sandbox testing */}
                                    {selectedProvider && !customerInfo && (
                                        <View style={styles.hintCard}>
                                            <MaterialIcons name="info" size={16} color={COLORS.info} />
                                            <Text style={styles.hintText}>
                                                Testing in sandbox? Try: 1234567890, 0123456789, or 8765432109
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Customer Info */}
                                {customerInfo && (
                                    <View style={styles.customerInfoCard}>
                                        <View style={styles.customerInfoHeader}>
                                            <MaterialIcons
                                                name={customerInfo._verified !== false ? "check-circle" : "info"}
                                                size={24}
                                                color={customerInfo._verified !== false ? COLORS.success : COLORS.warning}
                                            />
                                            <Text style={styles.customerInfoTitle}>
                                                {customerInfo._verified !== false ? 'Customer Verified' : 'Using Test Data'}
                                            </Text>
                                        </View>
                                        <View style={styles.customerInfoRow}>
                                            <Text style={styles.customerInfoLabel}>Name:</Text>
                                            <Text style={styles.customerInfoValue}>{customerInfo.Customer_Name}</Text>
                                        </View>
                                        <View style={styles.customerInfoRow}>
                                            <Text style={styles.customerInfoLabel}>Address:</Text>
                                            <Text style={styles.customerInfoValue}>{customerInfo.CustomerAddress || 'N/A'}</Text>
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
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Quick Amount</Text>
                                    <View style={styles.amountsGrid}>
                                        {quickAmounts.map(amount => renderQuickAmount(amount, setFieldValue))}
                                    </View>
                                </View>

                                {/* Custom Amount */}
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
                                    onPress={() => handleSubmit()}
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
        paddingTop: SPACING.sm,
    },
    section: {
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.xl,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    providersGrid: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.base,
    },
    providerCard: {
        width: 110,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        // borderWidth: 2,
        borderColor: COLORS.border,
        marginRight: SPACING.base,
        position: 'relative',
        // ...SHADOWS.sm,
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
        top: 0,
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
        width: 80,
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
        marginVertical: SPACING['2xl'],
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
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});