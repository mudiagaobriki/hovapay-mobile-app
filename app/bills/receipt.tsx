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
                color: #0b3d6f;
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

    // Replace the existing generatePDFHTML function in your receipt.tsx with this enhanced version
    const generateProfessionalPDFHTML = () => {
        // Use the exact primary colors from your theme
        const primaryColor = '#1F2937'; // COLORS.primary from your theme
        const primaryGradientStart = '#1F2937';
        const primaryGradientEnd = '#374151';

        const statusColor = actualStatus === 'completed' || actualStatus === 'successful' ? '#059669' :
            actualStatus === 'failed' ? '#DC2626' : '#F59E0B';

        const statusBgColor = actualStatus === 'completed' || actualStatus === 'successful' ? '#ECFDF5' :
            actualStatus === 'failed' ? '#FEF2F2' : '#FFFBEB';

        const statusText = getStatusText(actualStatus);
        const statusIcon = actualStatus === 'completed' || actualStatus === 'successful' ? '✓' :
            actualStatus === 'failed' ? '✗' : '⏳';

        const currentDate = new Date().toLocaleString('en-NG', {
            timeZone: 'Africa/Lagos',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });

        // Service logo mapping with actual CDN URLs
        const getServiceLogo = (serviceName) => {
            const name = serviceName.toLowerCase();

            // Map service names to their actual logo URLs
            const logoMap = {
                'mtn': 'https://sandbox.vtpass.com/resources/products/200X200/MTN-Airtime.jpg',
                'airtel': 'https://sandbox.vtpass.com/resources/products/200X200/Airtel-Airtime.jpg',
                'glo': 'https://sandbox.vtpass.com/resources/products/200X200/GLO-Airtime.jpg',
                'etisalat': 'https://sandbox.vtpass.com/resources/products/200X200/9mobile-Airtime.jpg',
                '9mobile': 'https://sandbox.vtpass.com/resources/products/200X200/9mobile-Airtime.jpg',
                "foreign-airtime": "https://sandbox.vtpass.com/resources/products/200X200/Foreign-Airtime.jpg",

                // Data services
                'mtn-data': 'https://sandbox.vtpass.com/resources/products/200X200/MTN-Data.jpg',
                'airtel-data': 'https://sandbox.vtpass.com/resources/products/200X200/Airtel-Data.jpg',
                'glo-data': 'https://sandbox.vtpass.com/resources/products/200X200/GLO-Data.jpg',
                'glo-sme-data': 'https://sandbox.vtpass.com/resources/products/200X200/GLO-Data.jpg',
                'etisalat-data': 'https://sandbox.vtpass.com/resources/products/200X200/9mobile-Data.jpg',
                '9mobile-data': 'https://sandbox.vtpass.com/resources/products/200X200/9mobile-Data.jpg',
                "smile-direct": "https://sandbox.vtpass.com/resources/products/200X200/Smile-Payment.jpg",
                "spectranet": "https://sandbox.vtpass.com/resources/products/200X200/Spectranet.jpg",

                // TV Subscriptions
                'dstv': 'https://sandbox.vtpass.com/resources/products/200X200/Pay-DSTV-Subscription.jpg',
                'gotv': 'https://sandbox.vtpass.com/resources/products/200X200/Gotv-Payment.jpg',
                'startimes': 'https://sandbox.vtpass.com/resources/products/200X200/Startimes-Subscription.jpg',
                'showmax': 'https://sandbox.vtpass.com/resources/products/200X200/ShowMax.jpg',

                // Electricity
                'ikeja-electric': 'https://sandbox.vtpass.com/resources/products/200X200/Ikeja-Electric-Payment-PHCN.jpg',
                'eko-electric': 'https://sandbox.vtpass.com/resources/products/200X200/Eko-Electric-Payment-PHCN.jpg',
                'abuja-electric': 'https://sandbox.vtpass.com/resources/products/200X200/Abuja-Electric.jpg',
                'kano-electric': 'https://sandbox.vtpass.com/resources/products/200X200/Kano-Electric.jpg',
                'portharcourt-electric': 'https://sandbox.vtpass.com/resources/products/200X200/Port-Harcourt-Electric.jpg',
                'jos-electric': 'https://sandbox.vtpass.com/resources/products/200X200/Jos-Electric-JED.jpg',
                'kaduna-electric': 'https://sandbox.vtpass.com/resources/products/200X200/Kaduna-Electric-KAEDCO.jpg',
                'enugu-electric': 'https://sandbox.vtpass.com/resources/products/200X200/Enugu-Electric-EEDC.jpg',
                'ibadan-electric': 'https://sandbox.vtpass.com/resources/products/200X200/IBEDC-Ibadan-Electricity-Distribution-Company.jpg',
                'benin-electric': 'https://sandbox.vtpass.com/resources/products/200X200/Benin-Electricity-BEDC.jpg',
                'aba-electric': 'https://sandbox.vtpass.com/resources/products/200X200/Aba-Electric-Payment-ABEDC.jpg',
                'yola-electric': 'https://sandbox.vtpass.com/resources/products/200X200/Yola-Electric-Payment-IKEDC.jpg',

                // Education
                'waec': 'https://sandbox.vtpass.com/resources/products/200X200/WAEC-Result-Checker-PIN.jpg',
                'waec-registration': 'https://sandbox.vtpass.com/resources/products/200X200/WAEC-Registration-PIN.jpg',
                'jamb': 'https://sandbox.vtpass.com/resources/products/200X200/JAMB-PIN-VENDING-(UTME-&-Direct-Entry).jpg',

                // Insurance
                'ui-insure': "https://sandbox.vtpass.com/resources/products/200X200/Third-Party-Motor-Insurance-Universal-Insurance.jpg",

                // Other Services
                'sms-clone': 'https://sandbox.vtpass.com/resources/products/200X200/SMSclone.com.jpg',
            };

            // Try to match the service name to a logo
            for (const [key, logoUrl] of Object.entries(logoMap)) {
                if (name.includes(key)) {
                    return logoUrl;
                }
            }

            // Fallback to a generic payment icon if no match found
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiMxRjI5MzciLz4KPHN2ZyB4PSIxNSIgeT0iMTUiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHA+PHBhdGggZD0iTTIxIDRINGMtMS4xIDAtMiAuOS0yIDJ2NGMwIDEuMS45IDIgMiAyaDE3YzEuMSAwIDItLjkgMi0yVjZjMC0xLjEtLjktMi0yLTJ6IiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik0yMSAxMkg0Yy0xLjEgMC0yIC45LTIgMnY0YzAgMS4xLjkgMiAyIDJoMTdjMS4xIDAgMi0uOSAyLTJWMTRjMC0xLjEtLjktMi0yLTJ6IiBmaWxsPSIjRkZGRkZGIi8+Cjwvc3ZnPgo8L3N2Zz4K';
        };

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hovapay Transaction Receipt</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #F9FAFB;
            color: #111827;
            line-height: 1.6;
            padding: 0;
            margin: 0;
            width: 100%;
        }

        .receipt-container {
            width: 100%;
            max-width: 100%;
            margin: 0;
            background: #FFFFFF;
            position: relative;
            min-height: 100vh;
        }

        /* Full-Width Header with Dual Logos */
        .header {
            background: linear-gradient(135deg, ${primaryGradientStart} 0%, ${primaryGradientEnd} 50%, ${primaryGradientStart} 100%);
            padding: 40px 50px 30px;
            position: relative;
            overflow: hidden;
            width: 100%;
        }

        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%);
            pointer-events: none;
        }

        .header-logos {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            position: relative;
            z-index: 2;
        }

        .hovapay-logo {
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(10px);
            padding: 15px 25px;
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.2);
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .hovapay-logo-icon {
            width: 40px;
            height: 40px;
            background: #FFFFFF;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: ${primaryColor};
            font-size: 18px;
        }

        .hovapay-logo h1 {
            font-size: 26px;
            font-weight: 800;
            color: #FFFFFF;
            letter-spacing: -0.5px;
            margin: 0;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .service-logo-container {
            background: rgba(255,255,255,0.95);
            width: 80px;
            height: 80px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            /* box-shadow: 0 8px 16px rgba(0,0,0,0.15); */ /* Shadow removed as requested */
            border: 3px solid rgba(255,255,255,0.4);
            overflow: hidden;
        }

        .service-logo-container img {
            width: 60px;
            height: 60px;
            object-fit: contain;
        }
        
        .hovapay-logo-img{
            width: auto;
            height: 120px;
            object-fit: contain;
        }

        .header-content {
            text-align: center;
            position: relative;
            z-index: 2;
        }

        .receipt-title {
            font-size: 20px;
            color: #0b3d6f;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }

        .receipt-number {
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(10px);
            padding: 10px 25px;
            border-radius: 25px;
            font-size: 16px;
            color: #FFFFFF;
            font-weight: 700;
            display: inline-block;
            border: 1px solid rgba(255,255,255,0.2);
        }

        /* Full-Width Transaction Details Table */
        .details-section {
            padding: 80px 50px 50px 50px; /* Increased top padding */
            width: 100%;
        }

        .section-title {
            font-size: 24px;
            font-weight: 800;
            color: ${primaryColor};
            margin-bottom: 30px;
            text-align: center;
            position: relative;
        }

        .section-title::after {
            content: '';
            position: absolute;
            bottom: -12px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: 4px;
            background: linear-gradient(90deg, ${primaryColor}, ${primaryColor}80);
            border-radius: 2px;
        }

        .details-table {
            width: 100%;
            border-collapse: collapse;
            background: #FFFFFF;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            border: 1px solid #E5E7EB;
        }

        .details-table tr {
            border-bottom: 1px solid #F3F4F6;
            transition: background-color 0.2s ease;
        }

        .details-table tr:last-child {
            border-bottom: none;
        }

        .details-table tr:hover {
            background: rgba(31, 41, 55, 0.02);
        }

        .details-table td {
            padding: 20px 30px;
            vertical-align: middle;
            font-size: 16px;
        }

        .details-table td:first-child {
            font-weight: 600;
            color: #6B7280;
            width: 40%;
            background: #F9FAFB;
        }

        .details-table td:last-child {
            font-weight: 700;
            color: ${primaryColor};
            text-align: right;
            background: #FFFFFF;
        }

        .amount-row {
            background: linear-gradient(135deg, ${statusColor}08, ${statusColor}03) !important;
            border-left: 5px solid ${statusColor};
        }

        .amount-row td {
            background: transparent !important;
        }

        .amount-row td:last-child {
            color: ${statusColor} !important;
            font-size: 24px !important;
            font-weight: 800 !important;
        }

        .status-row td:last-child {
            color: ${statusColor} !important;
            font-weight: 800 !important;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
        }

        .status-check {
            color: ${statusColor} !important;
            font-size: 20px;
            font-weight: bold;
        }

        .transaction-ref {
            font-family: 'Monaco', 'Menlo', monospace !important;
            font-size: 14px !important;
            background: #F3F4F6;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #D1D5DB;
            letter-spacing: 0.5px;
        }

        /* Status Message */
        .status-message {
            margin: 40px 50px;
            padding: 25px 30px;
            border-radius: 16px;
            border-left: 5px solid ${statusColor};
            background: ${statusBgColor};
            border: 1px solid ${statusColor}30;
        }

        .status-message h4 {
            font-size: 18px;
            font-weight: 700;
            color: ${statusColor};
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .status-message p {
            font-size: 15px;
            color: #374151;
            line-height: 1.6;
            margin: 0;
        }

        .refund-notice {
            background: #ECFDF5;
            border: 1px solid #10B981;
            border-radius: 12px;
            padding: 16px 20px;
            margin-top: 16px;
        }

        .refund-notice p {
            color: #047857;
            font-weight: 700;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Enhanced Full-Width Footer */
        .footer {
            background: linear-gradient(135deg, ${primaryGradientStart} 0%, ${primaryGradientEnd} 100%);
            color: #FFFFFF;
            padding: 50px;
            position: relative;
            overflow: hidden;
            width: 100%;
        }

        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(255,255,255,0.05) 0%, transparent 50%, rgba(255,255,255,0.02) 100%);
            pointer-events: none;
        }

        .footer-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            z-index: 2;
            max-width: 100%;
        }

        .footer-text {
            flex: 1;
            max-width: 100%; /* Adjusted for single column layout */
        }

        .footer-title {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 15px;
            color: #FFFFFF;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            line-height: 1.2;
        }

        .footer-subtitle {
            font-size: 16px;
            color: #D1D5DB;
            line-height: 1.6;
            margin-bottom: 25px;
        }

        .footer-support {
            font-size: 13px;
            color: #9CA3AF;
            display: flex;
            gap: 25px;
            flex-wrap: wrap;
        }

        .footer-support span {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        /* Receipt Meta */
        .receipt-meta {
            background: #111827;
            color: #6B7280;
            padding: 25px 50px;
            font-size: 12px;
            text-align: center;
            border-top: 1px solid #374151;
            width: 100%;
        }

        .meta-grid {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 600px;
            margin: 0 auto;
        }

        .meta-item {
            text-align: center;
        }

        .meta-item strong {
            display: block;
            color: #9CA3AF;
            margin-bottom: 3px;
            font-weight: 600;
        }

        .meta-item span {
            color: #6B7280;
        }

        /* Security Features */
        .security-strip {
            height: 8px;
            background: linear-gradient(90deg, 
                ${primaryColor} 0%, 
                ${statusColor} 25%, 
                ${primaryColor} 50%, 
                ${statusColor} 75%, 
                ${primaryColor} 100%
            );
            width: 100%;
        }

        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-15deg);
            opacity: 0.02;
            pointer-events: none;
            z-index: 1;
        }

        .watermark svg {
            width: 300px;
            height: 300px;
        }

        /* Print Styles */
        @media print {
            body { 
                margin: 0; 
                padding: 0; 
                background: white; 
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            .receipt-container { 
                box-shadow: none; 
                margin: 0;
                width: 100%;
            }
            .watermark { display: none; }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .header, .details-section, .footer, .status-hero {
                padding: 30px 25px;
            }
            
            .receipt-meta {
                padding: 20px 25px;
            }
            
            .footer-content {
                flex-direction: column;
                text-align: center;
                gap: 25px;
            }
            
            .footer-text {
                max-width: 100%;
            }
            
            .meta-grid {
                flex-direction: column;
                gap: 10px;
            }
            
            .details-table td {
                padding: 15px 20px;
                font-size: 14px;
            }
            
            .footer-title {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="receipt-container">
        <div class="security-strip"></div>
        
        <div class="watermark">
            <svg viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="150" cy="150" r="150" fill="${primaryColor}" fill-opacity="0.02"/>
                <text x="150" y="165" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${primaryColor}" fill-opacity="0.02" text-anchor="middle">HOVAPAY</text>
            </svg>
        </div>
        
        <div class="header">
            <div class="header-logos">
                <div class="hovapay-logo">
<img alt="hovapay-logo" src="https://res.cloudinary.com/dwyzq40iu/image/upload/v1749976274/Blue_Hovapay_2_fhdtdy.png"
                         class="hovapay-logo-img"/>
                </div>
                <div class="service-logo-container">
                    <img src="${getServiceLogo(actualService)}" alt="${actualService}" onerror="this.style.display='none'; this.parentNode.innerHTML='⚡';" />
                </div>
            </div>
            <div class="header-content">
                <div class="receipt-title">Digital Payment Receipt</div>
                <div class="receipt-number">
                    #${params.transactionRef.slice(-8).toUpperCase()}
                </div>
            </div>
        </div>

        <div class="details-section">
            <div class="section-title">Transaction Summary</div>
            
            <table class="details-table">
                <tr>
                    <td>Service Provider</td>
                    <td>${actualService}</td>
                </tr>
                
                <tr>
                    <td>Service Type</td>
                    <td>${transaction?.serviceType ? transaction.serviceType.charAt(0).toUpperCase() + transaction.serviceType.slice(1) : 'Digital'} Service</td>
                </tr>
                
                ${actualPhone ? `
                <tr>
                    <td>Phone Number</td>
                    <td>+234${actualPhone.startsWith('0') ? actualPhone.slice(1) : actualPhone}</td>
                </tr>
                ` : ''}
                
                ${actualBillersCode ? `
                <tr>
                    <td>Customer ID</td>
                    <td><span class="transaction-ref">${actualBillersCode}</span></td>
                </tr>
                ` : ''}
                
                <tr class="amount-row">
                    <td>Total Amount</td>
                    <td>${formatCurrency(actualAmount)}</td>
                </tr>
                
                <tr>
                    <td>Processing Fee</td>
                    <td>₦0.00</td>
                </tr>
                
                <tr>
                    <td>Payment Method</td>
                    <td>Hovapay Wallet</td>
                </tr>
                
                <tr>
                    <td>Transaction Reference</td>
                    <td><span class="transaction-ref">${params.transactionRef}</span></td>
                </tr>
                
                <tr>
                    <td>Transaction Date</td>
                    <td>${formatDate(transaction?.createdAt).split(',')[0]}</td>
                </tr>
                
                <tr class="status-row">
                    <td>Payment Status</td>
                    <td>
                        <span class="status-check">${statusIcon}</span>
                        <span>${statusText}</span>
                    </td>
                </tr>

                ${transaction?.vtpassRef ? `
                <tr>
                    <td>Provider Reference</td>
                    <td><span class="transaction-ref">${transaction.vtpassRef}</span></td>
                </tr>
                ` : ''}
            </table>
        </div>

        <div class="status-message">
            <h4>
                <span class="status-check">${statusIcon}</span>
                ${actualStatus === 'completed' || actualStatus === 'successful'
            ? 'Payment Completed Successfully'
            : actualStatus === 'failed'
                ? 'Payment Failed'
                : 'Payment Being Processed'}
            </h4>
            <p>
                ${actualStatus === 'completed' || actualStatus === 'successful'
            ? `Your ${actualService} service has been successfully activated. You should receive a confirmation message from the service provider shortly.`
            : actualStatus === 'failed'
                ? `${getErrorMessage()}`
                : 'Your payment is currently being processed by our secure payment system. This usually takes a few minutes to complete.'}
            </p>
            
            ${actualStatus === 'failed' ? `
            <div class="refund-notice">
                <p>
                    <span class="status-check">✓</span>
                    <span>Automatic refund of ${formatCurrency(actualAmount)} has been credited to your wallet.</span>
                </p>
            </div>
            ` : ''}
        </div>

        <div class="footer">
            <div class="footer-content">
                <div class="footer-text">
                    <div class="footer-title">Pay Your Bills with Ease!</div>
                    <div class="footer-subtitle">
                        With Hovapay, you can pay for electricity, internet, cable TV, and 
                        more—instantly and securely from the comfort of your home.
                    </div>
                    <div class="footer-support">
                        <span>📧 support@hovapay.com</span>
                        <span>📞 +234 800 123 4567</span>
                        <span>🕒 24/7 Support</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="receipt-meta">
            <div class="meta-grid">
                <div class="meta-item">
                    <strong>Generated</strong>
                    <span>${currentDate}</span>
                </div>
                <div class="meta-item">
                    <strong>Document ID</strong>
                    <span>HPR-${new Date().getTime().toString().slice(-8)}</span>
                </div>
                <div class="meta-item">
                    <strong>Version</strong>
                    <span>4.0.0</span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
`;
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);

            // Generate PDF from HTML using the enhanced professional template
            const htmlContent = generateProfessionalPDFHTML();
            const { uri } = await printToFileAsync({
                html: htmlContent,
                base64: false,
                margins: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                },
                width: 595, // A4 width in points
                height: 842, // A4 height in points
            });

            // Generate filename with transaction reference
            const fileName = `Hovapay_Receipt_${params.transactionRef}_${new Date().getTime()}.pdf`;

            if (Platform.OS === 'ios') {
                // iOS: Use sharing directly
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Save Receipt',
                        UTI: 'com.adobe.pdf',
                    });

                    Alert.alert(
                        'Receipt Ready',
                        'Your professional receipt is ready to save or share.',
                        [{ text: 'OK', style: 'default' }]
                    );
                }
            } else {
                // Android: Use MediaLibrary approach
                try {
                    const { status } = await MediaLibrary.requestPermissionsAsync();
                    if (status !== 'granted') {
                        Alert.alert(
                            'Permission Required',
                            'Please grant media library access to download the receipt.',
                            [{ text: 'OK' }]
                        );
                        return;
                    }

                    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
                    await FileSystem.copyAsync({
                        from: uri,
                        to: fileUri,
                    });

                    const asset = await MediaLibrary.createAssetAsync(uri);
                    let album = await MediaLibrary.getAlbumAsync('Download');
                    if (album == null) {
                        album = await MediaLibrary.createAlbumAsync('Download', asset, false);
                    } else {
                        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                    }

                    Alert.alert(
                        'Receipt Downloaded',
                        `Your professional receipt has been saved to Downloads as ${fileName}`,
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

                    if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(uri, {
                            mimeType: 'application/pdf',
                            dialogTitle: 'Save or Share Receipt',
                        });

                        Alert.alert(
                            'Receipt Ready',
                            'Your professional receipt is ready to save or share.',
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
                            const htmlContent = generateProfessionalPDFHTML();
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
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
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
                <View style={styles.contentContainer} >
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
        </View>
        </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.primary,
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
        paddingBottom: SPACING['2.5xl'],
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
        backgroundColor: COLORS.primary,
        ...SHADOWS.colored(COLORS.primary),
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
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        backgroundColor: COLORS.background,
        // borderTopLeftRadius: RADIUS['2xl'],
        // borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
        paddingTop: SPACING.lg,
        flex: 1,
    },
});