// app/bills/sports-betting.tsx - Bet Wallet Funding Screen
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
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
    useGetSupportedBettingPlatformsQuery,
    useVerifyBettingAccountMutation,
    useFundBettingWalletMutation,
    useGetWalletBalanceQuery,
} from '@/store/api/betWalletApi'; // You'll need to create this API
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

interface BettingPlatform {
    id: string;
    name: string;
    logo: string;
    color: string;
    minAmount: number;
    maxAmount: number;
    fundingTypes: string[];
    website: string;
}

interface VerifiedAccount {
    accountName: string;
    accountId: string;
    platform: string;
    verified: boolean;
    minAmount: number;
    maxAmount: number;
}

const BetWalletSchema = Yup.object().shape({
    platform: Yup.string().required('Please select a betting platform'),
    accountIdentifier: Yup.string().required('Account username/email is required'),
    amount: Yup.number()
        .min(100, 'Minimum funding amount is ₦100')
        .max(500000, 'Maximum funding amount is ₦500,000')
        .required('Amount is required'),
    customerPhone: Yup.string().optional(),
});

const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

export default function BetWalletFundingScreen() {
    const router = useRouter();
    const [selectedPlatform, setSelectedPlatform] = useState<BettingPlatform | null>(null);
    const [verifiedAccount, setVerifiedAccount] = useState<VerifiedAccount | null>(null);
    const [showPlatformModal, setShowPlatformModal] = useState(false);
    const [fundingType, setFundingType] = useState<'instant' | 'voucher' | 'direct'>('instant');

    // API hooks
    const { data: platformsData, isLoading: platformsLoading } = useGetSupportedBettingPlatformsQuery();
    const { data: walletData } = useGetWalletBalanceQuery();
    const [verifyAccount, { isLoading: verifying }] = useVerifyBettingAccountMutation();
    const [fundWallet, { isLoading: funding }] = useFundBettingWalletMutation();

    const platforms = platformsData?.data || [];

    // Default platforms if API not available
    const defaultPlatforms: BettingPlatform[] = [
        {
            id: 'bet9ja',
            name: 'Bet9ja',
            logo: '🥇',
            color: '#006838',
            minAmount: 100,
            maxAmount: 500000,
            fundingTypes: ['instant', 'voucher'],
            website: 'https://bet9ja.com'
        },
        {
            id: 'sportybet',
            name: 'SportyBet',
            logo: '⚽',
            color: '#ff6b35',
            minAmount: 100,
            maxAmount: 200000,
            fundingTypes: ['instant', 'voucher'],
            website: 'https://sportybet.com'
        },
        {
            id: 'nairabet',
            name: 'NairaBet',
            logo: '🎯',
            color: '#1e3a8a',
            minAmount: 100,
            maxAmount: 1000000,
            fundingTypes: ['instant', 'direct'],
            website: 'https://nairabet.com'
        },
        {
            id: 'betway',
            name: 'Betway',
            logo: '🏆',
            color: '#00a859',
            minAmount: 100,
            maxAmount: 500000,
            fundingTypes: ['instant', 'voucher'],
            website: 'https://betway.com.ng'
        },
        {
            id: '1xbet',
            name: '1xBet',
            logo: '🎲',
            color: '#1f5582',
            minAmount: 100,
            maxAmount: 500000,
            fundingTypes: ['instant', 'direct'],
            website: 'https://1xbet.com.ng'
        },
        {
            id: 'betking',
            name: 'BetKing',
            logo: '👑',
            color: '#ff9500',
            minAmount: 100,
            maxAmount: 500000,
            fundingTypes: ['instant', 'voucher'],
            website: 'https://betking.com'
        }
    ];

    const availablePlatforms = platforms.length > 0 ? platforms : defaultPlatforms;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const handleVerifyAccount = async (accountIdentifier: string, customerPhone?: string) => {
        if (!selectedPlatform) return;

        try {
            const result = await verifyAccount({
                platform: selectedPlatform.id as any,
                accountIdentifier,
                customerPhone
            }).unwrap();

            if (result.success) {
                setVerifiedAccount(result.data);
                Alert.alert('Account Verified', `Account verified: ${result.data.accountName}`);
            } else {
                Alert.alert('Verification Failed', result.message || 'Could not verify account');
            }
        } catch (error: any) {
            console.error('Account verification error:', error);
            Alert.alert('Verification Error', error.data?.message || 'Account verification failed');
        }
    };

    const handleFundWallet = async (values: any) => {
        console.log('🚀 === FUND WALLET DEBUG START ===');
        console.log('🚀 handleFundWallet called with values:', JSON.stringify(values, null, 2));
        console.log('🚀 selectedPlatform:', selectedPlatform);
        console.log('🚀 verifiedAccount:', verifiedAccount);
        console.log('🚀 fundingType:', fundingType);
        console.log('🚀 walletData:', walletData);

        // STEP 1: Check required data
        if (!selectedPlatform) {
            console.log('❌ Missing selectedPlatform');
            Alert.alert('Error', 'Please select a platform first');
            return;
        }

        if (!verifiedAccount) {
            console.log('❌ Missing verifiedAccount');
            Alert.alert('Error', 'Please verify your account first');
            return;
        }

        console.log('✅ Platform and account verification passed');

        // STEP 2: Check wallet balance
        if (walletData && values.amount > walletData.data.balance) {
            console.log('❌ Insufficient wallet balance:', {
                requested: values.amount,
                available: walletData.data.balance,
                shortfall: values.amount - walletData.data.balance
            });
            const shortfall = values.amount - walletData.data.balance;
            Alert.alert(
                'Insufficient Balance',
                `You need ${formatCurrency(shortfall)} more to fund this betting wallet.`,
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

        console.log('✅ Wallet balance check passed');

        try {
            console.log('🛠️ Preparing funding data...');

            // STEP 3: Prepare funding data
            const fundingData = {
                platform: selectedPlatform.id as any,
                accountIdentifier: values.accountIdentifier,
                accountName: verifiedAccount.accountName,
                amount: Number(values.amount), // Ensure it's a number
                fundingType,
                paymentMethod: 'wallet' as const,
                customerPhone: values.customerPhone || '',
                description: `Fund ${selectedPlatform.name} wallet`
            };

            console.log('📤 Final funding data:', JSON.stringify(fundingData, null, 2));

            // STEP 4: Validate funding data
            if (!fundingData.platform) {
                throw new Error('Platform is required');
            }
            if (!fundingData.accountIdentifier) {
                throw new Error('Account identifier is required');
            }
            if (!fundingData.accountName) {
                throw new Error('Account name is required');
            }
            if (!fundingData.amount || fundingData.amount <= 0) {
                throw new Error('Valid amount is required');
            }

            console.log('✅ Funding data validation passed');

            // STEP 5: Show loading state
            console.log('🔄 Starting API call...');

            const result = await fundWallet(fundingData).unwrap();

            console.log('📥 === API RESPONSE RECEIVED ===');
            console.log('Response success:', result?.success);
            console.log('Response data:', JSON.stringify(result, null, 2));

            if (result && result.success) {
                console.log('✅ === FUNDING SUCCESSFUL ===');
                Alert.alert(
                    'Wallet Funded Successfully!',
                    `₦${values.amount.toLocaleString()} has been sent to your ${selectedPlatform.name} account.`,
                    [
                        {
                            text: 'View Receipt',
                            onPress: () => {
                                router.push({
                                    pathname: '/bills/receipt',
                                    params: {
                                        transactionRef: result.data?.transactionRef || 'unknown',
                                        type: 'bet_wallet_funding',
                                        amount: values.amount.toString(),
                                        status: 'successful',
                                    }
                                });
                            }
                        },
                        {
                            text: 'Fund Another',
                            onPress: () => {
                                setSelectedPlatform(null);
                                setVerifiedAccount(null);
                            }
                        }
                    ]
                );
            } else {
                console.log('❌ === FUNDING FAILED - SUCCESS FALSE ===');
                console.log('Failure message:', result?.message);
                Alert.alert('Funding Failed', result?.message || 'Transaction was not successful');
            }
        } catch (error: any) {
            console.log('💥 === FUNDING ERROR CAUGHT ===');
            console.error('Error type:', typeof error);
            console.error('Error name:', error?.name);
            console.error('Error message:', error?.message);
            console.error('Error status:', error?.status);
            console.error('Error data:', error?.data);
            console.error('Error originalStatus:', error?.originalStatus);
            console.error('Full error object:', JSON.stringify(error, null, 2));

            let errorMessage = 'Something went wrong. Please try again.';

            // Handle RTK Query errors
            if (error?.data) {
                if (typeof error.data === 'string') {
                    errorMessage = error.data;
                } else if (error.data?.message) {
                    errorMessage = error.data.message;
                } else if (error.data?.error) {
                    errorMessage = error.data.error;
                }
            } else if (error?.message) {
                errorMessage = error.message;
            }

            // Handle specific error types
            if (error?.status === 404) {
                errorMessage = 'Service not available. Please try again later.';
            } else if (error?.status === 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error?.originalStatus === 'FETCH_ERROR') {
                errorMessage = 'Network error. Please check your connection.';
            } else if (error?.originalStatus === 'PARSING_ERROR') {
                errorMessage = 'Response parsing error. Please try again.';
            } else if (error?.originalStatus === 'TIMEOUT_ERROR') {
                errorMessage = 'Request timeout. Please try again.';
            }

            console.log('🚨 Final error message:', errorMessage);

            Alert.alert('Funding Failed', errorMessage);
        }

        console.log('🚀 === FUND WALLET DEBUG END ===');
    };

    const PlatformModal = () => (
        <Modal
            visible={showPlatformModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowPlatformModal(false)}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Betting Platform</Text>
                    <TouchableOpacity
                        onPress={() => setShowPlatformModal(false)}
                        style={styles.closeButton}
                    >
                        <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.platformsList}>
                    {availablePlatforms.map((platform) => (
                        <TouchableOpacity
                            key={platform.id}
                            style={[
                                styles.platformCard,
                                selectedPlatform?.id === platform.id && styles.platformCardSelected
                            ]}
                            onPress={() => {
                                setSelectedPlatform(platform);
                                setVerifiedAccount(null);
                                setShowPlatformModal(false);
                            }}
                        >
                            <View style={styles.platformInfo}>
                                <Text style={styles.platformLogo}>{platform.logo}</Text>
                                <View style={styles.platformDetails}>
                                    <Text style={styles.platformName}>{platform.name}</Text>
                                    <Text style={styles.platformLimits}>
                                        Min: {formatCurrency(platform.minAmount)} • Max: {formatCurrency(platform.maxAmount)}
                                    </Text>
                                    <Text style={styles.platformFunding}>
                                        {platform.fundingTypes.join(', ')} funding
                                    </Text>
                                </View>
                            </View>
                            <MaterialIcons
                                name="chevron-right"
                                size={24}
                                color={COLORS.textSecondary}
                            />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
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
                    <Text style={styles.headerTitle}>Fund Betting Wallet</Text>
                    <View style={styles.placeholder} />
                </View>

                {walletData && (
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>Your Wallet Balance</Text>
                        <Text style={styles.balanceAmount}>
                            {formatCurrency(walletData.data.balance)}
                        </Text>
                    </View>
                )}
            </LinearGradient>

            <View style={styles.contentContainer}>
                <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>

                    {/* Platform Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>1. Select Betting Platform</Text>
                        <TouchableOpacity
                            style={styles.platformSelector}
                            onPress={() => setShowPlatformModal(true)}
                        >
                            {selectedPlatform ? (
                                <View style={styles.selectedPlatformInfo}>
                                    <Text style={styles.selectedPlatformLogo}>{selectedPlatform.logo}</Text>
                                    <View style={styles.selectedPlatformDetails}>
                                        <Text style={styles.selectedPlatformName}>{selectedPlatform.name}</Text>
                                        <Text style={styles.selectedPlatformLimits}>
                                            {formatCurrency(selectedPlatform.minAmount)} - {formatCurrency(selectedPlatform.maxAmount)}
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <Text style={styles.platformSelectorText}>Choose betting platform</Text>
                            )}
                            <MaterialIcons name="expand-more" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Account Verification */}
                    {selectedPlatform && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>2. Verify Your Account</Text>

                            <Formik
                                initialValues={{
                                    platform: selectedPlatform?.id || '',
                                    accountIdentifier: '',
                                    customerPhone: '',
                                    amount: 0
                                }}
                                validationSchema={BetWalletSchema}
                                enableReinitialize={true}
                                onSubmit={async (values, { setSubmitting, setFieldError }) => {
                                    console.log('📝 === FORM SUBMISSION START ===');
                                    console.log('📝 Form values:', JSON.stringify(values, null, 2));
                                    console.log('📝 Selected platform:', selectedPlatform);
                                    console.log('📝 Verified account:', verifiedAccount);
                                    console.log('📝 Funding type:', fundingType);

                                    // Validate that platform is selected
                                    if (!selectedPlatform) {
                                        console.log('❌ No platform selected in form submission');
                                        Alert.alert('Error', 'Please select a platform first');
                                        setSubmitting(false);
                                        return;
                                    }

                                    // Validate that account is verified
                                    if (!verifiedAccount) {
                                        console.log('❌ No verified account in form submission');
                                        Alert.alert('Error', 'Please verify your account first');
                                        setSubmitting(false);
                                        return;
                                    }

                                    // Validate amount
                                    if (!values.amount || values.amount <= 0) {
                                        console.log('❌ Invalid amount in form submission:', values.amount);
                                        setFieldError('amount', 'Please enter a valid amount');
                                        setSubmitting(false);
                                        return;
                                    }

                                    // Check minimum amount for platform
                                    if (values.amount < selectedPlatform.minAmount) {
                                        console.log('❌ Amount below platform minimum:', {
                                            amount: values.amount,
                                            minimum: selectedPlatform.minAmount
                                        });
                                        setFieldError('amount', `Minimum amount is ${formatCurrency(selectedPlatform.minAmount)}`);
                                        setSubmitting(false);
                                        return;
                                    }

                                    // Check maximum amount for platform
                                    if (values.amount > selectedPlatform.maxAmount) {
                                        console.log('❌ Amount above platform maximum:', {
                                            amount: values.amount,
                                            maximum: selectedPlatform.maxAmount
                                        });
                                        setFieldError('amount', `Maximum amount is ${formatCurrency(selectedPlatform.maxAmount)}`);
                                        setSubmitting(false);
                                        return;
                                    }

                                    console.log('✅ Form validation passed, calling handleFundWallet');

                                    setSubmitting(true);
                                    try {
                                        await handleFundWallet(values);
                                    } catch (error) {
                                        console.error('💥 Form submission error:', error);
                                        Alert.alert('Error', 'Form submission failed');
                                    } finally {
                                        setSubmitting(false);
                                    }

                                    console.log('📝 === FORM SUBMISSION END ===');
                                }}
                            >
                                {({ values, errors, touched, handleChange, handleBlur, setFieldValue, handleSubmit, isSubmitting, isValid }) => (
                                    <View>
                                        {/* Debug Info */}
                                        {__DEV__ && (
                                            <View style={{ padding: 10, backgroundColor: '#f0f0f0', margin: 10 }}>
                                                <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>
                                                    DEBUG: Valid={isValid ? 'YES' : 'NO'},
                                                    Submitting={isSubmitting ? 'YES' : 'NO'},
                                                    Amount={values.amount},
                                                    Platform={selectedPlatform?.name || 'NONE'},
                                                    Account={verifiedAccount?.accountName || 'NONE'}
                                                </Text>
                                                {Object.keys(errors).length > 0 && (
                                                    <Text style={{ fontSize: 12, color: 'red' }}>
                                                        Errors: {JSON.stringify(errors)}
                                                    </Text>
                                                )}
                                            </View>
                                        )}

                                        {/* Account Identifier Input */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>
                                                {selectedPlatform?.name || 'Platform'} Username/Email
                                            </Text>
                                            <TextInput
                                                style={[
                                                    styles.textInput,
                                                    touched.accountIdentifier && errors.accountIdentifier && styles.textInputError
                                                ]}
                                                placeholder={`Enter your ${selectedPlatform?.name || 'platform'} username or email`}
                                                value={values.accountIdentifier}
                                                onChangeText={handleChange('accountIdentifier')}
                                                onBlur={handleBlur('accountIdentifier')}
                                                autoCapitalize="none"
                                            />
                                            {touched.accountIdentifier && errors.accountIdentifier && (
                                                <Text style={styles.errorText}>{errors.accountIdentifier}</Text>
                                            )}
                                        </View>

                                        {/* Phone Number Input */}
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>
                                                Phone Number (Optional)
                                            </Text>
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="Enter phone number"
                                                value={values.customerPhone}
                                                onChangeText={handleChange('customerPhone')}
                                                onBlur={handleBlur('customerPhone')}
                                                keyboardType="phone-pad"
                                            />
                                        </View>

                                        {/* Verify Button */}
                                        {!verifiedAccount && values.accountIdentifier && (
                                            <TouchableOpacity
                                                style={[styles.verifyButton, verifying && styles.verifyButtonDisabled]}
                                                onPress={() => {
                                                    console.log('🔍 Verify button pressed');
                                                    handleVerifyAccount(values.accountIdentifier, values.customerPhone);
                                                }}
                                                disabled={verifying}
                                            >
                                                <MaterialIcons
                                                    name="verified-user"
                                                    size={20}
                                                    color={COLORS.textInverse}
                                                />
                                                <Text style={styles.verifyButtonText}>
                                                    {verifying ? 'Verifying...' : 'Verify Account'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}

                                        {/* Verified Account Display */}
                                        {verifiedAccount && (
                                            <View style={styles.verifiedAccount}>
                                                <MaterialIcons name="check-circle" size={24} color={COLORS.success} />
                                                <View style={styles.verifiedAccountInfo}>
                                                    <Text style={styles.verifiedAccountName}>{verifiedAccount.accountName}</Text>
                                                    <Text style={styles.verifiedAccountPlatform}>
                                                        {selectedPlatform?.name} Account Verified
                                                    </Text>
                                                </View>
                                            </View>
                                        )}

                                        {/* Rest of your form components... */}
                                        {/* Amount Selection and Fund Button */}
                                        {verifiedAccount && (
                                            <View style={styles.section}>
                                                <Text style={styles.sectionTitle}>4. Enter Amount</Text>

                                                {/* Custom Amount Input */}
                                                <TextInput
                                                    style={[
                                                        styles.amountInput,
                                                        touched.amount && errors.amount && styles.textInputError
                                                    ]}
                                                    placeholder={`Enter amount (${formatCurrency(selectedPlatform?.minAmount || 100)} - ${formatCurrency(selectedPlatform?.maxAmount || 500000)})`}
                                                    value={values.amount ? values.amount.toString() : ''}
                                                    onChangeText={(text) => {
                                                        console.log('💰 Amount input changed:', text);
                                                        const numericValue = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                                                        console.log('💰 Parsed numeric value:', numericValue);
                                                        setFieldValue('amount', numericValue);
                                                    }}
                                                    keyboardType="numeric"
                                                />
                                                {touched.amount && errors.amount && (
                                                    <Text style={styles.errorText}>{errors.amount}</Text>
                                                )}

                                                {/* Fund Wallet Button - ENHANCED DEBUG */}
                                                {values.amount >= (selectedPlatform?.minAmount || 100) && (
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.fundWalletButton,
                                                            (funding || isSubmitting || !isValid) && styles.fundWalletButtonDisabled
                                                        ]}
                                                        onPress={() => {
                                                            console.log('🔥 === FUND BUTTON PRESSED ===');
                                                            console.log('🔥 Current form values:', values);
                                                            console.log('🔥 Is submitting:', isSubmitting);
                                                            console.log('🔥 Is funding:', funding);
                                                            console.log('🔥 Is valid:', isValid);
                                                            console.log('🔥 Errors:', errors);
                                                            console.log('🔥 Selected platform:', selectedPlatform);
                                                            console.log('🔥 Verified account:', verifiedAccount);
                                                            console.log('🔥 About to call handleSubmit...');
                                                            handleSubmit();
                                                            console.log('🔥 handleSubmit called');
                                                        }}
                                                        disabled={funding || isSubmitting || !isValid}
                                                    >
                                                        <MaterialIcons
                                                            name="account-balance-wallet"
                                                            size={24}
                                                            color={COLORS.textInverse}
                                                        />
                                                        <Text style={styles.fundWalletButtonText}>
                                                            {(funding || isSubmitting) ? 'Processing...' : `Fund ${selectedPlatform?.name} Wallet`}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </Formik>
                        </View>
                    )}

                    {/* Popular Platforms */}
                    {!selectedPlatform && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Popular Betting Platforms</Text>
                            <View style={styles.popularPlatforms}>
                                {availablePlatforms.slice(0, 4).map((platform) => (
                                    <TouchableOpacity
                                        key={platform.id}
                                        style={styles.popularPlatformCard}
                                        onPress={() => {
                                            setSelectedPlatform(platform);
                                            setVerifiedAccount(null);
                                        }}
                                    >
                                        <Text style={styles.popularPlatformLogo}>{platform.logo}</Text>
                                        <Text style={styles.popularPlatformName}>{platform.name}</Text>
                                        <Text style={styles.popularPlatformMin}>
                                            Min: {formatCurrency(platform.minAmount)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Info Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>How It Works</Text>
                        <View style={styles.infoCards}>
                            <View style={styles.infoCard}>
                                <MaterialIcons name="sports-esports" size={24} color={COLORS.primary} />
                                <Text style={styles.infoTitle}>Choose Platform</Text>
                                <Text style={styles.infoDesc}>Select your favorite betting platform</Text>
                            </View>
                            <View style={styles.infoCard}>
                                <MaterialIcons name="verified-user" size={24} color={COLORS.primary} />
                                <Text style={styles.infoTitle}>Verify Account</Text>
                                <Text style={styles.infoDesc}>Confirm your betting account details</Text>
                            </View>
                            <View style={styles.infoCard}>
                                <MaterialIcons name="payment" size={24} color={COLORS.primary} />
                                <Text style={styles.infoTitle}>Fund Instantly</Text>
                                <Text style={styles.infoDesc}>Transfer funds from your wallet</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </View>

            <PlatformModal />
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
        width: 40,
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
    platformSelector: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectedPlatformInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectedPlatformLogo: {
        fontSize: 24,
        marginRight: SPACING.base,
    },
    selectedPlatformDetails: {
        flex: 1,
    },
    selectedPlatformName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    selectedPlatformLimits: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
    },
    platformSelectorText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
    },
    inputGroup: {
        marginBottom: SPACING.base,
    },
    inputLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    textInput: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
    },
    textInputError: {
        borderColor: COLORS.error,
    },
    errorText: {
        color: COLORS.error,
        fontSize: TYPOGRAPHY.fontSizes.sm,
        marginTop: SPACING.xs,
    },
    verifyButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.base,
    },
    verifyButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    verifyButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        marginLeft: SPACING.sm,
    },
    verifiedAccount: {
        backgroundColor: COLORS.successBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.base,
    },
    verifiedAccountInfo: {
        marginLeft: SPACING.base,
        flex: 1,
    },
    verifiedAccountName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    verifiedAccountPlatform: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.success,
        marginTop: 2,
    },
    fundingTypes: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    fundingTypeButton: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    fundingTypeButtonSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    fundingTypeText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    fundingTypeTextSelected: {
        color: COLORS.primary,
    },
    fundingTypeDesc: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    fundingTypeDescSelected: {
        color: COLORS.primary,
    },
    quickAmounts: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.base,
    },
    quickAmountButton: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.base,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        minWidth: (width - SPACING.xl * 2 - SPACING.sm * 2) / 3,
        alignItems: 'center',
    },
    quickAmountButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    quickAmountText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    quickAmountTextSelected: {
        color: COLORS.textInverse,
    },
    amountInput: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    fundingSummary: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginTop: SPACING.base,
        ...SHADOWS.sm,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    summaryRowFinal: {
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
    summaryLabelFinal: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    summaryValueFinal: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
    },
    fundWalletButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        ...SHADOWS.colored(COLORS.primary),
    },
    fundWalletButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    fundWalletButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
    },
    popularPlatforms: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.base,
    },
    popularPlatformCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        minWidth: (width - SPACING.xl * 2 - SPACING.base) / 2,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    popularPlatformLogo: {
        fontSize: 32,
        marginBottom: SPACING.sm,
    },
    popularPlatformName: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    popularPlatformMin: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
    },
    infoCards: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.base,
    },
    infoCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        minWidth: (width - SPACING.xl * 2 - SPACING.base * 2) / 3,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    infoTitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginTop: SPACING.sm,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    infoDesc: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
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
    closeButton: {
        padding: SPACING.xs,
    },
    platformsList: {
        flex: 1,
        padding: SPACING.xl,
    },
    platformCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: 'transparent',
        ...SHADOWS.sm,
    },
    platformCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    platformInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    platformLogo: {
        fontSize: 32,
        marginRight: SPACING.base,
    },
    platformDetails: {
        flex: 1,
    },
    platformName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    platformLimits: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    platformFunding: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.primary,
        textTransform: 'capitalize',
    },
});