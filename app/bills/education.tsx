// app/bills/education.tsx
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

const EducationSchema = Yup.object().shape({
    studentId: Yup.string()
        .min(4, 'Student ID must be at least 4 characters')
        .required('Student ID is required'),
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
    const [customerInfo, setCustomerInfo] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { data: educationServices } = useGetServicesByCategoryQuery('education');
    const { data: walletData } = useGetWalletBalanceQuery();
    const { data: packages, isLoading: packagesLoading } = useGetServiceVariationsQuery(
        selectedProvider?.serviceID,
        { skip: !selectedProvider }
    );
    const [verifyCustomer] = useVerifyCustomerMutation();
    const [payBill, { isLoading }] = usePayBillMutation();

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

    const handleVerifyCustomer = async (studentId: string) => {
        if (!selectedProvider || !studentId) return;

        setIsVerifying(true);
        try {
            const result = await verifyCustomer({
                serviceID: selectedProvider.serviceID,
                billersCode: studentId,
            }).unwrap();

            setCustomerInfo(result.content);
            Alert.alert('Student Verified', `Student: ${result.content.Customer_Name}`);
        } catch (error: any) {
            // For education services, verification might not always be available
            // We'll allow payment to proceed without verification for some services
            if (selectedProvider.name.toLowerCase().includes('pin') ||
                selectedProvider.name.toLowerCase().includes('scratch')) {
                Alert.alert('Notice', 'Verification not required for this service. You can proceed with payment.');
                setCustomerInfo({ Customer_Name: 'Student', Status: 'Active' });
            } else {
                Alert.alert('Verification Failed', error.message || 'Unable to verify student details');
                setCustomerInfo(null);
            }
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePayment = async (values: any) => {
        if (!selectedProvider) {
            Alert.alert('Error', 'Please select an education service');
            return;
        }

        if (!selectedPackage) {
            Alert.alert('Error', 'Please select a package');
            return;
        }

        if (walletData && selectedPackage.variation_amount > walletData.balance) {
            Alert.alert('Insufficient Balance', 'Please fund your wallet to continue');
            return;
        }

        try {
            const result = await payBill({
                serviceID: selectedProvider.serviceID,
                billersCode: values.studentId,
                variation_code: selectedPackage.variation_code,
                amount: selectedPackage.variation_amount,
                phone: `+234${values.phone.substring(1)}`,
            }).unwrap();

            Alert.alert(
                'Payment Successful!',
                `${selectedPackage.name} payment completed successfully`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error: any) {
            Alert.alert(
                'Payment Failed',
                error.message || 'Something went wrong. Please try again.'
            );
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
                    <Text style={styles.headerTitle}>Education Services</Text>
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
                    initialValues={{ studentId: '', phone: '' }}
                    validationSchema={EducationSchema}
                    onSubmit={handlePayment}
                >
                    {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
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
                                    <FormControl isInvalid={touched.studentId && errors.studentId}>
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
                                            <Input
                                                flex={1}
                                                variant="unstyled"
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
                                                fontSize={TYPOGRAPHY.fontSizes.base}
                                                color={COLORS.textPrimary}
                                                _focus={{ borderWidth: 0 }}
                                            />
                                            {!selectedProvider.name.toLowerCase().includes('pin') && (
                                                <TouchableOpacity
                                                    style={styles.verifyButton}
                                                    onPress={() => handleVerifyCustomer(values.studentId)}
                                                    disabled={!selectedProvider || !values.studentId || isVerifying}
                                                >
                                                    {isVerifying ? (
                                                        <ActivityIndicator size="small" color={COLORS.primary} />
                                                    ) : (
                                                        <Text style={styles.verifyButtonText}>Verify</Text>
                                                    )}
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        {touched.studentId && errors.studentId && (
                                            <Text style={styles.errorText}>{errors.studentId}</Text>
                                        )}
                                    </FormControl>
                                </View>
                            )}

                            {/* Customer/Student Info */}
                            {customerInfo && (
                                <View style={styles.customerInfoCard}>
                                    <Text style={styles.customerInfoTitle}>Student Information</Text>
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
                                        <Input
                                            flex={1}
                                            variant="unstyled"
                                            placeholder="Search by service name or price..."
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
                            )}

                            {/* Payment Summary */}
                            {selectedProvider && selectedPackage && values.phone && (
                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryTitle}>Payment Summary</Text>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Service:</Text>
                                        <Text style={styles.summaryValue}>{selectedProvider.name}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>Package:</Text>
                                        <Text style={styles.summaryValue}>{selectedPackage.name}</Text>
                                    </View>
                                    <View style={styles.summaryRow}>
                                        <Text style={styles.summaryLabel}>
                                            {selectedProvider.name.toLowerCase().includes('pin') ? 'Reference:' : 'Student ID:'}
                                        </Text>
                                        <Text style={styles.summaryValue}>{values.studentId}</Text>
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
                                    (!selectedProvider || !selectedPackage || !values.phone || isLoading) && styles.paymentButtonDisabled
                                ]}
                                onPress={handleSubmit}
                                disabled={!selectedProvider || !selectedPackage || !values.phone || isLoading}
                            >
                                {isLoading ? (
                                    <View style={styles.loadingContainer}>
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
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.base,
        ...SHADOWS.sm,
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