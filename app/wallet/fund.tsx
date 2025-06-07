// app/wallet/fund.tsx - FIXED VERSION with Monnify support
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
    ActivityIndicator,
    Image,
    Clipboard,
    Share,
    Platform,
    Modal,
} from 'react-native';
import { Text, Input, FormControl } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { WebView } from 'react-native-webview';
import {
    useFundWalletMutation,
    useGetWalletBalanceQuery,
    useCreateVirtualAccountMutation,
    useGetVirtualAccountQuery,
    useVerifyPaymentMutation,
} from '@/store/api/billsApi';

// Import your theme - adjust path as needed
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

// ⚠️ CRITICAL: Add your actual server URL here
const SERVER_URL = 'http://192.168.148.122:3040'; // Replace with your actual server URL
const FRONTEND_URL = 'http://localhost:3000'; // Replace with your frontend URL

// Validation schema
const FundWalletSchema = Yup.object().shape({
    amount: Yup.number()
        .min(100, 'Minimum amount is ₦100')
        .max(1000000, 'Maximum amount is ₦1,000,000')
        .required('Amount is required'),
});

// Quick amount options
const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

// Payment gateway interface
interface PaymentGateway {
    id: 'paystack' | 'monnify' | 'virtual_account';
    name: string;
    description: string;
    logoUrl?: string;
    icon?: string;
    color: string;
    primaryColor: string;
    features: string[];
    processingTime: string;
    fees: string;
    type: 'instant' | 'transfer';
}

// Payment gateways configuration
const paymentGateways: PaymentGateway[] = [
    {
        id: 'paystack',
        name: 'Paystack',
        description: 'Pay instantly with cards, USSD, or transfer',
        logoUrl: 'https://res.cloudinary.com/dwyzq40iu/image/upload/v1748430825/paystack-logo-removebg-preview_c0y6oe.png',
        color: '#0FA958',
        primaryColor: '#011B33',
        features: ['Cards', 'Transfer', 'USSD'],
        processingTime: 'Instant',
        fees: 'Free',
        type: 'instant',
    },
    {
        id: 'monnify',
        name: 'Monnify',
        description: 'Secure payments with multiple options',
        logoUrl: 'https://res.cloudinary.com/dwyzq40iu/image/upload/v1748430337/monnify-logo-removebg-preview_iyghhy.png',
        color: '#182CD1',
        primaryColor: '#182CD1',
        features: ['Bank Transfer', 'Cards', 'Virtual Account'],
        processingTime: 'Instant',
        fees: 'Free',
        type: 'instant',
    },
    {
        id: 'virtual_account',
        name: 'Bank Transfer',
        description: 'Transfer from any bank to your dedicated account',
        icon: 'account-balance',
        color: '#6366F1',
        primaryColor: '#4F46E5',
        features: ['Any Bank', '24/7 Available', 'No Limits'],
        processingTime: 'Real-time',
        fees: 'Free',
        type: 'transfer',
    },
];

