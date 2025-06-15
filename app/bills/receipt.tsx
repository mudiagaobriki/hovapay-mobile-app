// app/bills/receipt.tsx - Enhanced Transaction Receipt Screen with PDF Download
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Share,
    Alert,
    ActivityIndicator,
    Platform,
    Linking,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetTransactionStatusQuery } from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { printToFileAsync } from 'expo-print';

interface ReceiptParams {
    transactionRef: string;
    type?: string;
    network?: string;
    phone?: string;
    amount?: string;
    status?: 'successful' | 'failed' | 'pending';
    errorMessage?: string;
    billersCode?: string;
    serviceName?: string;
}

export default function TransactionReceiptScreen() {
    const router = useRouter();
    const params = useLocalSearchParams() as unknown as ReceiptParams;
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Helper function to get service name
    const getServiceName = (serviceID: string, serviceType: string) => {
        const serviceNames: Record<string, string> = {
            'mtn': 'MTN Airtime',
            'airtel': 'Airtel Airtime',
            'glo': 'Glo Airtime',
            'etisalat': '9Mobile Airtime',
            '9mobile': '9Mobile Airtime',
            'mtn-data': 'MTN Data',
            'airtel-data': 'Airtel Data',
            'glo-data': 'Glo Data',
            'etisalat-data': '9Mobile Data',
            'dstv': 'DSTV Subscription',
            'gotv': 'GOtv Subscription',
            'startimes': 'StarTimes Subscription',
            'showmax': 'Showmax Subscription',
        };

        if (serviceNames[serviceID]) {
            return serviceNames[serviceID];
        }

        // Enhanced fallback for TV subscriptions
        if (serviceType === 'cable' || serviceType === 'tv-subscription') {
            if (params.serviceName) return params.serviceName;
            if (params.network) return `${params.network} Subscription`;
            return 'TV Subscription';
        }

        // Other fallbacks
        if (params.serviceName) return params.serviceName;
        if (params.network) return `${params.network} ${serviceType || 'Service'}`;

        return serviceType ? serviceType.charAt(0).toUpperCase() + serviceType.slice(1) : 'Service';
    };

    // Fetch real-time transaction status from API
    const {
        data: transactionData,
        isLoading,
        error,
        refetch
    } = useGetTransactionStatusQuery(params.transactionRef, {
        pollingInterval: 10000, // Poll every 10 seconds for pending transactions
        skip: !params.transactionRef,
    });

    // Use API data if available, otherwise fall back to params
    const transaction = transactionData?.data;
    const actualStatus = transaction?.status || params.status;
    const actualAmount = transaction?.amount || parseFloat(params.amount || '0');
    const actualPhone = transaction?.phone || params.phone;
    const actualService = getServiceName(transaction?.serviceID || '', transaction?.serviceType || params.type || '');
    const actualBillersCode = transaction?.billersCode || params.billersCode;

    console.log('Receipt data:', {
        transaction,
        actualStatus,
        params,
        isLoading
    });

    const formatCurrency = (amount: string | number) => {
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(numAmount);
    };

    const formatDate = (dateString?: string) => {
        const date = dateString ? new Date(dateString) : new Date();
        return date.toLocaleString('en-NG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Africa/Lagos'
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
            case 'successful':
                return COLORS.success;
            case 'failed':
                return COLORS.error;
            case 'pending':
                return COLORS.warning;
            default:
                return COLORS.textSecondary;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
            case 'successful':
                return 'check-circle';
            case 'failed':
                return 'cancel';
            case 'pending':
                return 'hourglass-empty';
            default:
                return 'info';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'completed':
            case 'successful':
                return 'Transaction Successful';
            case 'failed':
                return 'Transaction Failed';
            case 'pending':
                return 'Transaction Pending';
            default:
                return 'Unknown Status';
        }
    };

    const getErrorMessage = () => {
        if (params.errorMessage) return params.errorMessage;
        if (transaction?.responseData?.error) return transaction.responseData.error;
        if (transaction?.responseData?.response_description_text) return transaction.responseData.response_description_text;
        return 'Transaction could not be completed. Please try again.';
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refetch();
        } catch (error) {
            console.error('Error refreshing transaction status:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleShare = async () => {
        try {
            const shareText = `
Hovapay Transaction Receipt

${getStatusText(actualStatus)}
${actualStatus === 'failed' ? `\nReason: ${getErrorMessage()}` : ''}

Service: ${actualService}
${actualPhone ? `Phone: ${actualPhone}` : ''}
${actualBillersCode ? `Customer ID: ${actualBillersCode}` : ''}
Amount: ${formatCurrency(actualAmount)}
Transaction ID: ${params.transactionRef}
Date: ${formatDate(transaction?.createdAt)}

Powered by Hovapay
      `.trim();

            await Share.share({
                message: shareText,
                title: 'Transaction Receipt',
            });
        } catch (error) {
            console.error('Error sharing receipt:', error);
        }
    };

    const generatePDFHTML = () => {
        const statusColor = actualStatus === 'completed' || actualStatus === 'successful' ? '#28a745' :
            actualStatus === 'failed' ? '#dc3545' : '#ffc107';

        const statusText = getStatusText(actualStatus);
        const statusIcon = actualStatus === 'completed' || actualStatus === 'successful' ? '✓' :
            actualStatus === 'failed' ? '✗' : '⏳';

        return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Hovapay Transaction Receipt</title>
        <style>
            body {
                font-family: 'Helvetica', 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
                color: #333;
                line-height: 1.6;
            }
            .receipt-container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #0b3d6f 0%, #1a5490 100%);
                color: white;
                text-align: center;
                padding: 30px 20px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                margin-bottom: 8px;
            }
            .header-subtitle {
                font-size: 14px;
                opacity: 0.9;
            }
            .status-section {
                text-align: center;
                padding: 30px 20px;
                background: #f8f9fa;
            }
            .status-icon {
                display: inline-block;
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background-color: ${statusColor};
                color: white;
                font-size: 40px;
                line-height: 80px;
                margin-bottom: 15px;
            }
            .status-text {
                font-size: 24px;
                font-weight: bold;
                color: ${statusColor};
                margin-bottom: 10px;
            }
            .status-message {
                color: #666;
                font-size: 14px;
            }
            .receipt-details {
                padding: 30px;
            }
            .receipt-title {
                font-size: 20px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 30px;
                color: #333;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                border-bottom: 1px solid #eee;
            }
            .detail-row:last-child {
                border-bottom: none;
            }
            .detail-label {
                color: #666;
                font-weight: 500;
            }
            .detail-value {
                font-weight: 600;
                color: #333;
            }
            .detail-value.highlight {
                color: #0b3d6f;
                font-size: 18px;
            }
            .divider {
                height: 2px;
                background: linear-gradient(to right, #0b3d6f, #1a5490);
                margin: 20px 0;
                border-radius: 1px;
            }
            .error-section {
                background: #fff5f5;
                border: 1px solid #fed7d7;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
            }
            .error-title {
                color: #e53e3e;
                font-weight: bold;
                margin-bottom: 5px;
            }
            .error-message {
                color: #666;
                font-size: 14px;
            }
            .footer {
                text-align: center;
                padding: 30px;
                background: #f8f9fa;
                border-top: 1px solid #eee;
            }
            .footer-text {
                font-size: 16px;
                font-weight: bold;
                color: #333;
                margin-bottom: 5px;
            }
            .footer-subtext {
                font-size: 12px;
                color: #666;
            }
            .receipt-meta {
                text-align: center;
                padding: 15px;
                background: #0b3d6f;
                color: white;
                font-size: 12px;
            }
            @media print {
                body { margin: 0; padding: 0; background: white; }
                .receipt-container { box-shadow: none; }
            }
        </style>
    </head>
    <body>
        <div class="receipt-container">
            <!-- Header -->
            <div class="header">
                <div class="logo">HOVAPAY</div>
                <div class="header-subtitle">Digital Payment Solutions</div>
            </div>

            <!-- Status Section -->
            <div class="status-section">
                <div class="status-icon">${statusIcon}</div>
                <div class="status-text">${statusText}</div>
                <div class="status-message">
                    ${actualStatus === 'completed' || actualStatus === 'successful'
            ? 'Your transaction has been completed successfully!'
            : actualStatus === 'failed'
                ? 'Transaction could not be completed.'
                : 'Your transaction is being processed.'}
                </div>
            </div>

            <!-- Transaction Details -->
            <div class="receipt-details">
                <div class="receipt-title">Transaction Details</div>
                
                <div class="detail-row">
                    <span class="detail-label">Service</span>
                    <span class="detail-value">${actualService}</span>
                </div>
                
                ${actualPhone ? `
                <div class="detail-row">
                    <span class="detail-label">Phone Number</span>
                    <span class="detail-value">${"0" + actualPhone}</span>
                </div>
                ` : ''}
                
                ${actualBillersCode ? `
                <div class="detail-row">
                    <span class="detail-label">Customer ID</span>
                    <span class="detail-value">${actualBillersCode}</span>
                </div>
                ` : ''}
                
                <div class="detail-row">
                    <span class="detail-label">Amount</span>
                    <span class="detail-value highlight">${formatCurrency(actualAmount)}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Transaction ID</span>
                    <span class="detail-value">${params.transactionRef}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Date & Time</span>
                    <span class="detail-value">${formatDate(transaction?.createdAt)}</span>
                </div>
                
                <div class="divider"></div>
                
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value" style="color: ${statusColor};">${statusText}</span>
                </div>
                
                <div class="detail-row">
                    <span class="detail-label">Payment Method</span>
                    <span class="detail-value">Wallet</span>
                </div>

                ${transaction?.vtpassRef ? `
                <div class="detail-row">
                    <span class="detail-label">VTPass Reference</span>
                    <span class="detail-value">${transaction.vtpassRef}</span>
                </div>
                ` : ''}

                ${(actualStatus === 'failed') ? `
                <div class="error-section">
                    <div class="error-title">Reason for Failure:</div>
                    <div class="error-message">${getErrorMessage()}</div>
                    <div class="error-message" style="color: #28a745; margin-top: 10px;">
                        <strong>Your wallet has been refunded automatically.</strong>
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- Footer -->
            <div class="footer">
                <div class="footer-text">Thank you for using Hovapay!</div>
                <div class="footer-subtext">For support, contact us at support@hovapay.com</div>
            </div>

            <!-- Receipt Meta -->
            <div class="receipt-meta">
                Generated on ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} | 
                This is an electronically generated receipt.
            </div>
        </div>
    </body>
    </html>
    `;
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);

            // Generate PDF from HTML
            const htmlContent = generatePDFHTML();
            const { uri } = await printToFileAsync({
                html: htmlContent,
                base64: false,
                margins: {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 20,
                },
            });

            // Generate filename with transaction reference
            const fileName = `Hovapay_Receipt_${params.transactionRef}_${new Date().getTime()}.pdf`;

            if (Platform.OS === 'ios') {
                // iOS: Use sharing directly, as MediaLibrary requires specific asset types
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Save Receipt',
                        UTI: 'com.adobe.pdf', // iOS UTI for PDF
                    });

                    Alert.alert(
                        'Receipt Ready',
                        'Your receipt is ready to save or share.',
                        [
                            { text: 'OK', style: 'default' }
                        ]
                    );
                }
            } else {
                // Android: Use the corrected MediaLibrary approach
                try {
                    // Request media library permissions first
                    const { status } = await MediaLibrary.requestPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert(
                            'Permission Required',
                            'Please grant media library access to download the receipt.',
                            [{ text: 'OK' }]
                        );
                        return;
                    }

                    // Create file path in document directory first
                    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

                    // Copy the PDF to the document directory
                    await FileSystem.copyAsync({
                        from: uri,
                        to: fileUri,
                    });

                    // Create asset directly from the generated PDF uri (not the copied one)
                    const asset = await MediaLibrary.createAssetAsync(uri);

                    // Try to get Downloads album, create if it doesn't exist
                    let album = await MediaLibrary.getAlbumAsync('Download');
                    if (album == null) {
                        album = await MediaLibrary.createAlbumAsync('Download', asset, false);
                    } else {
                        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                    }

                    // Show success message with options
                    Alert.alert(
                        'Receipt Downloaded',
                        `Your receipt has been saved to Downloads as ${fileName}`,
                        [
                            {
                                text: 'Open',
                                onPress: async () => {
                                    if (await Sharing.isAvailableAsync()) {
                                        await Sharing.shareAsync(fileUri, {
                                            mimeType: 'application/pdf',
                                            dialogTitle: 'Open Receipt',
                                        });
                                    }
                                },
                            },
                            {
                                text: 'Share',
                                onPress: async () => {
                                    if (await Sharing.isAvailableAsync()) {
                                        await Sharing.shareAsync(fileUri, {
                                            mimeType: 'application/pdf',
                                            dialogTitle: 'Share Receipt',
                                        });
                                    }
                                },
                            },
                            { text: 'Done', style: 'default' },
                        ]
                    );

                } catch (mediaError) {
                    console.log('MediaLibrary failed, falling back to sharing:', mediaError);

                    // Fallback: Just use sharing if MediaLibrary fails
                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(uri, {
                            mimeType: 'application/pdf',
                            dialogTitle: 'Save or Share Receipt',
                        });

                        Alert.alert(
                            'Receipt Ready',
                            'Your receipt is ready to save or share.',
                            [{ text: 'OK' }]
                        );
                    } else {
                        throw new Error('Sharing not available');
                    }
                }
            }

        } catch (error) {
            console.error('Error downloading receipt:', error);

            let errorMessage = 'Failed to download receipt. Please try again.';

            if (error instanceof Error) {
                if (error.message.includes('permission')) {
                    errorMessage = 'Permission denied. Please allow file access and try again.';
                } else if (error.message.includes('space')) {
                    errorMessage = 'Not enough storage space. Please free up some space and try again.';
                } else if (error.message.includes('asset')) {
                    errorMessage = 'Could not save to gallery. You can still share the receipt.';
                }
            }

            Alert.alert('Download Failed', errorMessage, [
                {
                    text: 'Try Share Instead',
                    onPress: async () => {
                        try {
                            // Fallback to sharing
                            const htmlContent = generatePDFHTML();
                            const { uri } = await printToFileAsync({
                                html: htmlContent,
                                base64: false,
                            });

                            if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(uri, {
                                    mimeType: 'application/pdf',
                                    dialogTitle: 'Share Receipt',
                                });
                            }
                        } catch (shareError) {
                            console.error('Share fallback failed:', shareError);
                        }
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]);
        } finally {
            setIsDownloading(false);
        }
    };

    // Fixed handleRetry function for receipt.tsx
    const handleRetry = () => {
        console.log('=== RETRY NAVIGATION DEBUG ===');
        console.log('Transaction data:', transaction);
        console.log('Params:', params);
        console.log('Transaction serviceType:', transaction?.serviceType);
        console.log('Params type:', params.type);
        console.log('Transaction serviceID:', transaction?.serviceID);
        console.log('Params network:', params.network);

        // Define routes - using relative paths since we're within the bills stack
        const routes: Record<string, string> = {
            'airtime': './airtime',
            'data': './data',
            'cable': './tv-subscription',  // Backend uses 'cable' for TV subscriptions
            'tv-subscription': './tv-subscription',
            'electricity': './electricity',
            'utility': './electricity',
            'education': './education',  // Added education route mapping
            'insurance': './insurance',  // Added insurance route mapping
        };

        // Get service type from multiple sources
        let serviceType = transaction?.serviceType || params.type || 'airtime';

        console.log('Initial serviceType:', serviceType);

        // Enhanced service type detection based on serviceID
        if (transaction?.serviceID) {
            const serviceID = transaction.serviceID.toLowerCase();
            console.log('Checking serviceID:', serviceID);

            // Insurance services - check FIRST before other services
            if (serviceID.includes('insurance') || serviceID.includes('policy') ||
                ['life', 'health', 'auto', 'travel', 'property', 'business'].some(ins => serviceID.includes(ins)) ||
                serviceID.includes('premium') || serviceID.includes('coverage') ||
                serviceID.includes('insure')) {
                serviceType = 'insurance';
                console.log('Detected insurance service');
            }
            // Education services
            else if (['waec', 'jamb', 'neco', 'nabteb'].some(edu => serviceID.includes(edu)) ||
                serviceID.includes('education') || serviceID.includes('school') ||
                serviceID.includes('exam') || serviceID.includes('result')) {
                serviceType = 'education';
                console.log('Detected education service');
            }
            // TV/Cable services - your backend sets serviceType as 'cable' for TV
            else if (['dstv', 'gotv', 'startimes', 'showmax'].includes(serviceID) ||
                serviceID.includes('tv') || serviceID.includes('cable')) {
                serviceType = 'tv-subscription';
                console.log('Detected TV service, setting serviceType to tv-subscription');
            }
            // Data services
            else if (serviceID.includes('data')) {
                serviceType = 'data';
                console.log('Detected data service');
            }
            // Electricity services
            else if (serviceID.includes('elect') || serviceID.includes('power')) {
                serviceType = 'electricity';
                console.log('Detected electricity service');
            }
            // Airtime services
            else if (['mtn', 'airtel', 'glo', 'etisalat', '9mobile'].includes(serviceID) ||
                serviceID.includes('airtime')) {
                serviceType = 'airtime';
                console.log('Detected airtime service');
            }
        }

        // Also check params.network for additional context (fallback)
        if (params.network && !transaction?.serviceID) {
            const network = params.network.toLowerCase();
            console.log('Checking params.network:', network);

            if (['dstv', 'gotv', 'startimes'].includes(network)) {
                serviceType = 'tv-subscription';
                console.log('Detected TV from params.network');
            } else if (['waec', 'jamb', 'neco'].some(edu => network.includes(edu))) {
                serviceType = 'education';
                console.log('Detected education from params.network');
            } else if (network.includes('insure') || network.includes('insurance') || ['life', 'health', 'auto', 'travel', 'property', 'business'].some(ins => network.includes(ins))) {
                serviceType = 'insurance';
                console.log('Detected insurance from params.network');
            }
        }

        // Check params.type directly for insurance
        if (params.type === 'insurance') {
            serviceType = 'insurance';
            console.log('Detected insurance from params.type');
        }

        // Special handling for backend serviceType 'cable'
        if (serviceType === 'cable') {
            serviceType = 'tv-subscription';
            console.log('Converting cable to tv-subscription');
        }

        console.log('Final serviceType:', serviceType);

        const route = routes[serviceType] || './airtime';
        console.log('Selected route:', route);

        try {
            router.push({
                pathname: route as any,
                params: {
                    prefill: 'true',
                    serviceID: transaction?.serviceID || '',
                    phone: actualPhone || '',
                    amount: actualAmount.toString(),
                    billersCode: actualBillersCode || '',
                    network: params.network || '',
                    // Add more context for debugging
                    retryFrom: 'receipt',
                    originalServiceType: transaction?.serviceType || params.type,
                }
            });
            console.log('Navigation successful');
        } catch (error) {
            console.error('Navigation failed:', error);

            // Fallback navigation
            console.log('Attempting fallback navigation...');
            try {
                if (serviceType === 'education') {
                    router.push('/bills/education');
                } else if (serviceType === 'insurance') {
                    router.push('/bills/insurance');
                } else if (serviceType === 'tv-subscription') {
                    router.push('/bills/tv-subscription');
                } else if (serviceType === 'electricity') {
                    router.push('/bills/electricity');
                } else if (serviceType === 'data') {
                    router.push('/bills/data');
                } else {
                    router.push('/bills/airtime');
                }
            } catch (fallbackError) {
                console.error('Fallback navigation also failed:', fallbackError);
                // Last resort - go back to bills index
                router.push('/bills');
            }
        }

        console.log('=== END RETRY NAVIGATION DEBUG ===');
    };

    const ReceiptRow = ({ label, value, highlight = false }: {
        label: string;
        value: string;
        highlight?: boolean;
    }) => (
        <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>{label}</Text>
            <Text style={[
                styles.receiptValue,
                highlight && styles.receiptValueHighlight
            ]}>
                {value}
            </Text>
        </View>
    );

    if (isLoading && !transaction) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading transaction details...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error && !transaction) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error" size={64} color={COLORS.error} />
                    <Text style={styles.errorTitle}>Failed to load transaction</Text>
                    <Text style={styles.errorText}>Please check your internet connection and try again.</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

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
                    <Text style={styles.headerTitle}>Transaction Receipt</Text>
                    <TouchableOpacity
                        onPress={handleRefresh}
                        style={styles.shareButton}
                        disabled={isRefreshing}
                    >
                        {isRefreshing ? (
                            <ActivityIndicator size="small" color={COLORS.textInverse} />
                        ) : (
                            <MaterialIcons name="refresh" size={24} color={COLORS.textInverse} />
                        )}
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Main Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Status Section */}
                <View style={styles.statusSection}>
                    <View style={[
                        styles.statusIcon,
                        { backgroundColor: getStatusColor(actualStatus) }
                    ]}>
                        <MaterialIcons
                            name={getStatusIcon(actualStatus)}
                            size={48}
                            color={COLORS.textInverse}
                        />
                    </View>
                    <Text style={[
                        styles.statusText,
                        { color: getStatusColor(actualStatus) }
                    ]}>
                        {getStatusText(actualStatus)}
                    </Text>

                    {actualStatus === 'failed' && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorTitle}>Reason for Failure:</Text>
                            <Text style={styles.errorMessage}>{getErrorMessage()}</Text>
                            <Text style={styles.refundNotice}>
                                Your wallet has been refunded automatically.
                            </Text>
                        </View>
                    )}

                    {actualStatus === 'successful' || actualStatus === 'completed' && (
                        <Text style={styles.successMessage}>
                            Your transaction has been completed successfully!
                        </Text>
                    )}

                    {actualStatus === 'pending' && (
                        <View style={styles.pendingContainer}>
                            <Text style={styles.pendingMessage}>
                                Your transaction is being processed. You will receive an update shortly.
                            </Text>
                            <Text style={styles.pendingNote}>
                                This page will automatically update when the status changes.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Receipt Details */}
                <View style={styles.receiptCard}>
                    <Text style={styles.receiptTitle}>Transaction Details</Text>

                    <ReceiptRow
                        label="Service"
                        value={actualService}
                    />

                    {actualPhone && (
                        <ReceiptRow label="Phone Number" value={actualPhone} />
                    )}

                    {actualBillersCode && (
                        <ReceiptRow label="Customer ID" value={actualBillersCode} />
                    )}

                    <ReceiptRow
                        label="Amount"
                        value={formatCurrency(actualAmount)}
                        highlight={true}
                    />

                    <ReceiptRow label="Transaction ID" value={params.transactionRef} />

                    <ReceiptRow
                        label="Date & Time"
                        value={formatDate(transaction?.createdAt)}
                    />

                    <View style={styles.divider} />

                    <ReceiptRow
                        label="Status"
                        value={getStatusText(actualStatus)}
                    />

                    <ReceiptRow label="Payment Method" value="Wallet" />

                    {transaction?.vtpassRef && (
                        <ReceiptRow label="VTPass Reference" value={transaction.vtpassRef} />
                    )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    {(actualStatus === 'failed') && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.retryButton]}
                            onPress={handleRetry}
                        >
                            <MaterialIcons name="refresh" size={20} color={COLORS.textInverse} />
                            <Text style={styles.actionButtonText}>Try Again</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.actionButton, styles.downloadButton]}
                        onPress={handleDownload}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                                <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>
                                    Generating PDF...
                                </Text>
                            </>
                        ) : (
                            <>
                                <MaterialIcons name="download" size={20} color={COLORS.primary} />
                                <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>
                                    Download PDF
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.shareButtonAction]}
                        onPress={handleShare}
                    >
                        <MaterialIcons name="share" size={20} color={COLORS.textInverse} />
                        <Text style={styles.actionButtonText}>Share Receipt</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Thank you for using Hovapay!
                    </Text>
                    <Text style={styles.footerSubtext}>
                        For support, contact us at support@hovapay.com
                    </Text>
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
                <TouchableOpacity
                    style={styles.homeButton}
                    onPress={() => router.push('/(tabs)')}
                >
                    <MaterialIcons name="home" size={24} color={COLORS.textInverse} />
                    <Text style={styles.homeButtonText}>Back to Home</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: SPACING.base,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        backgroundColor: COLORS.background,
    },
    errorTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.error,
        marginTop: SPACING.base,
        marginBottom: SPACING.sm,
    },
    errorText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    retryButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.base,
        borderRadius: RADIUS.lg,
    },
    retryButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
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
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: SPACING.base,
    },
    shareButton: {
        padding: SPACING.xs,
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['2xl'],
        borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
        paddingTop: SPACING.xl,
    },
    statusSection: {
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    statusIcon: {
        width: 96,
        height: 96,
        borderRadius: RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.base,
        ...SHADOWS.lg,
    },
    statusText: {
        fontSize: TYPOGRAPHY.fontSizes['2xl'],
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        marginBottom: SPACING.base,
        textAlign: 'center',
    },
    successMessage: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    pendingContainer: {
        alignItems: 'center',
    },
    pendingMessage: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: SPACING.sm,
    },
    pendingNote: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    errorMessage: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: SPACING.sm,
    },
    refundNotice: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.success,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        textAlign: 'center',
    },
    receiptCard: {
        backgroundColor: COLORS.background,
        marginHorizontal: SPACING.xl,
        borderRadius: RADIUS.lg,
        padding: SPACING.xl,
        marginBottom: SPACING.xl,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    receiptTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xl,
        textAlign: 'center',
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    receiptLabel: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        flex: 1,
    },
    receiptValue: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'right',
    },
    receiptValueHighlight: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: SPACING.base,
    },
    actionButtons: {
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.base,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.base,
        minHeight: 48,
    },
    downloadButton: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    shareButtonAction: {
        backgroundColor: COLORS.secondary,
        ...SHADOWS.colored(COLORS.secondary),
    },
    actionButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
        color: COLORS.textInverse,
    },
    footer: {
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        marginHorizontal: SPACING.xl,
    },
    footerText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    footerSubtext: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    bottomActions: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.base,
        backgroundColor: COLORS.background,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    homeButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.base,
        borderRadius: RADIUS.lg,
        ...SHADOWS.colored(COLORS.primary),
    },
    homeButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
    },
});