// app/bills/data.tsx - Fixed with Pure React Native Components
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
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
    useGetServicesByCategoryQuery,
    useGetServiceVariationsQuery,
    usePayBillMutation,
    useGetWalletBalanceQuery
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

const DataSchema = Yup.object().shape({
    phone: Yup.string()
        .matches(/^[0-9]{11}$/, 'Phone number must be 11 digits')
        .required('Phone number is required'),
});

interface NetworkService {
    serviceID: string;
    name: string;
    image: string;
    [key: string]: any;
}

interface DataPlan {
    variation_code: string;
    name: string;
    variation_amount: number;
    [key: string]: any;
}

export default function DataScreen() {
    const router = useRouter();
    const [selectedNetwork, setSelectedNetwork] = useState<NetworkService | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<DataPlan | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: dataServices } = useGetServicesByCategoryQuery('data');
    const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
    const { data: variations, isLoading: variationsLoading, error: variationsError } = useGetServiceVariationsQuery(
        selectedNetwork?.serviceID,
        { skip: !selectedNetwork }
    );

    const [payBill, { isLoading }] = usePayBillMutation();

    // Debug log to see the variations structure
    React.useEffect(() => {
        if (variations) {
            console.log('Variations response:', JSON.stringify(variations, null, 2));
        }
        if (variationsError) {
            console.log('Variations error:', variationsError);
        }
    }, [variations, variationsError]);

    const networks = dataServices?.content?.filter(service =>
        ['mtn-data', 'airtel-data', 'glo-data', 'etisalat-data'].includes(service.serviceID)
    ) || [];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Phone number validation for networks
    const validatePhoneNumber = (phone: string, network: string) => {
        // VTPass sandbox test numbers - allow these for any network
        const testNumbers = [
            '08011111111', // Successful test
            '201000000000', // Pending test
            '500000000000', // Unexpected response test
            '400000000000', // No response test
            '300000000000', // Timeout test
        ];

        // If it's a test number, allow it for any network
        if (testNumbers.includes(phone)) {
            return true;
        }

        // Regular validation for real phone numbers
        const networkPrefixes = {
            'mtn-data': ['0803', '0806', '0813', '0816', '0903', '0906', '0913', '0916'],
            'airtel-data': ['0802', '0808', '0812', '0901', '0907', '0911'],
            'glo-data': ['0805', '0807', '0811', '0815', '0905', '0915'],
            'etisalat-data': ['0809', '0817', '0818', '0908', '0909']
        };

        const prefix = phone.substring(0, 4);
        const validPrefixes = networkPrefixes[network.toLowerCase()] || [];

        return validPrefixes.includes(prefix);
    };

    // Filter data plans based on search query
    const filterDataPlans = (plans: DataPlan[]) => {
        if (!searchQuery.trim()) return plans;

        const query = searchQuery.toLowerCase();
        return plans.filter(plan => {
            // Search by plan name
            const nameMatch = plan.name.toLowerCase().includes(query);

            // Search by price (convert to string and search)
            const priceString = plan.variation_amount.toString();
            const formattedPrice = formatCurrency(plan.variation_amount).toLowerCase();
            const priceMatch = priceString.includes(query) || formattedPrice.includes(query);

            return nameMatch || priceMatch;
        });
    };

    const handlePurchase = async (values: any) => {
        if (!selectedNetwork) {
            Alert.alert('Error', 'Please select a network');
            return;
        }

        if (!selectedPlan) {
            Alert.alert('Error', 'Please select a data plan');
            return;
        }

        // Validate phone number against selected network
        if (!validatePhoneNumber(values.phone, selectedNetwork.serviceID)) {
            Alert.alert(
                'Invalid Phone Number',
                `The phone number ${values.phone} does not match the selected ${selectedNetwork.name.replace(' Data', '')} network. Please check and try again.`
            );
            return;
        }

        // Check wallet balance
        if (walletData && selectedPlan.variation_amount > walletData.data.balance) {
            const shortfall = selectedPlan.variation_amount - walletData.data.balance;
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
            // Prepare the payload according to VTPass data API specification
            const payload = {
                request_id: `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                serviceID: selectedNetwork.serviceID,
                billersCode: values.phone.startsWith('0') ? values.phone.substring(1) : values.phone,
                variation_code: selectedPlan.variation_code,
                amount: selectedPlan.variation_amount,
                phone: values.phone,
            };

            console.log('Sending data purchase request:', payload);

            const result = await payBill(payload).unwrap();

            console.log('Data purchase result:', result);

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
                    'Purchase Successful!',
                    `${selectedPlan.name} has been activated on ${values.phone}`,
                    [
                        {
                            text: 'View Receipt',
                            onPress: () => {
                                router.push({
                                    pathname: '/bills/receipt',
                                    params: {
                                        transactionRef: result.data?.transactionRef || payload.request_id,
                                        type: 'data',
                                        network: selectedNetwork.name.replace(' Data', ''),
                                        phone: values.phone,
                                        amount: selectedPlan.variation_amount.toString(),
                                        status: 'successful',
                                        serviceName: selectedPlan.name
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
                                        type: 'data',
                                        network: selectedNetwork.name.replace(' Data', ''),
                                        phone: values.phone,
                                        amount: selectedPlan.variation_amount.toString(),
                                        status: 'failed',
                                        errorMessage: errorMessage,
                                        serviceName: selectedPlan.name
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
            console.error('Data purchase error:', error);

            let errorMessage = 'Something went wrong. Please try again.';

            if (error.data?.message) {
                errorMessage = error.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Purchase Failed', errorMessage, [
                {
                    text: 'OK',
                    style: 'default'
                }
            ]);
        }
    };

    const renderNetwork = (network: NetworkService) => (
        <TouchableOpacity
            key={network.serviceID}
            style={[
                styles.networkCard,
                selectedNetwork?.serviceID === network.serviceID && styles.networkCardSelected
            ]}
            onPress={() => {
                setSelectedNetwork(network);
                setSelectedPlan(null); // Reset plan selection when network changes
                setSearchQuery(''); // Clear search when network changes
            }}
        >
            <Image
                source={{ uri: network.image }}
                style={styles.networkImage}
                resizeMode="contain"
            />
            <Text style={styles.networkName} numberOfLines={1} ellipsizeMode='tail'>{network.name.replace(' Data', '')}</Text>
            {selectedNetwork?.serviceID === network.serviceID && (
                <View style={styles.selectedBadge}>
                    <MaterialIcons name="check" size={16} color={COLORS.textInverse} />
                </View>
            )}
        </TouchableOpacity>
    );

    const renderDataPlan = (plan: DataPlan) => (
        <TouchableOpacity
            key={plan.variation_code}
            style={[
                styles.planCard,
                selectedPlan?.variation_code === plan.variation_code && styles.planCardSelected
            ]}
            onPress={() => {
                setSelectedPlan(plan);
                setSearchQuery(''); // Clear search when plan is selected
            }}
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
                        <Text style={styles.headerTitle}>Buy Data</Text>
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
                    initialValues={{ phone: '' }}
                    validationSchema={DataSchema}
                    onSubmit={handlePurchase}
                >
                    {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                        <>
                            {/* Network Selection */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Select Network</Text>
                                <View style={styles.networksGrid}>
                                    {networks.map(renderNetwork)}
                                </View>
                            </View>

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

                            {/* Data Plans */}
                            {selectedNetwork && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeaderWithPlan}>
                                        <Text style={styles.sectionTitle}>Select Data Plan</Text>
                                        {selectedPlan && !searchQuery && (
                                            <TouchableOpacity
                                                onPress={() => setSelectedPlan(null)}
                                                style={styles.changePlanButton}
                                            >
                                                <MaterialIcons name="edit" size={16} color={COLORS.primary} />
                                                <Text style={styles.changePlanText}>Change Plan</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    {/* Selected Plan Summary (when plan is selected and no search) */}
                                    {selectedPlan && !searchQuery ? (
                                        <View style={styles.selectedPlanSummary}>
                                            <View style={styles.selectedPlanCard}>
                                                <View style={styles.selectedPlanHeader}>
                                                    <MaterialIcons name="check-circle" size={24} color={COLORS.success} />
                                                    <Text style={styles.selectedPlanTitle}>Selected Plan</Text>
                                                </View>
                                                <View style={styles.selectedPlanDetails}>
                                                    <Text style={styles.selectedPlanName}>{selectedPlan.name}</Text>
                                                    <Text style={styles.selectedPlanPrice}>
                                                        {formatCurrency(selectedPlan.variation_amount)}
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
                                                    placeholder="Search by plan name or price..."
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

                                            {/* Data Plans List */}
                                            {variationsLoading ? (
                                                <View style={styles.loadingContainer}>
                                                    <ActivityIndicator size="large" color={COLORS.primary} />
                                                    <Text style={styles.loadingText}>Loading data plans...</Text>
                                                </View>
                                            ) : (
                                                <View style={styles.plansContainer}>
                                                    {/* Handle both variations and varations (API typo) */}
                                                    {(() => {
                                                        const allPlans = variations?.content?.variations || variations?.content?.varations || [];
                                                        const filteredPlans = filterDataPlans(allPlans);

                                                        if (allPlans.length === 0) {
                                                            return (
                                                                <View style={styles.loadingContainer}>
                                                                    <MaterialIcons name="error-outline" size={48} color={COLORS.textTertiary} />
                                                                    <Text style={styles.loadingText}>No data plans available</Text>
                                                                    <Text style={styles.searchHint}>Please try selecting another network</Text>
                                                                </View>
                                                            );
                                                        }

                                                        if (filteredPlans.length === 0 && searchQuery.trim()) {
                                                            return (
                                                                <View style={styles.loadingContainer}>
                                                                    <MaterialIcons name="search-off" size={48} color={COLORS.textTertiary} />
                                                                    <Text style={styles.loadingText}>No plans match your search</Text>
                                                                    <Text style={styles.searchHint}>Try searching with different keywords</Text>
                                                                </View>
                                                            );
                                                        }

                                                        return filteredPlans.map(renderDataPlan);
                                                    })()}
                                                </View>
                                            )}
                                        </>
                                    )}
                                </View>
                            )}

                            {/* Purchase Summary */}
                            {selectedNetwork && selectedPlan && values.phone && (
                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryTitle}>Purchase Summary</Text>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Network:</Text>
                                        <Text style={styles.summaryValue}>{selectedNetwork.name.replace(' Data', '')}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Phone:</Text>
                                        <Text style={styles.summaryValue}>{values.phone}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Plan:</Text>
                                        <Text style={styles.summaryValue} numberOfLines={2}>{selectedPlan.name}</Text>
                                    </View>
                                    <View style={[styles.summaryRow, styles.summaryTotal]}>
                                        <Text style={styles.summaryTotalLabel}>Total:</Text>
                                        <Text style={styles.summaryTotalValue}>
                                            {formatCurrency(selectedPlan.variation_amount)}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {/* Purchase Button */}
                            <TouchableOpacity
                                style={[
                                    styles.purchaseButton,
                                    (!selectedNetwork || !selectedPlan || !values.phone || isLoading) && styles.purchaseButtonDisabled
                                ]}
                                onPress={() => handleSubmit()}
                                disabled={!selectedNetwork || !selectedPlan || !values.phone || isLoading}
                            >
                                {isLoading ? (
                                    <View style={styles.loadingButtonContainer}>
                                        <ActivityIndicator size="small" color={COLORS.textInverse} />
                                        <Text style={styles.purchaseButtonText}>Processing...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.purchaseButtonText}>
                                        Buy Data - {selectedPlan ? formatCurrency(selectedPlan.variation_amount) : '₦0'}
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
    networksGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    networkCard: {
        width: (width - SPACING.xl * 2 - SPACING.base * 3) / 4,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        // borderWidth: 2,
        borderColor: COLORS.border,
        marginBottom: SPACING.base,
        position: 'relative',
        maxHeight: 100,
        // ...SHADOWS.sm,
    },
    networkCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    networkImage: {
        width: 40,
        height: 40,
        marginBottom: SPACING.sm,
    },
    networkName: {
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
    errorText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.error,
        marginTop: SPACING.xs,
        marginLeft: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
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
    searchHint: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
        marginTop: SPACING.xs,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    sectionHeaderWithPlan: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.base,
    },
    changePlanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryBackground,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.base,
        borderWidth: 1,
        borderColor: COLORS.primary + '40',
    },
    changePlanText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.primary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        marginLeft: SPACING.xs,
    },
    selectedPlanSummary: {
        marginBottom: SPACING.base,
    },
    selectedPlanCard: {
        backgroundColor: COLORS.success + '10',
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.success + '40',
        // ...SHADOWS.sm,
    },
    selectedPlanHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    selectedPlanTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.success + 'CC',
        marginLeft: SPACING.sm,
    },
    selectedPlanDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedPlanName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        flex: 1,
    },
    selectedPlanPrice: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.success,
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
    purchaseButton: {
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
    purchaseButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    purchaseButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
    },
});