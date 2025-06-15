// app/bills/tv-subscription.tsx - Fixed with proper error handling and form context
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

const TVSubscriptionSchema = Yup.object().shape({
    smartCardNumber: Yup.string()
        .min(8, 'Smart card number must be at least 8 characters')
        .required('Smart card number is required'),
    phone: Yup.string()
        .matches(/^[0-9]{11}$/, 'Phone number must be 11 digits')
        .required('Phone number is required'),
});

interface TVService {
    serviceID: string;
    name: string;
    image: string;
    [key: string]: any;
}

interface TVPackage {
    variation_code: string;
    name: string;
    variation_amount: number;
    [key: string]: any;
}

interface CustomerInfo {
    Customer_Name: string;
    Status: string;
    Product_Name?: string;
    Customer_Number?: string;
    Address?: string;
    Email?: string;
    Phone?: string;
}

interface FormValues {
    smartCardNumber: string;
    phone: string;
}

export default function TVSubscriptionScreen() {
    const router = useRouter();
    const [selectedProvider, setSelectedProvider] = useState<TVService | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<TVPackage | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: tvServices } = useGetServicesByCategoryQuery('tv-subscription');
    const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
    const { data: packages, isLoading: packagesLoading } = useGetServiceVariationsQuery(
        selectedProvider?.serviceID,
        { skip: !selectedProvider }
    );
    const [verifyCustomer] = useVerifyCustomerMutation();
    const [payBill, { isLoading }] = usePayBillMutation();

    const providers = tvServices?.content || [];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Filter TV packages based on search query
    const filterPackages = (packages: TVPackage[]) => {
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
    const handleVerifyCustomer = async (smartCardNumber: string, formik: FormikProps<FormValues>) => {
        if (!selectedProvider || !smartCardNumber) return;

        setIsVerifying(true);
        try {
            const result = await verifyCustomer({
                serviceID: selectedProvider.serviceID,
                billersCode: smartCardNumber,
            }).unwrap();

            console.log('=== CUSTOMER VERIFICATION RESPONSE ===');
            console.log('Full Response:', JSON.stringify(result, null, 2));
            console.log('Response Code:', result.code);
            console.log('Response Content:', result.content);

            // Check for VTPass error patterns
            const hasError = result.content?.error ||
                result.content?.Error ||
                (result.content && typeof result.content === 'string' && result.content.toLowerCase().includes('error')) ||
                (result.response_description && result.response_description.toLowerCase().includes('error'));

            if (hasError) {
                const errorMessage = result.content?.error ||
                    result.content?.Error ||
                    result.content ||
                    result.response_description ||
                    'Invalid smart card number';

                throw new Error(errorMessage);
            }

            // Check if we have valid customer data
            const customerData = result.content;
            const hasValidCustomerData = customerData &&
                (customerData.Customer_Name ||
                    customerData.customer_name ||
                    customerData.name ||
                    customerData.Status ||
                    customerData.status);

            if (!hasValidCustomerData) {
                console.log('No customer data found, but no explicit error. Treating as invalid card.');
                throw new Error('Smart card number not found. Please verify the number and try again.');
            }

            // Extract customer information
            const extractValue = (obj: any, possibleKeys: string[]) => {
                for (const key of possibleKeys) {
                    if (obj && obj[key] && obj[key] !== '' && obj[key] !== null) {
                        return obj[key];
                    }
                }
                return null;
            };

            const customerName = extractValue(customerData, [
                'Customer_Name', 'customer_name', 'customerName', 'name', 'Name',
                'full_name', 'fullName', 'customer', 'Customer'
            ]);

            const customerStatus = extractValue(customerData, [
                'Status', 'status', 'customer_status', 'account_status'
            ]);

            const customerNumber = extractValue(customerData, [
                'Customer_Number', 'customer_number', 'customerNumber', 'account_number'
            ]);

            const productName = extractValue(customerData, [
                'Product_Name', 'product_name', 'productName', 'package_name', 'subscription'
            ]);

            // Create customer info object
            const enhancedCustomerInfo = {
                Customer_Name: customerName || `DSTV Customer`,
                Status: customerStatus || 'Active',
                Customer_Number: customerNumber || smartCardNumber,
                Product_Name: productName,
                _verified: true,
                _originalData: customerData
            };

            console.log('Processed Customer Info:', enhancedCustomerInfo);
            setCustomerInfo(enhancedCustomerInfo);

            // Show success message
            Alert.alert(
                'Customer Verified!',
                `Customer: ${enhancedCustomerInfo.Customer_Name}\nStatus: ${enhancedCustomerInfo.Status}\nSmart Card: ${smartCardNumber}`,
                [{ text: 'Continue', style: 'default' }]
            );

        } catch (error: any) {
            console.error('Customer verification failed:', error);

            let errorMessage = 'Unable to verify customer details.';

            if (error.message) {
                errorMessage = error.message;
            } else if (error.data?.message) {
                errorMessage = error.data.message;
            } else if (error.data?.response_description) {
                errorMessage = error.data.response_description;
            }

            // Enhanced error handling with test data option for development
            const isTestingError = errorMessage.toLowerCase().includes('invalid') ||
                errorMessage.toLowerCase().includes('not found') ||
                errorMessage.toLowerCase().includes('may be invalid');

            if (isTestingError) {
                Alert.alert(
                    'Smart Card Verification Failed',
                    `${errorMessage}\n\nThis often happens in sandbox mode with real card numbers. Would you like to:`,
                    [
                        {
                            text: 'Try Different Number',
                            style: 'default',
                            onPress: () => {
                                // Clear the smart card field using Formik's setFieldValue
                                formik.setFieldValue('smartCardNumber', '');
                                setCustomerInfo(null);
                            }
                        },
                        {
                            text: 'Use Test Data',
                            style: 'destructive',
                            onPress: () => {
                                // Suggest test smart card numbers for sandbox
                                Alert.alert(
                                    'Test Smart Card Numbers',
                                    `Try these test numbers for ${selectedProvider.name}:\n\n` +
                                    `• 1234567890\n` +
                                    `• 0123456789\n` +
                                    `• 7034334987\n` +
                                    `• 4432203456\n\n` +
                                    `These are commonly used test numbers in VTPass sandbox.`,
                                    [{ text: 'OK', style: 'default' }]
                                );
                            }
                        },
                        {
                            text: 'Continue Anyway',
                            style: 'cancel',
                            onPress: () => {
                                // Allow user to proceed with unverified card (for testing)
                                console.log('User chose to proceed with unverified card');
                                const fallbackCustomerInfo = {
                                    Customer_Name: `Test Customer`,
                                    Status: 'Active',
                                    Customer_Number: smartCardNumber,
                                    Product_Name: 'Test Package',
                                    _verified: false,
                                    _originalData: null
                                };
                                setCustomerInfo(fallbackCustomerInfo);
                            }
                        }
                    ]
                );
            } else {
                // For other types of errors
                Alert.alert(
                    'Verification Error',
                    errorMessage,
                    [
                        {
                            text: 'Try Again',
                            style: 'default',
                            onPress: () => {
                                formik.setFieldValue('smartCardNumber', '');
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
            Alert.alert('Error', 'Please select a TV provider');
            return;
        }

        if (!selectedPackage) {
            Alert.alert('Error', 'Please select a package');
            return;
        }

        if (!customerInfo) {
            Alert.alert('Error', 'Please verify smart card number first');
            return;
        }

        // Check wallet balance
        if (walletData && selectedPackage.variation_amount > walletData.data.balance) {
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

        try {
            // Prepare the payload according to VTPass TV subscription API specification
            const payload = {
                request_id: `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                serviceID: selectedProvider.serviceID,
                billersCode: values.smartCardNumber,
                variation_code: selectedPackage.variation_code,
                amount: selectedPackage.variation_amount,
                phone: values.phone,
            };

            console.log('Sending TV subscription payment request:', payload);

            const result = await payBill(payload).unwrap();

            console.log('TV subscription payment result:', result);

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
                    `${selectedPackage.name} subscription has been activated for ${customerInfo.Customer_Name}`,
                    [
                        {
                            text: 'View Receipt',
                            onPress: () => {
                                router.push({
                                    pathname: '/bills/receipt',
                                    params: {
                                        transactionRef: result.data?.transactionRef || payload.request_id,
                                        type: 'tv-subscription',
                                        network: selectedProvider.name,
                                        billersCode: values.smartCardNumber,
                                        amount: selectedPackage.variation_amount.toString(),
                                        status: 'successful',
                                        serviceName: selectedPackage.name,
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
                                        type: 'tv-subscription',
                                        network: selectedProvider.name,
                                        billersCode: values.smartCardNumber,
                                        amount: selectedPackage.variation_amount.toString(),
                                        status: 'failed',
                                        errorMessage: errorMessage,
                                        serviceName: selectedPackage.name,
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
            console.error('TV subscription payment error:', error);

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

    const renderProvider = (provider: TVService) => (
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

    const renderPackage = (pkg: TVPackage) => (
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
                    <Text style={styles.headerTitle}>TV Subscription</Text>
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
                    initialValues={{ smartCardNumber: '', phone: '' }}
                    validationSchema={TVSubscriptionSchema}
                    onSubmit={handlePayment}
                >
                    {(formik) => {
                        const { handleChange, handleBlur, handleSubmit, values, errors, touched } = formik;

                        return (
                            <>
                                {/* TV Provider Selection */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Select TV Provider</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        <View style={styles.providersGrid}>
                                            {providers.map(renderProvider)}
                                        </View>
                                    </ScrollView>
                                </View>

                                {/* Smart Card Number */}
                                {selectedProvider && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Smart Card Number</Text>
                                        <View style={[
                                            styles.inputContainer,
                                            touched.smartCardNumber && errors.smartCardNumber && styles.inputContainerError
                                        ]}>
                                            <MaterialIcons
                                                name="credit-card"
                                                size={20}
                                                color={COLORS.textTertiary}
                                                style={styles.inputIcon}
                                            />
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="Enter smart card number"
                                                placeholderTextColor={COLORS.textTertiary}
                                                value={values.smartCardNumber}
                                                onChangeText={(text) => {
                                                    handleChange('smartCardNumber')(text);
                                                    setCustomerInfo(null);
                                                }}
                                                onBlur={handleBlur('smartCardNumber')}
                                                keyboardType="numeric"
                                                returnKeyType="done"
                                            />
                                            <TouchableOpacity
                                                style={[
                                                    styles.verifyButton,
                                                    (!selectedProvider || !values.smartCardNumber || isVerifying) && styles.verifyButtonDisabled
                                                ]}
                                                onPress={() => handleVerifyCustomer(values.smartCardNumber, formik)}
                                                disabled={!selectedProvider || !values.smartCardNumber || isVerifying}
                                            >
                                                {isVerifying ? (
                                                    <ActivityIndicator size="small" color={COLORS.textInverse} />
                                                ) : (
                                                    <Text style={styles.verifyButtonText}>Verify</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                        {touched.smartCardNumber && errors.smartCardNumber && (
                                            <Text style={styles.errorText}>{errors.smartCardNumber}</Text>
                                        )}

                                        {/* Helpful hint for sandbox testing */}
                                        {selectedProvider && !customerInfo && (
                                            <View style={styles.hintCard}>
                                                <MaterialIcons name="info" size={16} color={COLORS.info} />
                                                <Text style={styles.hintText}>
                                                    Testing in sandbox? Try: 1234567890, 0123456789, or 7034334987
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

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
                                                {customerInfo._verified ? 'Customer Verified' : 'Using Test Data'}
                                            </Text>
                                        </View>
                                        <View style={styles.customerInfoRow}>
                                            <Text style={styles.customerInfoLabel}>Name:</Text>
                                            <Text style={styles.customerInfoValue}>{customerInfo.Customer_Name}</Text>
                                        </View>
                                        {customerInfo.Customer_Number && (
                                            <View style={styles.customerInfoRow}>
                                                <Text style={styles.customerInfoLabel}>Number:</Text>
                                                <Text style={styles.customerInfoValue}>{customerInfo.Customer_Number}</Text>
                                            </View>
                                        )}
                                        <View style={styles.customerInfoRow}>
                                            <Text style={styles.customerInfoLabel}>Status:</Text>
                                            <Text style={[
                                                styles.customerInfoValue,
                                                { color: customerInfo.Status?.toLowerCase() === 'active' ? COLORS.success : COLORS.warning }
                                            ]}>
                                                {customerInfo.Status}
                                            </Text>
                                        </View>
                                        {customerInfo.Product_Name && (
                                            <View style={styles.customerInfoRow}>
                                                <Text style={styles.customerInfoLabel}>Package:</Text>
                                                <Text style={styles.customerInfoValue}>{customerInfo.Product_Name}</Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* TV Packages */}
                                {selectedProvider && customerInfo && (
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeaderWithPackage}>
                                            <Text style={styles.sectionTitle}>Select Package</Text>
                                            {selectedPackage && !searchQuery && (
                                                <TouchableOpacity
                                                    onPress={() => setSelectedPackage(null)}
                                                    style={styles.changePackageButton}
                                                >
                                                    <MaterialIcons name="edit" size={16} color={COLORS.primary} />
                                                    <Text style={styles.changePackageText}>Change Package</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>

                                        {/* Selected Package Summary */}
                                        {selectedPackage && !searchQuery ? (
                                            <View style={styles.selectedPackageSummary}>
                                                <View style={styles.selectedPackageCard}>
                                                    <View style={styles.selectedPackageHeader}>
                                                        <MaterialIcons name="check-circle" size={24} color={COLORS.success} />
                                                        <Text style={styles.selectedPackageTitle}>Selected Package</Text>
                                                    </View>
                                                    <View style={styles.selectedPackageDetails}>
                                                        <Text style={styles.selectedPackageName}>{selectedPackage.name}</Text>
                                                        <Text style={styles.selectedPackagePrice}>
                                                            {formatCurrency(selectedPackage.variation_amount)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ) : (
                                            <>
                                                {/* Search Bar */}
                                                <View style={styles.searchContainer}>
                                                    <MaterialIcons name="search" size={20} color={COLORS.textTertiary} style={styles.searchIcon} />
                                                    <TextInput
                                                        style={styles.searchInput}
                                                        placeholder="Search by package name or price..."
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
                                                        <Text style={styles.loadingText}>Loading packages...</Text>
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
                                                                        <Text style={styles.loadingText}>No packages available</Text>
                                                                        <Text style={styles.searchHint}>Please try selecting another provider</Text>
                                                                    </View>
                                                                );
                                                            }

                                                            if (filteredPackages.length === 0 && searchQuery.trim()) {
                                                                return (
                                                                    <View style={styles.loadingContainer}>
                                                                        <MaterialIcons name="search-off" size={48} color={COLORS.textTertiary} />
                                                                        <Text style={styles.loadingText}>No packages match your search</Text>
                                                                        <Text style={styles.searchHint}>Try searching with different keywords</Text>
                                                                    </View>
                                                                );
                                                            }

                                                            return filteredPackages.map(renderPackage);
                                                        })()}
                                                    </View>
                                                )}
                                            </>
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
                                {selectedProvider && selectedPackage && customerInfo && values.phone && (
                                    <View style={styles.summaryCard}>
                                        <Text style={styles.summaryTitle}>Payment Summary</Text>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Provider:</Text>
                                            <Text style={styles.summaryValue}>{selectedProvider.name}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Customer:</Text>
                                            <Text style={styles.summaryValue} numberOfLines={2}>{customerInfo.Customer_Name}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Smart Card:</Text>
                                            <Text style={styles.summaryValue}>{values.smartCardNumber}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Package:</Text>
                                            <Text style={styles.summaryValue} numberOfLines={2}>{selectedPackage.name}</Text>
                                        </View>
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
                                        (!selectedProvider || !selectedPackage || !customerInfo || !values.phone || isLoading) && styles.paymentButtonDisabled
                                    ]}
                                    onPress={() => handleSubmit()}
                                    disabled={!selectedProvider || !selectedPackage || !customerInfo || !values.phone || isLoading}
                                >
                                    {isLoading ? (
                                        <View style={styles.loadingButtonContainer}>
                                            <ActivityIndicator size="small" color={COLORS.textInverse} />
                                            <Text style={styles.paymentButtonText}>Processing...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.paymentButtonText}>
                                            Pay Subscription - {selectedPackage ? formatCurrency(selectedPackage.variation_amount) : '₦0'}
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
    sectionHeaderWithPackage: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.base,
    },
    changePackageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryBackground,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.base,
        borderWidth: 1,
        borderColor: COLORS.primary + '40',
    },
    changePackageText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.primary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        marginLeft: SPACING.xs,
    },
    selectedPackageSummary: {
        marginBottom: SPACING.base,
    },
    selectedPackageCard: {
        backgroundColor: COLORS.success + '10',
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.success + '40',
        ...SHADOWS.sm,
    },
    selectedPackageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    selectedPackageTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.success + 'CC',
        marginLeft: SPACING.sm,
    },
    selectedPackageDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedPackageName: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        flex: 1,
    },
    selectedPackagePrice: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.success,
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
    loadingText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.base,
        textAlign: 'center',
    },
    loadingButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
        ...SHADOWS.sm,
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