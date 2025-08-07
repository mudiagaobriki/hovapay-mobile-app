// app/bills/international-airtime.tsx - International Airtime Screen
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Alert,
    TextInput,
    Modal,
    FlatList,
    Image,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
    useGetInternationalCountriesQuery,
    useGetInternationalOperatorsQuery,
    useGetInternationalProductsQuery,
    useGetExchangeRatesQuery,
    usePurchaseInternationalAirtimeMutation,
    useGetWalletBalanceQuery,
} from '@/store/api/enhancedBillsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

interface Country {
    code: string;
    name: string;
    dialingCode: string;
    flag?: string;
    region?: string;
}

interface Operator {
    operator_id: number; // Changed from id to operator_id to match VTPass API
    name: string;
    operator_image?: string; // Changed from logo to operator_image to match VTPass API
}

interface AirtimeProduct {
    code: string; // VTPass variation_code
    name: string;
    denomination: string;
    amount: number;
    currency: string;
    fixedPrice?: boolean;
    variationRate?: number;
    chargedAmount?: number;
}

const AirtimeSchema = Yup.object().shape({
    phoneNumber: Yup.string()
        .min(8, 'Phone number must be at least 8 digits')
        .max(15, 'Phone number must not exceed 15 digits')
        .required('Phone number is required'),
});

const popularCountries = [
    { code: 'US', name: 'United States', dialingCode: '+1', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', dialingCode: '+44', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', dialingCode: '+1', flag: '🇨🇦' },
    { code: 'GH', name: 'Ghana', dialingCode: '+233', flag: '🇬🇭' },
    { code: 'KE', name: 'Kenya', dialingCode: '+254', flag: '🇰🇪' },
    { code: 'ZA', name: 'South Africa', dialingCode: '+27', flag: '🇿🇦' },
];

