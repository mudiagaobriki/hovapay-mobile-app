// app/bills/receipt.tsx - Enhanced Transaction Receipt Screen with Live Status
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
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useGetTransactionStatusQuery } from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

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
            'startimes': 'Startimes Subscription',
        };

        if (serviceNames[serviceID]) {
            return serviceNames[serviceID];
        }

        // Fallback to params or formatted service type
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

    const handleDownload = () => {
        Alert.alert(
            'Download Receipt',
            'PDF download feature will be available soon.',
            [{ text: 'OK' }]
        );
    };

    const handleRetry = () => {
        // Navigate back to the appropriate service screen
        const routes: Record<string, string> = {
            'airtime': '/bills/airtime',
            'data': '/bills/data',
            'cable': '/bills/cable',
            'electricity': '/bills/electricity',
        };

        const serviceType = transaction?.serviceType || params.type || 'airtime';
        const route = routes[serviceType] || '/bills/airtime';

        router.push({
            pathname: route as any,
            params: {
                prefill: 'true',
                serviceID: transaction?.serviceID || '',
                phone: actualPhone || '',
                amount: actualAmount.toString(),
                billersCode: actualBillersCode || '',
            }
        });
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
                        <ReceiptRow label="Phone Number" value={`0${actualPhone}`} />
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
                    >
                        <MaterialIcons name="download" size={20} color={COLORS.primary} />
                        <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>
                            Download PDF
                        </Text>
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