// Helper function for color opacity
const withOpacity = (color: string, opacity: number) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default function FundWalletScreen() {
    const router = useRouter();

    // State management
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>(paymentGateways[0]);
    const [showVirtualAccountDetails, setShowVirtualAccountDetails] = useState(false);
    const [showPaymentWebView, setShowPaymentWebView] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [verificationAttempts, setVerificationAttempts] = useState(0);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successAmount, setSuccessAmount] = useState(0);

    // API hooks
    const { data: walletData, refetch: refetchWallet, isLoading: balanceLoading } = useGetWalletBalanceQuery();
    const [fundWallet, { isLoading: isFunding }] = useFundWalletMutation();
    const [createVirtualAccount, { isLoading: isCreatingAccount }] = useCreateVirtualAccountMutation();
    const { data: virtualAccountData, refetch: refetchVirtualAccount } = useGetVirtualAccountQuery(undefined, {
        skip: selectedGateway?.id !== 'virtual_account',
    });
    const [verifyPayment, { isLoading: isVerifyingPayment }] = useVerifyPaymentMutation();

    // Auto-fetch virtual account when selected
    useEffect(() => {
        if (selectedGateway?.id === 'virtual_account') {
            refetchVirtualAccount();
        }
    }, [selectedGateway, refetchVirtualAccount]);

    // Currency formatter
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // [FIXED] Enhanced WebView navigation handler with better Monnify support
    const handleWebViewNavigationStateChange = async (navState: any) => {
        const { url, canGoBack, loading } = navState;
        console.log('WebView navigation:', { url, canGoBack, loading });

        // Handle different success/callback patterns for different gateways
        const isPaystackSuccess = url.includes('callback') || url.includes('success') || url.includes('trxref');
        const isMonnifySuccess = url.includes('status=success') || url.includes('paymentReference=') ||
            url.includes('monnify') && (url.includes('success') || url.includes('completed'));
        const isGeneralSuccess = url.includes('reference=') && (url.includes('success') || url.includes('completed'));

        // Handle cancellation patterns
        const isPaystackCancel = url.includes('cancel') || url.includes('paystack.com/close');
        const isMonnifyCancel = url.includes('status=cancelled') || url.includes('cancelled') ||
            url.includes('monnify') && url.includes('cancel');
        const isGeneralCancel = url.includes('cancel') || url.includes('cancelled');

        const isSuccessfulRedirect = isPaystackSuccess || isMonnifySuccess || isGeneralSuccess;
        const isCancellation = isPaystackCancel || isMonnifyCancel || isGeneralCancel;

        // Close WebView immediately on success or cancellation
        if (isSuccessfulRedirect || isCancellation) {
            console.log('Payment flow completed:', { isSuccessfulRedirect, isCancellation, gateway: selectedGateway?.id });
            setShowPaymentWebView(false);

            if (isSuccessfulRedirect) {
                try {
                    // Extract reference from URL - handle different gateway formats
                    let reference = paymentReference; // fallback to stored reference

                    if (selectedGateway?.id === 'paystack') {
                        const urlParams = new URLSearchParams(url.split('?')[1] || '');
                        reference = urlParams.get('reference') || urlParams.get('trxref') || paymentReference;
                    } else if (selectedGateway?.id === 'monnify') {
                        const urlParams = new URLSearchParams(url.split('?')[1] || '');
                        reference = urlParams.get('paymentReference') || urlParams.get('reference') || paymentReference;
                    }

                    console.log('Extracted payment reference:', reference);

                    if (reference) {
                        console.log('Verifying payment for reference:', reference);
                        const result = await verifyPayment(reference).unwrap();

                        if (result.success && result.data.status === 'success') {
                            await refetchWallet(); // Refresh wallet balance
                            setSuccessAmount(result.data.amount);
                            setShowSuccessModal(true);
                        } else {
                            throw new Error(result.message || 'Payment verification failed');
                        }
                    } else {
                        throw new Error('No payment reference found in callback URL');
                    }
                } catch (error: any) {
                    console.error('Payment verification error:', error);
                    Alert.alert(
                        'Payment Verification',
                        error.data?.message || error.message || 'Could not verify payment. Please check your wallet or contact support.',
                        [{ text: 'OK', onPress: () => router.replace('/(tabs)/') }]
                    );
                }
            } else if (isCancellation) {
                console.log('Payment cancelled by user');
                Alert.alert(
                    'Payment Cancelled',
                    'You cancelled the payment process.',
                    [{ text: 'OK', onPress: () => router.replace('/(tabs)/') }]
                );
            }
        }
    };

    // [FIXED] Enhanced WebView error handler
    const handleWebViewError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error:', nativeEvent);

        // Don't close WebView immediately on load errors - give it a chance to recover
        if (nativeEvent.code === -1004 || nativeEvent.description?.includes('Could not connect')) {
            console.log('Connection error detected, but keeping WebView open for potential recovery');
            // You could show a retry button or toast here instead of closing
            return;
        }

        // Only close on critical errors
        if (nativeEvent.code < -1000) {
            setShowPaymentWebView(false);
            Alert.alert(
                'Payment Error',
                'There was an error loading the payment page. Please try again.',
                [{ text: 'OK', onPress: () => router.replace('/(tabs)/') }]
            );
        }
    };

    // [FIXED] Enhanced WebView load handler
    const handleWebViewLoadEnd = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        console.log('WebView load end:', nativeEvent.url);
    };

    // Create virtual account
    const handleCreateVirtualAccount = async () => {
        try {
            console.log('Creating virtual account...');
            await createVirtualAccount({}).unwrap();
            await refetchVirtualAccount();
            setShowVirtualAccountDetails(true);
            Alert.alert(
                '🎉 Virtual Account Created!',
                'Your dedicated bank account has been created successfully.'
            );
        } catch (error: any) {
            console.error('Virtual account creation failed:', error);
            Alert.alert(
                'Account Creation Failed',
                error.data?.message || 'Unable to create virtual account. Please try again.'
            );
        }
    };

    // Copy to clipboard
    const copyToClipboard = async (text: string, label: string) => {
        await Clipboard.setString(text);
        Alert.alert('Copied!', `${label} copied to clipboard`);
    };

    // Share account details
    const shareAccountDetails = async () => {
        if (!virtualAccountData?.data) return;

        const { accountNumber, bankName, accountName } = virtualAccountData.data;
        const message = `💳 My Account Details\n\n🏦 Bank: ${bankName}\n📞 Account Number: ${accountNumber}\n👤 Account Name: ${accountName}`;

        try {
            await Share.share({ message });
        } catch (error) {
            console.log('Share error:', error);
        }
    };

    // Handle fund wallet
    const handleFundWallet = async (values: any) => {
        if (!selectedGateway) {
            Alert.alert('Error', 'Please select a payment method');
            return;
        }

        if (selectedGateway.id === 'virtual_account') {
            if (!virtualAccountData?.data) {
                Alert.alert(
                    'Create Virtual Account',
                    'You need to create a virtual account first.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Create Account', onPress: handleCreateVirtualAccount },
                    ]
                );
                return;
            }
            setShowVirtualAccountDetails(true);
            return;
        }

        try {
            console.log('=== FUNDING WALLET ===');
            setVerificationAttempts(0);

            const fundData = {
                amount: parseFloat(values.amount),
                gateway: selectedGateway.id,
                callbackUrl: `${SERVER_URL}/api/wallet/callback`,
                redirectUrl: `${FRONTEND_URL}/wallet/success`
            };

            console.log('Fund data:', fundData);

            const result = await fundWallet(fundData).unwrap();
            console.log('Fund wallet result:', result);

            if (result.success && (result.data.authorizationUrl || result.data.paymentUrl)) {
                setPaymentReference(result.data.reference);

                // [FIXED] Handle URL properly for different gateways
                let finalPaymentUrl = result.data.authorizationUrl || result.data.paymentUrl;

                // For Monnify, ensure URL is properly formatted
                if (selectedGateway.id === 'monnify' && finalPaymentUrl) {
                    // Decode URL if it's encoded
                    finalPaymentUrl = decodeURIComponent(finalPaymentUrl);
                    console.log('Monnify payment URL:', finalPaymentUrl);
                }

                setPaymentUrl(finalPaymentUrl);
                setShowPaymentWebView(true);
            } else {
                Alert.alert(
                    'Payment Initialization Failed',
                    result.message || 'Unable to initialize payment. Please try again.'
                );
            }
        } catch (error: any) {
            console.error('Fund wallet error:', error);
            Alert.alert(
                'Payment Failed',
                error.data?.message || error.message || 'Something went wrong. Please try again.'
            );
        }
    };

    // Handle success modal close
    const handleSuccessModalClose = () => {
        setShowSuccessModal(false);
        router.replace('/(tabs)/');
    };

    // Render functions (keeping original implementations)
    const renderQuickAmount = (amount: number, setFieldValue?: any) => (
        <TouchableOpacity
            key={amount}
            style={[
                styles.amountCard,
                selectedAmount === amount && styles.amountCardSelected
            ]}
            onPress={() => {
                setSelectedAmount(amount);
                if (setFieldValue) {
                    setFieldValue('amount', amount.toString());
                }
            }}
            activeOpacity={0.7}
        >
            <Text style={[
                styles.amountText,
                selectedAmount === amount && styles.amountTextSelected
            ]}>
                {formatCurrency(amount)}
            </Text>
        </TouchableOpacity>
    );

    const renderPaymentGateway = (gateway: PaymentGateway) => (
        <TouchableOpacity
            key={gateway.id}
            style={[
                styles.gatewayCard,
                selectedGateway?.id === gateway.id && [
                    styles.gatewayCardSelected,
                    { borderColor: gateway.primaryColor }
                ]
            ]}
            onPress={() => {
                setSelectedGateway(gateway);
                if (gateway.id !== 'virtual_account') {
                    setShowVirtualAccountDetails(false);
                }
            }}
            activeOpacity={0.7}
        >
            <View style={styles.selectionIndicator}>
                <View style={[
                    styles.radioButton,
                    selectedGateway?.id === gateway.id && [
                        styles.radioButtonSelected,
                        { backgroundColor: gateway.primaryColor }
                    ]
                ]}>
                    {selectedGateway?.id === gateway.id && (
                        <MaterialIcons name="check" size={12} color="#FFFFFF" />
                    )}
                </View>
            </View>

            <View style={styles.gatewayHeader}>
                <View style={styles.gatewayLogoContainer}>
                    {gateway.logoUrl ? (
                        <Image
                            source={{ uri: gateway.logoUrl }}
                            style={styles.gatewayLogo}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={[styles.gatewayIconContainer, { backgroundColor: withOpacity(gateway.color, 0.2) }]}>
                            <MaterialIcons name={gateway.icon as any} size={24} color={gateway.color} />
                        </View>
                    )}
                </View>

                <View style={styles.gatewayInfo}>
                    <View style={styles.gatewayTitleRow}>
                        <Text style={[
                            styles.gatewayName,
                            selectedGateway?.id === gateway.id && { color: gateway.primaryColor }
                        ]}>
                            {gateway.name}
                        </Text>
                        <View style={styles.badgesRow}>
                            <View style={[styles.processingBadge, { backgroundColor: withOpacity(gateway.color, 0.15) }]}>
                                <MaterialIcons
                                    name={gateway.type === 'instant' ? 'flash-on' : 'schedule'}
                                    size={10}
                                    color={gateway.color}
                                />
                                <Text style={[styles.processingText, { color: gateway.color }]}>
                                    {gateway.processingTime}
                                </Text>
                            </View>
                            <View style={styles.feesBadge}>
                                <Text style={styles.feesText}>{gateway.fees}</Text>
                            </View>
                        </View>
                    </View>
                    <Text style={styles.gatewayDescription}>{gateway.description}</Text>

                    <View style={styles.gatewayFeatures}>
                        {gateway.features.map((feature, index) => (
                            <View key={index} style={[
                                styles.featureTag,
                                { borderColor: withOpacity(gateway.primaryColor, 0.3) }
                            ]}>
                                <Text style={[styles.featureText, { color: gateway.primaryColor }]}>
                                    {feature}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    // [FIXED] Enhanced WebView with better error handling
    const renderPaymentWebView = () => (
        <Modal visible={showPaymentWebView} animationType="slide">
            <SafeAreaView style={styles.webViewContainer}>
                <View style={[styles.webViewHeader, { backgroundColor: selectedGateway?.primaryColor }]}>
                    <TouchableOpacity
                        onPress={() => {
                            setShowPaymentWebView(false);
                            Alert.alert('Payment Cancelled', 'You have cancelled the payment process.');
                            router.replace('/(tabs)/');
                        }}
                        style={styles.webViewCloseButton}
                    >
                        <MaterialIcons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.webViewTitle}>Complete Payment via {selectedGateway?.name}</Text>
                    {isVerifyingPayment && (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    )}
                </View>

                <WebView
                    source={{ uri: paymentUrl }}
                    style={styles.webView}
                    onNavigationStateChange={handleWebViewNavigationStateChange}
                    onError={handleWebViewError}
                    onLoadEnd={handleWebViewLoadEnd}
                    startInLoadingState
                    renderLoading={() => (
                        <View style={styles.webViewLoading}>
                            <ActivityIndicator size="large" color={selectedGateway?.primaryColor} />
                            <Text style={styles.loadingText}>Loading {selectedGateway?.name} payment page...</Text>
                        </View>
                    )}
                    // Enhanced WebView props for better stability
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                    mixedContentMode="compatibility"
                    onShouldStartLoadWithRequest={(request) => {
                        console.log('WebView should start load:', request.url);
                        return true;
                    }}
                />
            </SafeAreaView>
        </Modal>
    );

    const renderSuccessModal = () => (
        <Modal visible={showSuccessModal} transparent animationType="fade">
            <View style={styles.successOverlay}>
                <View style={styles.successCard}>
                    <View style={styles.successIconContainer}>
                        <MaterialIcons name="check-circle" size={80} color="#10B981" />
                    </View>
                    <Text style={styles.successTitle}>Payment Successful! 🎉</Text>
                    <Text style={styles.successMessage}>
                        {formatCurrency(successAmount)} has been added to your wallet
                    </Text>
                    <View style={styles.successBalanceInfo}>
                        <Text style={styles.successBalanceLabel}>New Wallet Balance</Text>
                        <Text style={styles.successBalanceAmount}>
                            {walletData?.data ? formatCurrency(walletData.data.balance) : '₦0.00'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.successButton}
                        onPress={handleSuccessModalClose}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.successButtonText}>Continue</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    const renderVirtualAccountDetails = () => {
        if (selectedGateway?.id !== 'virtual_account') return null;

        if (!virtualAccountData?.data) {
            return (
                <View style={styles.virtualAccountSetup}>
                    <View style={styles.setupHeader}>
                        <View style={styles.setupIconContainer}>
                            <MaterialIcons name="account-balance" size={48} color={COLORS.primary} />
                        </View>
                        <Text style={styles.setupTitle}>Get Your Dedicated Bank Account</Text>
                        <Text style={styles.setupDescription}>
                            Get a permanent bank account number that you can use to fund your wallet anytime.
                        </Text>
                    </View>

                    <View style={styles.setupBenefits}>
                        <View style={styles.benefit}>
                            <MaterialIcons name="check-circle" size={20} color="#10B981" />
                            <Text style={styles.benefitText}>Instant crediting to your wallet</Text>
                        </View>
                        <View style={styles.benefit}>
                            <MaterialIcons name="check-circle" size={20} color="#10B981" />
                            <Text style={styles.benefitText}>No transaction limits</Text>
                        </View>
                        <View style={styles.benefit}>
                            <MaterialIcons name="check-circle" size={20} color="#10B981" />
                            <Text style={styles.benefitText}>Available 24/7</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.createAccountButton}
                        onPress={handleCreateVirtualAccount}
                        disabled={isCreatingAccount}
                        activeOpacity={0.8}
                    >
                        {isCreatingAccount ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#FFFFFF" />
                                <Text style={styles.createAccountButtonText}>Creating Account...</Text>
                            </View>
                        ) : (
                            <View style={styles.buttonContent}>
                                <MaterialIcons name="add" size={20} color="#FFFFFF" />
                                <Text style={styles.createAccountButtonText}>Create Virtual Account</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            );
        }

        const { accountNumber, bankName, accountName } = virtualAccountData.data;

        return (
            <View style={styles.virtualAccountCard}>
                <View style={styles.accountHeader}>
                    <View style={styles.accountHeaderLeft}>
                        <View style={styles.accountIconContainer}>
                            <MaterialIcons name="account-balance" size={24} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.accountTitle}>Your Dedicated Account</Text>
                            <Text style={styles.accountSubtitle}>Transfer money instantly</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={shareAccountDetails} style={styles.shareButton}>
                        <MaterialIcons name="share" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.accountDetails}>
                    <View style={styles.accountField}>
                        <Text style={styles.fieldLabel}>Bank Name</Text>
                        <View style={styles.fieldValueContainer}>
                            <Text style={styles.fieldValue}>{bankName}</Text>
                            <TouchableOpacity onPress={() => copyToClipboard(bankName, 'Bank name')}>
                                <MaterialIcons name="content-copy" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.accountField}>
                        <Text style={styles.fieldLabel}>Account Number</Text>
                        <View style={styles.fieldValueContainer}>
                            <Text style={styles.fieldValuePrimary}>{accountNumber}</Text>
                            <TouchableOpacity onPress={() => copyToClipboard(accountNumber, 'Account number')}>
                                <MaterialIcons name="content-copy" size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.accountField}>
                        <Text style={styles.fieldLabel}>Account Name</Text>
                        <View style={styles.fieldValueContainer}>
                            <Text style={styles.fieldValue}>{accountName}</Text>
                            <TouchableOpacity onPress={() => copyToClipboard(accountName, 'Account name')}>
                                <MaterialIcons name="content-copy" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.virtualAccountActions}>
                    <TouchableOpacity
                        style={styles.virtualActionButton}
                        onPress={() => copyToClipboard(accountNumber, 'Account number')}
                    >
                        <MaterialIcons name="content-copy" size={16} color={COLORS.primary} />
                        <Text style={styles.virtualActionText}>Copy Account</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.virtualActionButton}
                        onPress={shareAccountDetails}
                    >
                        <MaterialIcons name="share" size={16} color={COLORS.primary} />
                        <Text style={styles.virtualActionText}>Share Details</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            <LinearGradient
                colors={[COLORS.primaryGradientStart || COLORS.primary, COLORS.primaryGradientEnd || COLORS.primary]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Fund Wallet</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    {balanceLoading ? (
                        <View style={styles.balanceLoading}>
                            <ActivityIndicator size="small" color="#FFFFFF" />
                            <Text style={styles.balanceLoadingText}>Loading...</Text>
                        </View>
                    ) : (
                        <Text style={styles.balanceAmount}>
                            {walletData?.data ? formatCurrency(walletData.data.balance) : '₦0.00'}
                        </Text>
                    )}
                </View>
            </LinearGradient>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <Formik
                    initialValues={{ amount: selectedAmount?.toString() || '' }}
                    validationSchema={FundWalletSchema}
                    onSubmit={handleFundWallet}
                    enableReinitialize
                >
                    {({ handleSubmit, values, errors, touched, setFieldValue }) => (
                        <>
                            <View style={styles.infoCard}>
                                <MaterialIcons name="info" size={24} color="#3B82F6" />
                                <View style={styles.infoContent}>
                                    <Text style={styles.infoTitle}>Safe & Secure</Text>
                                    <Text style={styles.infoText}>
                                        Your payment is secured with bank-level encryption
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Choose Payment Method</Text>
                                <Text style={styles.sectionSubtitle}>
                                    Select how you want to fund your wallet
                                </Text>
                                <View style={styles.gatewaysContainer}>
                                    {paymentGateways.map(renderPaymentGateway)}
                                </View>
                            </View>

                            {renderVirtualAccountDetails()}

                            {selectedGateway?.type === 'instant' && (
                                <>
                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Quick Amount</Text>
                                        <View style={styles.amountsGrid}>
                                            {quickAmounts.map(amount => renderQuickAmount(amount, setFieldValue))}
                                        </View>
                                    </View>

                                    <View style={styles.section}>
                                        <Text style={styles.sectionTitle}>Or Enter Amount</Text>
                                        <FormControl isInvalid={touched.amount && !!errors.amount}>
                                            <View style={[
                                                styles.inputContainer,
                                                touched.amount && errors.amount && styles.inputContainerError
                                            ]}>
                                                <Text style={styles.currencySymbol}>₦</Text>
                                                <Input
                                                    flex={1}
                                                    variant="unstyled"
                                                    placeholder="0"
                                                    placeholderTextColor="#9CA3AF"
                                                    value={values.amount}
                                                    onChangeText={(text) => {
                                                        setFieldValue('amount', text);
                                                        setSelectedAmount(null);
                                                    }}
                                                    keyboardType="numeric"
                                                    fontSize={18}
                                                    color="#1F2937"
                                                    fontWeight="600"
                                                />
                                            </View>
                                            {touched.amount && errors.amount && (
                                                <Text style={styles.errorText}>{errors.amount}</Text>
                                            )}
                                            <Text style={styles.amountInfo}>
                                                Minimum: ₦100 • Maximum: ₦1,000,000
                                            </Text>
                                        </FormControl>
                                    </View>

                                    <TouchableOpacity
                                        style={[
                                            styles.fundButton,
                                            { backgroundColor: selectedGateway?.primaryColor },
                                            (!values.amount || !selectedGateway || isFunding || !!errors.amount) && styles.fundButtonDisabled
                                        ]}
                                        onPress={() => handleSubmit()}
                                        disabled={!values.amount || !selectedGateway || isFunding || !!errors.amount}
                                        activeOpacity={0.8}
                                    >
                                        {isFunding ? (
                                            <View style={styles.loadingContainer}>
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                                <Text style={styles.fundButtonText}>Initializing Payment...</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.buttonContent}>
                                                <MaterialIcons
                                                    name={selectedGateway?.id === 'paystack' ? 'payment' : 'account-balance'}
                                                    size={20}
                                                    color="#FFFFFF"
                                                />
                                                <Text style={styles.fundButtonText}>
                                                    Pay {values.amount ? formatCurrency(Number(values.amount)) : '₦0'} via {selectedGateway?.name}
                                                </Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </>
                    )}
                </Formik>
                <View style={{ height: 80 }} />
            </ScrollView>

            {renderPaymentWebView()}
            {renderSuccessModal()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingTop: 16,
        paddingBottom: 24,
        paddingHorizontal: 24,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    placeholder: {
        width: 32,
    },
    balanceCard: {
        backgroundColor: withOpacity('#FFFFFF', 0.15),
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 14,
        color: withOpacity('#FFFFFF', 0.8),
        marginBottom: 8,
    },
    balanceAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    balanceLoading: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    balanceLoadingText: {
        fontSize: 16,
        color: '#FFFFFF',
        marginLeft: 12,
    },
    content: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -16,
        paddingTop: 24,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: withOpacity('#3B82F6', 0.1),
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: withOpacity('#3B82F6', 0.25),
    },
    infoContent: {
        marginLeft: 16,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#3B82F6',
        marginBottom: 4,
    },
    infoText: {
        fontSize: 14,
        color: '#6B7280',
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 16,
        lineHeight: 20,
    },
    gatewaysContainer: {
        gap: 12,
        marginBottom: 16,
    },
    gatewayCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        position: 'relative',
    },
    gatewayCardSelected: {
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    selectionIndicator: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 1,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioButtonSelected: {
        borderColor: 'transparent',
    },
    gatewayHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    gatewayLogoContainer: {
        marginRight: 16,
    },
    gatewayLogo: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
    },
    gatewayIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gatewayInfo: {
        flex: 1,
        paddingRight: 24,
    },
    gatewayTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    gatewayName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 8,
    },
    processingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    processingText: {
        fontSize: 10,
        fontWeight: '500',
        marginLeft: 2,
    },
    feesBadge: {
        backgroundColor: withOpacity('#10B981', 0.15),
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    feesText: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '500',
    },
    gatewayDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 12,
        lineHeight: 18,
    },
    gatewayFeatures: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    featureTag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
    },
    featureText: {
        fontSize: 12,
        fontWeight: '500',
    },
    virtualAccountSetup: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    setupHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    setupIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: withOpacity(COLORS.primary || '#3B82F6', 0.15),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    setupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    setupDescription: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 20,
    },
    setupBenefits: {
        marginBottom: 20,
    },
    benefit: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    benefitText: {
        fontSize: 14,
        color: '#6B7280',
        marginLeft: 12,
        fontWeight: '500',
    },
    createAccountButton: {
        backgroundColor: COLORS.primary || '#3B82F6',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
        shadowColor: COLORS.primary || '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    createAccountButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    virtualAccountCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: withOpacity(COLORS.primary || '#3B82F6', 0.2),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    accountHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    accountHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    accountIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: withOpacity(COLORS.primary || '#3B82F6', 0.15),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    accountTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary || '#3B82F6',
        marginBottom: 2,
    },
    accountSubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    shareButton: {
        padding: 8,
        backgroundColor: withOpacity(COLORS.primary || '#3B82F6', 0.1),
        borderRadius: 8,
    },
    accountDetails: {
        marginBottom: 20,
    },
    accountField: {
        marginBottom: 16,
    },
    fieldLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    fieldValueContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    fieldValue: {
        fontSize: 16,
        color: '#1F2937',
        fontWeight: '500',
        flex: 1,
    },
    fieldValuePrimary: {
        fontSize: 18,
        color: COLORS.primary || '#3B82F6',
        fontWeight: 'bold',
        flex: 1,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    virtualAccountActions: {
        flexDirection: 'row',
        gap: 12,
    },
    virtualActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withOpacity(COLORS.primary || '#3B82F6', 0.1),
        borderRadius: 8,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: withOpacity(COLORS.primary || '#3B82F6', 0.3),
    },
    virtualActionText: {
        fontSize: 14,
        color: COLORS.primary || '#3B82F6',
        fontWeight: '500',
        marginLeft: 8,
    },
    amountsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    amountCard: {
        width: (width - 48 - 16) / 3,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
    },
    amountCardSelected: {
        backgroundColor: COLORS.primary || '#3B82F6',
        borderColor: COLORS.primary || '#3B82F6',
    },
    amountText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    amountTextSelected: {
        color: '#FFFFFF',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 64,
    },
    inputContainerError: {
        borderColor: '#EF4444',
        backgroundColor: withOpacity('#EF4444', 0.05),
    },
    currencySymbol: {
        fontSize: 18,
        fontWeight: '600',
        color: '#6B7280',
        marginRight: 12,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 8,
        fontWeight: '500',
    },
    amountInfo: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 8,
        textAlign: 'center',
    },
    fundButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 24,
        marginBottom: 24,
        minHeight: 56,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
    },
    fundButtonDisabled: {
        opacity: 0.6,
    },
    fundButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    webViewContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    webViewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    webViewCloseButton: {
        padding: 12,
    },
    webViewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
        flex: 1,
        textAlign: 'center',
    },
    webView: {
        flex: 1,
    },
    webViewLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    loadingText: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 16,
    },
    successOverlay: {
        flex: 1,
        backgroundColor: withOpacity('#000000', 0.8),
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    successCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
    },
    successIconContainer: {
        marginBottom: 20,
    },
    successTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 8,
    },
    successMessage: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    successBalanceInfo: {
        backgroundColor: withOpacity('#10B981', 0.1),
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: withOpacity('#10B981', 0.3),
    },
    successBalanceLabel: {
        fontSize: 14,
        color: '#10B981',
        fontWeight: '500',
        marginBottom: 4,
    },
    successBalanceAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#10B981',
    },
    successButton: {
        backgroundColor: COLORS.primary || '#3B82F6',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        width: '100%',
        alignItems: 'center',
    },
    successButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});