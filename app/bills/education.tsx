// app/bills/education.tsx - Fixed with Pure React Native Components
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
import * as LocalAuthentication from 'expo-local-authentication';
import {
    useGetUserProfileQuery,
    useVerifyTransactionPinMutation
} from '@/store/api/profileApi';
import { Modal } from 'react-native';

const { width } = Dimensions.get('window');

const EducationSchema = Yup.object().shape({
    studentId: Yup.string(),
        // .min(4, 'Student ID must be at least 4 characters')
        // .required('Student ID is required'),
    phone: Yup.string()
        .matches(/^[0-9]{11}$/, 'Phone number must be 11 digits')
        .required('Phone number is required'),
});

interface EducationService {
    serviceID: string;
    name: string;
    image: string;
    [key: string]: any;
}

interface EducationPackage {
    variation_code: string;
    name: string;
    variation_amount: number;
    [key: string]: any;
}

interface CustomerInfo {
    Customer_Name: string;
    Status?: string;
    _verified?: boolean;
    [key: string]: any;
}

interface FormValues {
    studentId: string;
    phone: string;
}

// Common education services with their categories
const educationCategories = [
    { id: 'exam-pins', name: 'Exam Pins', icon: 'school', color: '#8B5CF6' },
    { id: 'school-fees', name: 'School Fees', icon: 'account-balance', color: '#3B82F6' },
    { id: 'result-checker', name: 'Result Checker', icon: 'assessment', color: '#10B981' },
    { id: 'admission', name: 'Admission Forms', icon: 'person-add', color: '#F59E0B' },
];

