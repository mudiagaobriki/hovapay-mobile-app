// app/bills/data.tsx
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
    const { data: walletData } = useGetWalletBalanceQuery();
    const { data: variations, isLoading: variationsLoading, error: variationsError } = useGetServiceVariationsQuery(
        selectedNetwork?.serviceID,
        { skip: !selectedNetwork }
    );

    // Debug log to see the variations structure
    React.useEffect(() => {
        if (variations) {
            console.log('Variations response:', JSON.stringify(variations, null, 2));
        }
        if (variationsError) {
            console.log('Variations error:', variationsError);
        }
    }, [variations, variationsError]);

    const [payBill, { isLoading }] = usePayBillMutation();

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

        if (walletData && selectedPlan.variation_amount > walletData.data.balance) {
            Alert.alert('Insufficient Balance', 'Please fund your wallet to continue');
            return;
        }

        try {
            const result = await payBill({
                serviceID: selectedNetwork.serviceID,
                billersCode: values.phone.startsWith('0') ? values.phone.substring(1) : values.phone,
                variation_code: selectedPlan.variation_code,
                amount: selectedPlan.variation_amount,
                phone: `+234${values.phone.substring(1)}`,
            }).unwrap();

            Alert.alert(
                'Purchase Successful!',
                `${selectedPlan.name} has been activated on ${values.phone}`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            Alert.alert(
                'Purchase Failed',
                error.message || 'Something went wrong. Please try again.'
            );
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
            <Text style={styles.networkName}>{network.name.replace(' Data', '')}</Text>
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
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                                                <Input
                                                    flex={1}
                                                    variant="unstyled"
                                                    placeholder="Search by plan name or price..."
                                                    placeholderTextColor={COLORS.textTertiary}
                                                    value={searchQuery}
                                                    onChangeText={setSearchQuery}
                                                    fontSize={TYPOGRAPHY.fontSizes.base}
                                                    color={COLORS.textPrimary}
                                                    _focus={{ borderWidth: 0 }}
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
                                        <Text style={styles.summaryValue}>{selectedPlan.name}</Text>
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
                                onPress={handleSubmit}
                                disabled={!selectedNetwork || !selectedPlan || !values.phone || isLoading}
                            >
                                {isLoading ? (
                                    <View style={styles.loadingContainer}>
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
        borderWidth: 2,
        borderColor: COLORS.border,
        marginBottom: SPACING.base,
        position: 'relative',
        ...SHADOWS.sm,
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
        ...SHADOWS.sm,
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
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        flex: 1,
    },
    selectedPlanPrice: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
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
    purchaseButton: {
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
    purchaseButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    purchaseButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
});