export default function InternationalAirtimeScreen() {
    const router = useRouter();
    const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
    const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<AirtimeProduct | null>(null);

    // Modal states
    const [showCountrySearch, setShowCountrySearch] = useState(false);
    const [showOperatorSelect, setShowOperatorSelect] = useState(false);
    const [showProductSelect, setShowProductSelect] = useState(false);
    const [countrySearchKeyword, setCountrySearchKeyword] = useState('');

    // API queries
    const { data: countriesData, isLoading: countriesLoading, error: countriesError } = useGetInternationalCountriesQuery();
    const { data: operatorsData, isLoading: operatorsLoading } = useGetInternationalOperatorsQuery(
        `${selectedCountry?.code}?product_type_id=1`, // Add product_type_id parameter
        { skip: !selectedCountry }
    );
    const { data: productsData, isLoading: productsLoading } = useGetInternationalProductsQuery(
        `${selectedOperator?.operator_id}?product_type_id=1`, // Use operator_id and add product_type_id
        { skip: !selectedOperator }
    );
    const { data: exchangeRatesData } = useGetExchangeRatesQuery();
    const { data: walletData } = useGetWalletBalanceQuery();
    const [purchaseAirtime, { isLoading: purchasing }] = usePurchaseInternationalAirtimeMutation();

    // Debug logging
    React.useEffect(() => {
        console.log('Countries data structure:', {
            countriesData,
            countries: countriesData?.data?.countries?.countries,
            isArray: Array.isArray(countriesData?.data?.countries?.countries),
            type: typeof countriesData?.data?.countries?.countries,
            length: countriesData?.data?.countries?.countries?.length
        });

        if (countriesError) {
            console.error('Countries API error:', countriesError);
        }
    }, [countriesData, countriesError]);

    // Debug operators data
    React.useEffect(() => {
        if (operatorsData) {
            console.log('Operators data structure:', {
                operatorsData,
                operators: operatorsData?.data?.operators?.operators || operatorsData?.data?.operators,
                isArray: Array.isArray(operatorsData?.data?.operators?.operators || operatorsData?.data?.operators),
                length: (operatorsData?.data?.operators?.operators || operatorsData?.data?.operators)?.length
            });
        }
    }, [operatorsData]);

    // Debug products data
    React.useEffect(() => {
        if (productsData) {
            console.log('Products data structure:', {
                productsData,
                products: productsData?.data?.products?.products || productsData?.data?.products,
                isArray: Array.isArray(productsData?.data?.products?.products || productsData?.data?.products),
                length: (productsData?.data?.products?.products || productsData?.data?.products)?.length
            });
        }
    }, [productsData]);

    const countries = countriesData?.data?.countries?.countries || [];
    const operators = operatorsData?.data?.operators?.operators || operatorsData?.data?.operators || [];
    const products = productsData?.data?.products?.products || productsData?.data?.products || [];

    // Filter countries based on search - with safety check
    const filteredCountries = React.useMemo(() => {
        if (!Array.isArray(countries)) {
            console.warn('Countries data is not an array:', countries);
            return [];
        }

        if (!countrySearchKeyword.trim()) {
            return countries;
        }

        return countries.filter(country => {
            if (!country || typeof country !== 'object') {
                return false;
            }

            const name = country.name || '';
            const prefix = country.prefix || '';

            return name.toLowerCase().includes(countrySearchKeyword.toLowerCase()) ||
                prefix.includes(countrySearchKeyword);
        });
    }, [countries, countrySearchKeyword]);

    const formatCurrency = (amount: number, currency: string = 'NGN') => {
        if (currency === 'NGN') {
            return new Intl.NumberFormat('en-NG', {
                style: 'currency',
                currency: 'NGN',
                minimumFractionDigits: 0,
            }).format(amount);
        }
        return `${currency} ${amount.toFixed(2)}`;
    };

    const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string = 'NGN') => {
        if (fromCurrency === toCurrency) return amount;

        const rate = exchangeRatesData?.data?.[`${fromCurrency}_${toCurrency}`];
        return rate ? amount * rate : amount;
    };

    const getAmountInNaira = (product: AirtimeProduct) => {
        // For VTPass foreign airtime, if it's a fixed price product, use chargedAmount
        // If it's variable price, calculate using variation rate
        if (product.fixedPrice && product.chargedAmount) {
            return product.chargedAmount;
        } else if (product.variationRate) {
            return product.amount * product.variationRate;
        } else {
            // Fallback to currency conversion
            return convertCurrency(product.amount, product.currency, 'NGN');
        }
    };

    const handlePurchaseAirtime = async (values: { phoneNumber: string }) => {
        if (!selectedCountry || !selectedOperator || !selectedProduct) {
            Alert.alert('Error', 'Please select country, operator, and amount');
            return;
        }

        const nairaAmount = getAmountInNaira(selectedProduct);

        if (walletData && nairaAmount > walletData.data.balance) {
            const shortfall = nairaAmount - walletData.data.balance;
            Alert.alert(
                'Insufficient Balance',
                `You need ${formatCurrency(shortfall)} more to purchase this airtime.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Fund Wallet',
                        onPress: () => router.push('/(tabs)/wallet'),
                    }
                ]
            );
            return;
        }

        try {
            const purchaseData = {
                country: {
                    code: selectedCountry.code,
                    name: selectedCountry.name,
                    dialingCode: `+${selectedCountry.prefix}`, // Convert prefix to dialingCode
                    flag: selectedCountry.flag,
                    region: selectedCountry.region
                },
                operator: {
                    id: selectedOperator.operator_id, // Use operator_id
                    name: selectedOperator.name,
                    logo: selectedOperator.operator_image // Use operator_image
                },
                phoneNumber: `+${selectedCountry.prefix}${values.phoneNumber}`,
                amount: selectedProduct.amount,
                localCurrency: selectedProduct.currency,
                productCode: selectedProduct.code, // This is the variation_code
                denomination: selectedProduct.denomination,
                productName: selectedProduct.name,
                paymentMethod: 'wallet' as const,
            };

            const result = await purchaseAirtime(purchaseData).unwrap();

            Alert.alert(
                'Airtime Purchased Successfully!',
                `${selectedProduct.denomination} airtime has been sent to ${values.phoneNumber}`,
                [
                    {
                        text: 'View Receipt',
                        onPress: () => {
                            router.push({
                                pathname: '/bills/receipt',
                                params: {
                                    transactionRef: result.data.transactionRef,
                                    type: 'international_airtime',
                                    amount: nairaAmount.toString(),
                                    status: 'successful',
                                    serviceName: `${selectedCountry.name} - ${selectedOperator.name}`,
                                    phone: values.phoneNumber,
                                }
                            });
                        }
                    },
                    {
                        text: 'Buy More Airtime',
                        onPress: () => {
                            setSelectedProduct(null);
                        }
                    }
                ]
            );
        } catch (error: any) {
            console.error('Error purchasing airtime:', error);
            Alert.alert('Purchase Failed', error.data?.message || 'Something went wrong. Please try again.');
        }
    };

    const renderCountryCard = (country: Country, isPopular = false) => (
        <TouchableOpacity
            key={country.code}
            style={[
                isPopular ? styles.popularCountryCard : styles.countryCard,
                selectedCountry?.code === country.code && styles.countryCardSelected
            ]}
            onPress={() => {
                setSelectedCountry(country);
                setSelectedOperator(null);
                setSelectedProduct(null);
                if (showCountrySearch) {
                    setShowCountrySearch(false);
                    setCountrySearchKeyword('');
                }
            }}
        >
            {country.flag.startsWith('http') ? (
                <Image source={{ uri: country.flag }} style={styles.countryFlagImage} />
            ) : (
                <Text style={styles.countryFlag}>{country.flag}</Text>
            )}
            <View style={styles.countryDetails}>
                <Text style={styles.countryName} numberOfLines={1}>
                    {country.name}
                </Text>
                <Text style={styles.countryCode}>+{country.prefix}</Text>
            </View>
            {selectedCountry?.code === country.code && (
                <MaterialIcons name="check-circle" size={20} color={COLORS.primary} />
            )}
        </TouchableOpacity>
    );

    const renderOperator = (operator: Operator) => (
        <TouchableOpacity
            key={operator.operator_id} // Use operator_id instead of id
            style={[
                styles.operatorCard,
                selectedOperator?.operator_id === operator.operator_id && styles.operatorCardSelected
            ]}
            onPress={() => {
                setSelectedOperator(operator);
                setSelectedProduct(null);
                setShowOperatorSelect(false);
            }}
        >
            <View style={styles.operatorIcon}>
                {operator.operator_image ? (
                    <Image source={{ uri: operator.operator_image }} style={styles.operatorIconImage} />
                ) : (
                    <Text style={styles.operatorIconText}>
                        {operator.name.charAt(0)}
                    </Text>
                )}
            </View>
            <View style={styles.operatorDetails}>
                <Text style={styles.operatorName}>{operator.name}</Text>
                <Text style={styles.operatorType}>
                    Mobile Operator
                </Text>
            </View>
            {selectedOperator?.operator_id === operator.operator_id && (
                <MaterialIcons name="check-circle" size={20} color={COLORS.primary} />
            )}
        </TouchableOpacity>
    );

    const renderProduct = (product: AirtimeProduct) => (
        <TouchableOpacity
            key={product.code}
            style={[
                styles.productCard,
                selectedProduct?.code === product.code && styles.productCardSelected
            ]}
            onPress={() => {
                setSelectedProduct(product);
                setShowProductSelect(false);
            }}
        >
            <View style={styles.productDetails}>
                <Text style={styles.productDenomination}>{product.denomination}</Text>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productAmount}>
                    {formatCurrency(product.amount, product.currency)}
                </Text>
                <Text style={styles.productAmountNaira}>
                    ≈ {formatCurrency(getAmountInNaira(product))}
                </Text>
                {product.fixedPrice && (
                    <Text style={styles.productPriceType}>Fixed Price</Text>
                )}
                {!product.fixedPrice && product.variationRate && (
                    <Text style={styles.productPriceType}>Rate: {product.variationRate}x</Text>
                )}
            </View>
            {selectedProduct?.code === product.code && (
                <MaterialIcons name="check-circle" size={20} color={COLORS.primary} />
            )}
        </TouchableOpacity>
    );

    const CountrySearchModal = () => (
        <Modal
            visible={showCountrySearch}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowCountrySearch(false)}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Country</Text>
                    <TouchableOpacity
                        onPress={() => setShowCountrySearch(false)}
                        style={styles.modalCloseButton}
                    >
                        <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchInputContainer}>
                    <MaterialIcons name="search" size={20} color={COLORS.textTertiary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search countries..."
                        value={countrySearchKeyword}
                        onChangeText={setCountrySearchKeyword}
                        autoFocus
                    />
                </View>

                <FlatList
                    data={filteredCountries}
                    keyExtractor={(item) => item.code}
                    renderItem={({ item }) => renderCountryCard(item)}
                    showsVerticalScrollIndicator={false}
                />
            </SafeAreaView>
        </Modal>
    );

    const OperatorSelectModal = () => (
        <Modal
            visible={showOperatorSelect}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={() => setShowOperatorSelect(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.selectModal}>
                    <View style={styles.selectModalHeader}>
                        <Text style={styles.modalTitle}>Select Operator</Text>
                        <TouchableOpacity
                            onPress={() => setShowOperatorSelect(false)}
                            style={styles.modalCloseButton}
                        >
                            <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.selectModalContent}>
                        {operators.map(renderOperator)}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const ProductSelectModal = () => (
        <Modal
            visible={showProductSelect}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={() => setShowProductSelect(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.selectModal}>
                    <View style={styles.selectModalHeader}>
                        <Text style={styles.modalTitle}>Select Amount</Text>
                        <TouchableOpacity
                            onPress={() => setShowProductSelect(false)}
                            style={styles.modalCloseButton}
                        >
                            <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.selectModalContent}>
                        {products.map(renderProduct)}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={COLORS.textInverse} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>International Airtime</Text>
                    <View style={styles.placeholder} />
                </View>

                {walletData && (
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>Wallet Balance</Text>
                        <Text style={styles.balanceAmount}>
                            {formatCurrency(walletData.data.balance)}
                        </Text>
                    </View>
                )}
            </LinearGradient>

            <View style={styles.contentContainer}>
                <ScrollView style={styles.scrollContainer}>
                    {/* Popular Countries */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Popular Countries</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularCountriesContainer}>
                            {popularCountries.map(country => renderCountryCard(country, true))}
                        </ScrollView>
                    </View>

                    {/* Country Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Select Country</Text>
                        <TouchableOpacity
                            style={styles.selectionButton}
                            onPress={() => setShowCountrySearch(true)}
                        >
                            <MaterialIcons name="public" size={20} color={COLORS.textTertiary} />
                            <View style={styles.selectionDetails}>
                                <Text style={styles.selectionLabel}>Country</Text>
                                <Text style={styles.selectionValue}>
                                    {selectedCountry ?
                                        selectedCountry.flag.startsWith('http') ?
                                            `${selectedCountry.name}` :
                                            `${selectedCountry.flag} ${selectedCountry.name}`
                                        : 'Select country'}
                                </Text>
                            </View>
                            <MaterialIcons name="keyboard-arrow-right" size={20} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                    </View>

                    {/* Operator Selection */}
                    {selectedCountry && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Select Operator</Text>
                            <TouchableOpacity
                                style={styles.selectionButton}
                                onPress={() => setShowOperatorSelect(true)}
                            >
                                <MaterialIcons name="cell-tower" size={20} color={COLORS.textTertiary} />
                                <View style={styles.selectionDetails}>
                                    <Text style={styles.selectionLabel}>Mobile Operator</Text>
                                    <Text style={styles.selectionValue}>
                                        {selectedOperator ? selectedOperator.name : 'Select operator'}
                                    </Text>
                                </View>
                                <MaterialIcons name="keyboard-arrow-right" size={20} color={COLORS.textTertiary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Product Selection */}
                    {selectedOperator && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Select Amount</Text>
                            <TouchableOpacity
                                style={styles.selectionButton}
                                onPress={() => setShowProductSelect(true)}
                            >
                                <MaterialIcons name="attach-money" size={20} color={COLORS.textTertiary} />
                                <View style={styles.selectionDetails}>
                                    <Text style={styles.selectionLabel}>Airtime Amount</Text>
                                    <Text style={styles.selectionValue}>
                                        {selectedProduct ?
                                            `${selectedProduct.denomination} (≈ ${formatCurrency(getAmountInNaira(selectedProduct))})` :
                                            'Select amount'
                                        }
                                    </Text>
                                </View>
                                <MaterialIcons name="keyboard-arrow-right" size={20} color={COLORS.textTertiary} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Phone Number and Purchase */}
                    {selectedProduct && (
                        <Formik
                            initialValues={{ phoneNumber: '' }}
                            validationSchema={AirtimeSchema}
                            onSubmit={handlePurchaseAirtime}
                        >
                            {({ values, errors, touched, handleChange, handleBlur, handleSubmit }) => (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Recipient Details</Text>

                                    <View style={styles.phoneInputContainer}>
                                        <View style={styles.countryCodeContainer}>
                                            <Text style={styles.countryCodeText}>
                                                +{selectedCountry?.prefix}
                                            </Text>
                                        </View>
                                        <TextInput
                                            style={styles.phoneInput}
                                            placeholder="Phone number"
                                            value={values.phoneNumber}
                                            onChangeText={(text) => {
                                                // Remove any non-digit characters except +
                                                const cleaned = text.replace(/[^\d]/g, '');
                                                handleChange('phoneNumber')(cleaned);
                                            }}
                                            onBlur={handleBlur('phoneNumber')}
                                            keyboardType="phone-pad"
                                        />
                                    </View>
                                    {touched.phoneNumber && errors.phoneNumber && (
                                        <Text style={styles.errorText}>{errors.phoneNumber}</Text>
                                    )}

                                    {/* Purchase Summary */}
                                    <View style={styles.section}>
                                        <View style={styles.summaryCard}>
                                            <Text style={styles.summaryTitle}>Purchase Summary</Text>

                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Country:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {selectedCountry?.name}
                                                </Text>
                                            </View>

                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Operator:</Text>
                                                <Text style={styles.summaryValue}>{selectedOperator?.name}</Text>
                                            </View>

                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Amount:</Text>
                                                <Text style={styles.summaryValue}>{selectedProduct?.denomination}</Text>
                                            </View>

                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Phone:</Text>
                                                <Text style={styles.summaryValue}>
                                                    +{selectedCountry?.prefix}{values.phoneNumber}
                                                </Text>
                                            </View>

                                            <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                                                <Text style={styles.summaryLabelTotal}>Total:</Text>
                                                <Text style={styles.summaryValueTotal}>
                                                    {formatCurrency(getAmountInNaira(selectedProduct))}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* Purchase Button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.purchaseButton,
                                            (purchasing || !values.phoneNumber) && styles.purchaseButtonDisabled
                                        ]}
                                        onPress={() => handleSubmit()}
                                        disabled={purchasing || !values.phoneNumber}
                                    >
                                        <MaterialIcons name="send" size={24} color={COLORS.textInverse} />
                                        <Text style={styles.purchaseButtonText}>
                                            {purchasing ? 'Purchasing...' : `Purchase Airtime - ${formatCurrency(getAmountInNaira(selectedProduct))}`}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Formik>
                    )}

                    {/* Loading States */}
                    {countriesLoading && (
                        <View style={styles.loadingContainer}>
                            <Text>Loading countries...</Text>
                        </View>
                    )}

                    {countriesError && (
                        <View style={styles.errorContainer}>
                            <MaterialIcons name="error" size={48} color={COLORS.error} />
                            <Text style={styles.errorText}>Failed to load countries</Text>
                            <Text style={styles.errorSubtext}>Please check your internet connection and try again</Text>
                        </View>
                    )}

                    {!countriesLoading && !countriesError && countries.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="public" size={64} color={COLORS.textTertiary} />
                            <Text style={styles.emptyStateText}>No countries available</Text>
                        </View>
                    )}

                    {selectedCountry && operatorsLoading && (
                        <View style={styles.loadingContainer}>
                            <Text>Loading operators...</Text>
                        </View>
                    )}

                    {selectedOperator && productsLoading && (
                        <View style={styles.loadingContainer}>
                            <Text>Loading products...</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* Modals */}
            <CountrySearchModal />
            <OperatorSelectModal />
            <ProductSelectModal />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: SPACING.xl,
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
    contentContainer: {
        backgroundColor: COLORS.background,
        marginTop: -SPACING.base,
        paddingTop: SPACING.sm,
        flex: 1,
    },
    scrollContainer: {
        flex: 1,
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
    popularCountriesContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.base,
    },
    popularCountryCard: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        marginRight: SPACING.base,
        minWidth: 80,
        borderWidth: 2,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    countryCard: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    countryCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    countryFlag: {
        fontSize: 24,
        marginRight: SPACING.sm,
    },
    countryFlagImage: {
        width: 24,
        height: 16,
        marginRight: SPACING.sm,
        borderRadius: 2,
    },
    countryDetails: {
        flex: 1,
    },
    countryName: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    countryCode: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
    },
    selectionButton: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectionDetails: {
        marginLeft: SPACING.sm,
        flex: 1,
    },
    selectionLabel: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginBottom: 2,
    },
    selectionValue: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    operatorCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    operatorCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    operatorIcon: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.base,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    operatorIconImage: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.base,
    },
    operatorIconText: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
    },
    operatorDetails: {
        flex: 1,
    },
    operatorName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    operatorType: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
    },
    productCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    productCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    productDetails: {
        flex: 1,
    },
    productDenomination: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    productName: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    productAmount: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.primary,
    },
    productAmountNaira: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
        marginTop: 2,
    },
    productPriceType: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.primary,
        marginTop: 4,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    phoneInputContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    countryCodeContainer: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.base,
        justifyContent: 'center',
        minWidth: 80,
    },
    countryCodeText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textInverse,
        textAlign: 'center',
    },
    phoneInput: {
        flex: 1,
        padding: SPACING.base,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
    },
    errorText: {
        color: COLORS.error,
        fontSize: TYPOGRAPHY.fontSizes.sm,
        marginTop: SPACING.xs,
    },
    summaryCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginTop: SPACING.base,
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
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    summaryRowTotal: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        marginBottom: 0,
    },
    summaryLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
    },
    summaryValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    summaryLabelTotal: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
    },
    summaryValueTotal: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
    },
    purchaseButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    errorText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.error,
        marginTop: SPACING.base,
        textAlign: 'center',
    },
    errorSubtext: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.xs,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    emptyStateText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        marginTop: SPACING.base,
        textAlign: 'center',
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.xl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
    },
    modalCloseButton: {
        padding: SPACING.xs,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        margin: SPACING.xl,
        paddingHorizontal: SPACING.base,
    },
    searchInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        paddingVertical: SPACING.base,
        marginLeft: SPACING.sm,
    },
    selectModal: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        maxHeight: '70%',
    },
    selectModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.xl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    selectModalContent: {
        padding: SPACING.xl,
    },
});