export default function EducationScreen() {
    const router = useRouter();
    const [selectedProvider, setSelectedProvider] = useState<EducationService | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<EducationPackage | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [securityType, setSecurityType] = useState<'pin' | 'biometric' | null>(null);
    const [enteredPin, setEnteredPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pendingTransaction, setPendingTransaction] = useState<any>(null);


    const { data: educationServices } = useGetServicesByCategoryQuery('education');
    const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
    const { data: packages, isLoading: packagesLoading } = useGetServiceVariationsQuery(
        selectedProvider?.serviceID,
        { skip: !selectedProvider }
    );
    const [verifyCustomer] = useVerifyCustomerMutation();
    const [payBill, { isLoading }] = usePayBillMutation();

    const { data: userProfile } = useGetUserProfileQuery();
    const [verifyPin] = useVerifyTransactionPinMutation();

    const providers = educationServices?.content || [];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Filter providers by category
    const filterProvidersByCategory = (providers: EducationService[]) => {
        if (!selectedCategory) return providers;

        const categoryKeywords: { [key: string]: string[] } = {
            'exam-pins': ['waec', 'neco', 'nabteb', 'jamb', 'pin', 'scratch'],
            'school-fees': ['school', 'fees', 'tuition', 'university', 'polytechnic'],
            'result-checker': ['result', 'checker', 'verification'],
            'admission': ['admission', 'form', 'application'],
        };

        const keywords = categoryKeywords[selectedCategory] || [];
        return providers.filter(provider =>
            keywords.some(keyword =>
                provider.name.toLowerCase().includes(keyword) ||
                provider.serviceID.toLowerCase().includes(keyword)
            )
        );
    };

    // Filter packages based on search query
    const filterPackages = (packages: EducationPackage[]) => {
        if (!searchQuery.trim()) return packages;

        const query = searchQuery.toLowerCase();
        return packages.filter(pkg => {
            const nameMatch = pkg.name.toLowerCase().includes(query);
            const priceString = pkg.variation_amount.toString();
            const formattedPrice = formatCurrency(pkg.variation_amount).toLowerCase();
            const priceMatch = priceString.includes(query) || formattedPrice.includes(query);

            return nameMatch || priceMatch;
        });
    };

    // Enhanced customer verification with better error handling
    const handleVerifyCustomer = async (studentId: string, formik: FormikProps<FormValues>) => {
        if (!selectedProvider || !studentId) return;

        setIsVerifying(true);
        try {
            const result = await verifyCustomer({
                serviceID: selectedProvider.serviceID,
                billersCode: studentId,
            }).unwrap();

            console.log('Student verification result:', result);

            // Check for verification success
            if (result.content && result.content.Customer_Name) {
                setCustomerInfo({
                    ...result.content,
                    _verified: true
                });
                Alert.alert(
                    'Student Verified!',
                    `Student: ${result.content.Customer_Name}${result.content.Status ? `\nStatus: ${result.content.Status}` : ''}`,
                    [{ text: 'Continue', style: 'default' }]
                );
            } else {
                throw new Error('Student details not found');
            }
        } catch (error: any) {
            console.error('Student verification failed:', error);

            let errorMessage = 'Unable to verify student details.';

            if (error.message) {
                errorMessage = error.message;
            } else if (error.data?.message) {
                errorMessage = error.data.message;
            } else if (error.data?.response_description) {
                errorMessage = error.data.response_description;
            }

            // For education services, verification might not always be available
            // We'll allow payment to proceed without verification for some services
            const isPinService = selectedProvider.name.toLowerCase().includes('pin') ||
                selectedProvider.name.toLowerCase().includes('scratch') ||
                selectedProvider.name.toLowerCase().includes('waec') ||
                selectedProvider.name.toLowerCase().includes('jamb');

            if (isPinService) {
                Alert.alert(
                    'Verification Not Required',
                    'Verification is not required for this service. You can proceed with payment.',
                    [
                        {
                            text: 'Continue',
                            onPress: () => {
                                setCustomerInfo({
                                    Customer_Name: 'Student',
                                    Status: 'Active',
                                    _verified: false
                                });
                            }
                        },
                        {
                            text: 'Cancel',
                            style: 'cancel',
                            onPress: () => {
                                formik.setFieldValue('studentId', '');
                                setCustomerInfo(null);
                            }
                        }
                    ]
                );
            } else {
                // Enhanced error handling for other education services
                const isTestingError = errorMessage.toLowerCase().includes('invalid') ||
                    errorMessage.toLowerCase().includes('not found') ||
                    errorMessage.toLowerCase().includes('may be invalid');

                if (isTestingError) {
                    Alert.alert(
                        'Student Verification Failed',
                        `${errorMessage}\n\nThis often happens in sandbox mode with real student IDs. Would you like to:`,
                        [
                            {
                                text: 'Try Different ID',
                                style: 'default',
                                onPress: () => {
                                    formik.setFieldValue('studentId', '');
                                    setCustomerInfo(null);
                                }
                            },
                            {
                                text: 'Use Test Data',
                                style: 'destructive',
                                onPress: () => {
                                    Alert.alert(
                                        'Test Student IDs',
                                        `Try these test IDs for ${selectedProvider.name}:\n\n` +
                                        `• 1234567890\n` +
                                        `• TEST123456\n` +
                                        `• EDU2024001\n` +
                                        `• STU123456789\n\n` +
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
                                        Customer_Name: 'Test Student',
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
                                    formik.setFieldValue('studentId', '');
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
            }
        } finally {
            setIsVerifying(false);
        }
    };

    const checkSecuritySetup = () => {
        const hasPin = userProfile?.data?.pin; // Pin exists in database
        const hasBiometric = userProfile?.data?.biometricTransactions; // Biometric enabled for transactions

        return {
            hasPin: !!hasPin,
            hasBiometric: !!hasBiometric,
            hasAnySecurity: !!hasPin || !!hasBiometric,
            canUseBiometric: !!hasBiometric && userProfile?.data?.biometricType !== 'none'
        };
    };

    const attemptBiometricAuth = async () => {
        try {
            const biometricAuth = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Confirm your transaction',
                subtitle: 'Use your biometric to authorize this payment',
                cancelLabel: 'Cancel',
                fallbackLabel: 'Use PIN'
            });

            if (biometricAuth.success) {
                return true;
            } else if (biometricAuth.error === 'UserCancel') {
                return false;
            } else {
                // Biometric failed, try PIN if available
                const security = checkSecuritySetup();
                if (security.hasPin) {
                    setSecurityType('pin');
                    setShowSecurityModal(true);
                } else {
                    Alert.alert('Authentication Failed', 'Biometric authentication failed and no PIN is set up.');
                }
                return false;
            }
        } catch (error) {
            console.error('Biometric authentication error:', error);
            const security = checkSecuritySetup();
            if (security.hasPin) {
                setSecurityType('pin');
                setShowSecurityModal(true);
            } else {
                Alert.alert('Error', 'Biometric authentication is not available and no PIN is set up.');
            }
            return false;
        }
    };

    const verifyTransactionPin = async () => {
        if (!enteredPin || enteredPin.length !== 4) {
            setPinError('Please enter a 4-digit PIN');
            return false;
        }

        try {
            const result = await verifyPin({ pin: enteredPin }).unwrap();

            if (result.status === 'success') {
                setShowSecurityModal(false);
                setEnteredPin('');
                setPinError('');
                return true;
            } else {
                setPinError('Incorrect PIN. Please try again.');
                return false;
            }
        } catch (error: any) {
            setPinError(error.data?.message || 'PIN verification failed');
            return false;
        }
    };

    const handlePayment = async (values: FormValues) => {
        if (!selectedProvider) {
            Alert.alert('Error', 'Please select an education service');
            return;
        }

        if (!selectedPackage) {
            Alert.alert('Error', 'Please select a package');
            return;
        }

        // Check wallet balance
        if (walletData && selectedPackage.variation_amount > walletData.data?.balance) {
            const shortfall = selectedPackage.variation_amount - walletData.data.balance;
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

        // Prepare transaction data
        const transactionData = {
            request_id: `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            serviceID: selectedProvider.serviceID,
            billersCode: values.studentId,
            variation_code: selectedPackage.variation_code,
            amount: selectedPackage.variation_amount,
            phone: values.phone,
            formValues: values,
            customerName: customerInfo?.Customer_Name || 'Student',
            providerName: selectedProvider.name,
            packageName: selectedPackage.name,
            serviceType: selectedProvider.name.toLowerCase().includes('pin') ? 'exam-pin' : 'education'
        };

        // Check security setup and handle accordingly
        const security = checkSecuritySetup();

        if (!security.hasAnySecurity) {
            // No security method enabled - redirect to profile
            Alert.alert(
                'Security Setup Required',
                'To make transactions, you need to set up either a transaction PIN or enable biometric authentication.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Setup Security',
                        onPress: () => router.push('/(tabs)/profile'),
                    }
                ]
            );
            return;
        }

        // Store pending transaction
        setPendingTransaction(transactionData);

        // Try biometric first if available
        if (security.canUseBiometric) {
            const biometricSuccess = await attemptBiometricAuth();
            if (biometricSuccess) {
                await processPayment(transactionData);
            }
        } else if (security.hasPin) {
            // Show PIN modal
            setSecurityType('pin');
            setShowSecurityModal(true);
        }
    };

    const processPayment = async (transactionData: any) => {
        try {
            console.log('Sending education payment request:', transactionData);

            // Create the payload for the API
            const payload = {
                request_id: transactionData.request_id,
                serviceID: transactionData.serviceID,
                billersCode: transactionData.billersCode,
                variation_code: transactionData.variation_code,
                amount: transactionData.amount,
                phone: transactionData.phone,
            };

            const result = await payBill(payload).unwrap();
            console.log('Education payment result:', result);

            const isActuallySuccessful = result.success === true;

            // Refetch wallet balance to update UI
            refetchWallet();

            if (isActuallySuccessful) {
                // Success
                Alert.alert(
                    'Payment Successful!',
                    `${transactionData.packageName} payment completed successfully${transactionData.customerName !== 'Student' ? ` for ${transactionData.customerName}` : ''}`,
                    [
                        {
                            text: 'View Receipt',
                            onPress: () => {
                                router.push({
                                    pathname: '/bills/receipt',
                                    params: {
                                        transactionRef: result.data?.transactionRef || payload.request_id,
                                        type: 'education',
                                        network: transactionData.providerName,
                                        billersCode: transactionData.billersCode,
                                        amount: transactionData.amount.toString(),
                                        status: 'successful',
                                        serviceName: transactionData.packageName,
                                        phone: transactionData.phone
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
                                        type: 'education',
                                        network: transactionData.providerName,
                                        billersCode: transactionData.billersCode,
                                        amount: transactionData.amount.toString(),
                                        status: 'failed',
                                        errorMessage: errorMessage,
                                        serviceName: transactionData.packageName,
                                        phone: transactionData.phone
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
            console.error('Education payment error:', error);

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

    const renderCategory = (category: any) => (
        <TouchableOpacity
            key={category.id}
            style={[
                styles.categoryCard,
                selectedCategory === category.id && styles.categoryCardSelected
            ]}
            onPress={() => {
                setSelectedCategory(selectedCategory === category.id ? null : category.id);
                setSelectedProvider(null);
                setSelectedPackage(null);
                setCustomerInfo(null);
            }}
        >
            <View style={[
                styles.categoryIcon,
                { backgroundColor: category.color + '20' }
            ]}>
                <MaterialIcons
                    name={category.icon as any}
                    size={24}
                    color={category.color}
                />
            </View>
            <Text style={[
                styles.categoryName,
                selectedCategory === category.id && styles.categoryNameSelected
            ]}>
                {category.name}
            </Text>
        </TouchableOpacity>
    );

    const renderProvider = (provider: EducationService) => (
        <TouchableOpacity
            key={provider.serviceID}
            style={[
                styles.providerCard,
                selectedProvider?.serviceID === provider.serviceID && styles.providerCardSelected
            ]}
            onPress={() => {
                setSelectedProvider(provider);
                setSelectedPackage(null);
                setCustomerInfo(null);
                setSearchQuery('');
            }}
        >
            <Image
                source={{ uri: provider.image }}
                style={styles.providerImage}
                resizeMode="contain"
            />
            <Text style={styles.providerName}>{provider.name}</Text>
            {selectedProvider?.serviceID === provider.serviceID && (
                <View style={styles.selectedBadge}>
                    <MaterialIcons name="check" size={16} color={COLORS.textInverse} />
                </View>
            )}
        </TouchableOpacity>
    );

    const renderPackage = (pkg: EducationPackage) => (
        <TouchableOpacity
            key={pkg.variation_code}
            style={[
                styles.packageCard,
                selectedPackage?.variation_code === pkg.variation_code && styles.packageCardSelected
            ]}
            onPress={() => {
                setSelectedPackage(pkg);
                setSearchQuery('');
            }}
        >
            <View style={styles.packageContent}>
                <View style={styles.packageInfo}>
                    <Text style={[
                        styles.packageName,
                        selectedPackage?.variation_code === pkg.variation_code && styles.packageNameSelected
                    ]}>
                        {pkg.name}
                    </Text>
                    <Text style={styles.packagePrice}>
                        {formatCurrency(pkg.variation_amount)}
                    </Text>
                </View>
                {selectedPackage?.variation_code === pkg.variation_code && (
                    <MaterialIcons name="check-circle" size={24} color={COLORS.primary} />
                )}
            </View>
        </TouchableOpacity>
    );

    const filteredProviders = filterProvidersByCategory(providers);

    const SecurityModal = () => (
        <Modal
            visible={showSecurityModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowSecurityModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Confirm Transaction</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setShowSecurityModal(false);
                                setEnteredPin('');
                                setPinError('');
                            }}
                            style={styles.modalCloseButton}
                        >
                            <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.transactionSummary}>
                        <Text style={styles.summaryText}>
                            {selectedProvider?.name}
                        </Text>
                        <Text style={styles.summaryAmount}>
                            {pendingTransaction ? formatCurrency(pendingTransaction.amount) : ''}
                        </Text>
                        <Text style={styles.summaryStudent}>
                            {pendingTransaction ? `${pendingTransaction.serviceType === 'exam-pin' ? 'Reference' : 'Student ID'}: ${pendingTransaction.billersCode}` : ''}
                        </Text>
                        <Text style={styles.summaryPackage}>
                            {pendingTransaction ? pendingTransaction.packageName : ''}
                        </Text>
                        {pendingTransaction?.customerName && pendingTransaction.customerName !== 'Student' && (
                            <Text style={styles.summaryCustomer}>
                                {pendingTransaction.customerName}
                            </Text>
                        )}
                    </View>

                    <View style={styles.pinSection}>
                        <Text style={styles.pinLabel}>Enter Transaction PIN</Text>
                        <View style={styles.pinInputContainer}>
                            <TextInput
                                style={styles.pinInput}
                                value={enteredPin}
                                onChangeText={(text) => {
                                    setEnteredPin(text.replace(/[^0-9]/g, '').slice(0, 4));
                                    setPinError('');
                                }}
                                keyboardType="numeric"
                                maxLength={4}
                                secureTextEntry
                                placeholder="••••"
                                placeholderTextColor={COLORS.textTertiary}
                            />
                        </View>
                        {pinError ? (
                            <Text style={styles.pinError}>{pinError}</Text>
                        ) : null}
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setShowSecurityModal(false);
                                setEnteredPin('');
                                setPinError('');
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                enteredPin.length !== 4 && styles.confirmButtonDisabled
                            ]}
                            onPress={async () => {
                                const verified = await verifyTransactionPin();
                                if (verified && pendingTransaction) {
                                    await processPayment(pendingTransaction);
                                }
                            }}
                            disabled={enteredPin.length !== 4}
                        >
                            <Text style={styles.confirmButtonText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
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
                        <Text style={styles.headerTitle}>Education Services</Text>
                        <View style={styles.placeholder} />
                    </View>

                    {/* Balance Card */}
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>Wallet Balance</Text>
                        <Text style={styles.balanceAmount}>
                            {walletData ? formatCurrency(walletData.data?.balance) : '₦0.00'}
                        </Text>
                    </View>
                </LinearGradient>

                {/* Main Content */}

                <Formik
                    initialValues={{ studentId: '', phone: '' }}
                    validationSchema={EducationSchema}
                    onSubmit={handlePayment}
                >
                    {(formik) => {
                        const { handleChange, handleBlur, handleSubmit, values, errors, touched } = formik;

                        return (
                            <>
                                {/* Service Categories */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Service Categories</Text>
                                    <View style={styles.categoriesGrid}>
                                        {educationCategories.map(renderCategory)}
                                    </View>
                                </View>

                                {/* Education Service Providers */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>
                                        {selectedCategory
                                            ? `${educationCategories.find(c => c.id === selectedCategory)?.name} Services`
                                            : 'All Education Services'
                                        }
                                    </Text>
                                    {filteredProviders.length > 0 ? (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            <View style={styles.providersGrid}>
                                                {filteredProviders.map(renderProvider)}
                                            </View>
                                        </ScrollView>
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <MaterialIcons name="school" size={48} color={COLORS.textTertiary} />
                                            <Text style={styles.emptyStateText}>
                                                {selectedCategory
                                                    ? 'No services available for this category'
                                                    : 'No education services available'
                                                }
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Student ID / Reference Number */}
                                {selectedProvider && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>
                                            {selectedProvider.name.toLowerCase().includes('pin')
                                                ? 'Quantity/Reference'
                                                : 'Student ID/Registration Number'
                                            }
                                        </Text>
                                        <View style={[
                                            styles.inputContainer,
                                            touched.studentId && errors.studentId && styles.inputContainerError
                                        ]}>
                                            <MaterialIcons
                                                name={selectedProvider.name.toLowerCase().includes('pin') ? 'confirmation-number' : 'person'}
                                                size={20}
                                                color={COLORS.textTertiary}
                                                style={styles.inputIcon}
                                            />
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder={selectedProvider.name.toLowerCase().includes('pin')
                                                    ? 'Enter quantity or reference'
                                                    : 'Enter student ID or registration number'
                                                }
                                                placeholderTextColor={COLORS.textTertiary}
                                                value={values.studentId}
                                                onChangeText={(text) => {
                                                    handleChange('studentId')(text);
                                                    setCustomerInfo(null);
                                                }}
                                                onBlur={handleBlur('studentId')}
                                                returnKeyType="done"
                                            />
                                            {!selectedProvider.name.toLowerCase().includes('pin') && (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.verifyButton,
                                                        (!selectedProvider || !values.studentId || isVerifying) && styles.verifyButtonDisabled
                                                    ]}
                                                    onPress={() => handleVerifyCustomer(values.studentId, formik)}
                                                    disabled={!selectedProvider || !values.studentId || isVerifying}
                                                >
                                                    {isVerifying ? (
                                                        <ActivityIndicator size="small" color={COLORS.textInverse} />
                                                    ) : (
                                                        <Text style={styles.verifyButtonText}>Verify</Text>
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        {touched.studentId && errors.studentId && (
                                            <Text style={styles.errorText}>{errors.studentId}</Text>
                                        )}

                                        {/* Helpful hint for sandbox testing */}
                                        {selectedProvider && !customerInfo && !selectedProvider.name.toLowerCase().includes('pin') && (
                                            <View style={styles.hintCard}>
                                                <MaterialIcons name="info" size={16} color={COLORS.info} />
                                                <Text style={styles.hintText}>
                                                    Testing in sandbox? Try: 1234567890, TEST123456, or EDU2024001
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Customer/Student Info */}
                                {customerInfo && (
                                    <View style={styles.customerInfoCard}>
                                        <View style={styles.customerInfoHeader}>
                                            <MaterialIcons
                                                name={customerInfo._verified ? "check-circle" : "info"}
                                                size={24}
                                                color={customerInfo._verified ? COLORS.success : COLORS.warning}
                                            />
                                            <Text style={styles.customerInfoTitle}>
                                                {customerInfo._verified ? 'Student Verified' : 'Using Test Data'}
                                            </Text>
                                        </View>
                                        <View style={styles.customerInfoRow}>
                                            <Text style={styles.customerInfoLabel}>Name:</Text>
                                            <Text style={styles.customerInfoValue}>{customerInfo.Customer_Name}</Text>
                                        </View>
                                        {customerInfo.Status && (
                                            <View style={styles.customerInfoRow}>
                                                <Text style={styles.customerInfoLabel}>Status:</Text>
                                                <Text style={styles.customerInfoValue}>{customerInfo.Status}</Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Available Packages/Services */}
                                {selectedProvider && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Available Services</Text>

                                        {/* Search Bar */}
                                        <View style={styles.searchContainer}>
                                            <MaterialIcons name="search" size={20} color={COLORS.textTertiary} style={styles.searchIcon} />
                                            <TextInput
                                                style={styles.searchInput}
                                                placeholder="Search by service name or price..."
                                                placeholderTextColor={COLORS.textTertiary}
                                                value={searchQuery}
                                                onChangeText={setSearchQuery}
                                            />
                                            {searchQuery.length > 0 && (
                                                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                                                    <MaterialIcons name="close" size={20} color={COLORS.textTertiary} />
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Packages List */}
                                        {packagesLoading ? (
                                            <View style={styles.loadingContainer}>
                                                <ActivityIndicator size="large" color={COLORS.primary} />
                                                <Text style={styles.loadingText}>Loading services...</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.packagesContainer}>
                                                {(() => {
                                                    const allPackages = packages?.content?.variations || packages?.content?.varations || [];
                                                    const filteredPackages = filterPackages(allPackages);

                                                    if (allPackages.length === 0) {
                                                        return (
                                                            <View style={styles.loadingContainer}>
                                                                <MaterialIcons name="error-outline" size={48} color={COLORS.textTertiary} />
                                                                <Text style={styles.loadingText}>No services available</Text>
                                                                <Text style={styles.searchHint}>Please try selecting another provider</Text>
                                                            </View>
                                                        );
                                                    }

                                                    if (filteredPackages.length === 0 && searchQuery.trim()) {
                                                        return (
                                                            <View style={styles.loadingContainer}>
                                                                <MaterialIcons name="search-off" size={48} color={COLORS.textTertiary} />
                                                                <Text style={styles.loadingText}>No services match your search</Text>
                                                                <Text style={styles.searchHint}>Try searching with different keywords</Text>
                                                            </View>
                                                        );
                                                    }

                                                    return filteredPackages.map(renderPackage);
                                                })()}
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Phone Number */}
                                {selectedProvider && (
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
                                )}

                                {/* Payment Summary */}
                                {selectedProvider && selectedPackage && values.phone && (
                                    <View style={styles.summaryCard}>
                                        <Text style={styles.summaryTitle}>Payment Summary</Text>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Service:</Text>
                                            <Text style={styles.summaryValue} numberOfLines={2}>{selectedProvider.name}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Package:</Text>
                                            <Text style={styles.summaryValue} numberOfLines={2}>{selectedPackage.name}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>
                                                {selectedProvider.name.toLowerCase().includes('pin') ? 'Reference:' : 'Student ID:'}
                                            </Text>
                                            <Text style={styles.summaryValue}>{values.studentId}</Text>
                                        </View>
                                        {customerInfo && (
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Student:</Text>
                                                <Text style={styles.summaryValue} numberOfLines={2}>{customerInfo.Customer_Name}</Text>
                                            </View>
                                        )}
                                        <View style={[styles.summaryRow, styles.summaryTotal]}>
                                            <Text style={styles.summaryTotalLabel}>Total:</Text>
                                            <Text style={styles.summaryTotalValue}>
                                                {formatCurrency(selectedPackage.variation_amount)}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Payment Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.paymentButton,
                                        (!selectedProvider || !selectedPackage || !values.phone || isLoading) && styles.paymentButtonDisabled
                                    ]}
                                    onPress={() => handleSubmit()}
                                    disabled={!selectedProvider || !selectedPackage || !values.phone || isLoading}
                                >
                                    {isLoading ? (
                                        <View style={styles.loadingButtonContainer}>
                                            <ActivityIndicator size="small" color={COLORS.textInverse} />
                                            <Text style={styles.paymentButtonText}>Processing...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.paymentButtonText}>
                                            Make Payment - {selectedPackage ? formatCurrency(selectedPackage.variation_amount) : '₦0'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        );
                    }}
                </Formik>
            </ScrollView>
            <SecurityModal />
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
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    categoryCard: {
        width: (width - SPACING.xl * 2 - SPACING.base) / 2,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        // borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.base,
        // ...SHADOWS.sm,
    },
    categoryCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    categoryName: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    categoryNameSelected: {
        color: COLORS.primary,
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
    errorText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.error,
        marginTop: SPACING.xs,
        marginLeft: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.xs,
        minHeight: 48,
        marginBottom: SPACING.base,
    },
    searchIcon: {
        marginRight: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: 0,
        textAlignVertical: 'center',
    },
    clearButton: {
        padding: SPACING.xs,
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
    searchHint: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
        marginTop: SPACING.xs,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    packagesContainer: {
        gap: SPACING.base,
    },
    packageCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.border,
        // ...SHADOWS.sm,
    },
    packageCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    packageContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    packageInfo: {
        flex: 1,
    },
    packageName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    packageNameSelected: {
        color: COLORS.primary,
    },
    packagePrice: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    emptyStateText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
        marginTop: SPACING.base,
        textAlign: 'center',
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        width: '100%',
        maxWidth: 400,
        ...SHADOWS.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
    },
    modalCloseButton: {
        padding: SPACING.xs,
    },
    transactionSummary: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.xl,
        alignItems: 'center',
    },
    summaryText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    summaryAmount: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
        marginBottom: SPACING.xs,
    },
    summaryStudent: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    summaryPackage: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    summaryCustomer: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    pinSection: {
        marginBottom: SPACING.xl,
    },
    pinLabel: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
        textAlign: 'center',
    },
    pinInputContainer: {
        alignItems: 'center',
    },
    pinInput: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        borderColor: COLORS.border,
        paddingVertical: SPACING.base,
        paddingHorizontal: SPACING.xl,
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        textAlign: 'center',
        letterSpacing: 8,
        color: COLORS.textPrimary,
        width: 120,
    },
    pinError: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.error,
        textAlign: 'center',
        marginTop: SPACING.sm,
    },
    modalActions: {
        flexDirection: 'row',
        gap: SPACING.base,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
    },
    confirmButton: {
        flex: 1,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    confirmButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textInverse,
    },
});