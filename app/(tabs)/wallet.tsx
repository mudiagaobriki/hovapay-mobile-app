// app/(tabs)/wallet.tsx - Enhanced with Virtual Account
import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    RefreshControl,
    Dimensions,
    Clipboard,
    Alert, Platform,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    useGetWalletBalanceQuery,
    useGetTransactionHistoryQuery,
    useGetVirtualAccountQuery,
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

export default function WalletScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [balanceVisible, setBalanceVisible] = useState(true);
    const [showVirtualAccount, setShowVirtualAccount] = useState(true);

    const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
    const { data: transactionData } = useGetTransactionHistoryQuery({
        page: 1,
        limit: 5
    });
    const { data: virtualAccountData } = useGetVirtualAccountQuery();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-NG', {
            month: 'short',
            day: 'numeric',
        });
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await refetchWallet();
        } finally {
            setRefreshing(false);
        }
    };

    const copyToClipboard = async (text: string, label: string) => {
        await Clipboard.setString(text);
        Alert.alert('Copied!', `${label} copied to clipboard`);
    };

    const walletActions = [
        {
            id: 'transfer',
            title: 'Transfer',
            subtitle: 'Send money',
            icon: 'send',
            color: COLORS.info,
            onPress: () => console.log('Transfer - Coming soon'),
        },
        {
            id: 'withdraw',
            title: 'Withdraw',
            subtitle: 'To bank',
            icon: 'account-balance',
            color: COLORS.warning,
            onPress: () => console.log('Withdraw - Coming soon'),
        },
        {
            id: 'transactions',
            title: 'History',
            subtitle: 'View your deposits',
            icon: 'add',
            color: COLORS.success,
            onPress: () => router.push('/(tabs)/transactions'),
        },
    ];

    const quickStats = [
        {
            label: 'This Month',
            value: '₦25,000',
            change: '+12%',
            positive: true,
        },
        {
            label: 'Last Transaction',
            value: '₦2,500',
            change: '2 days ago',
            positive: null,
        },
    ];

    const renderTransaction = (transaction: any) => (
        <TouchableOpacity
            key={transaction._id || transaction.id}
            style={styles.transactionItem}
            onPress={() => console.log('Transaction details:', transaction._id)}
        >
            <View style={styles.transactionLeft}>
                <View style={[
                    styles.transactionIcon,
                    {
                        backgroundColor: transaction.type === 'deposit'
                            ? COLORS.success + '20'
                            : transaction.type === 'virtual_account_credit'
                                ? COLORS.info + '20'
                                : COLORS.primary + '20'
                    }
                ]}>
                    <MaterialIcons
                        name={
                            transaction.type === 'deposit'
                                ? 'add'
                                : transaction.type === 'virtual_account_credit'
                                    ? 'account-balance'
                                    : 'receipt'
                        }
                        size={16}
                        color={
                            transaction.type === 'deposit'
                                ? COLORS.success
                                : transaction.type === 'virtual_account_credit'
                                    ? COLORS.info
                                    : COLORS.primary
                        }
                    />
                </View>
                <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>
                        {transaction.type === 'virtual_account_credit'
                            ? 'Bank Transfer'
                            : transaction.description || transaction.serviceType || 'Transaction'
                        }
                    </Text>
                    <Text style={styles.transactionDate}>
                        {formatDate(transaction.createdAt || transaction.date)}
                    </Text>
                </View>
            </View>
            <View style={styles.transactionRight}>
                <Text style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'deposit' || transaction.type === 'virtual_account_credit'
                            ? COLORS.success
                            : COLORS.textPrimary
                    }
                ]}>
                    {transaction.type === 'deposit' || transaction.type === 'virtual_account_credit' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                </Text>
                <View style={[
                    styles.statusBadge,
                    {
                        backgroundColor: transaction.status === 'completed' || transaction.status === 'success'
                            ? COLORS.success + '20'
                            : transaction.status === 'pending'
                                ? COLORS.warning + '20'
                                : COLORS.error + '20'
                    }
                ]}>
                    <Text style={[
                        styles.statusText,
                        {
                            color: transaction.status === 'completed' || transaction.status === 'success'
                                ? COLORS.success
                                : transaction.status === 'pending'
                                    ? COLORS.warning
                                    : COLORS.error
                        }
                    ]}>
                        {transaction.status}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderVirtualAccountCard = () => {
        if (!virtualAccountData?.data) return null;

        const { accountNumber, bankName, accountName } = virtualAccountData.data;

        return (
            <View style={styles.virtualAccountCard}>
                <View style={styles.virtualAccountHeader}>
                    <View style={styles.virtualAccountHeaderLeft}>
                        <MaterialIcons name="account-balance" size={20} color={COLORS.info} />
                        <Text style={styles.virtualAccountTitle}>Dedicated Account</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setShowVirtualAccount(!showVirtualAccount)}
                        style={styles.toggleButton}
                    >
                        <MaterialIcons
                            name={showVirtualAccount ? 'expand-less' : 'expand-more'}
                            size={20}
                            color={COLORS.textSecondary}
                        />
                    </TouchableOpacity>
                </View>

                {showVirtualAccount && (
                    <View style={styles.virtualAccountDetails}>
                        <View style={styles.accountRow}>
                            <Text style={styles.accountLabel}>Bank</Text>
                            <View style={styles.accountValueContainer}>
                                <Text style={styles.accountValue}>{bankName}</Text>
                                <TouchableOpacity onPress={() => copyToClipboard(bankName, 'Bank name')}>
                                    <MaterialIcons name="content-copy" size={14} color={COLORS.textTertiary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.accountRow}>
                            <Text style={styles.accountLabel}>Account Number</Text>
                            <View style={styles.accountValueContainer}>
                                <Text style={[styles.accountValue, styles.accountNumber]}>{accountNumber}</Text>
                                <TouchableOpacity onPress={() => copyToClipboard(accountNumber, 'Account number')}>
                                    <MaterialIcons name="content-copy" size={14} color={COLORS.info} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.accountRow}>
                            <Text style={styles.accountLabel}>Account Name</Text>
                            <View style={styles.accountValueContainer}>
                                <Text style={styles.accountValue}>{accountName}</Text>
                                <TouchableOpacity onPress={() => copyToClipboard(accountName, 'Account name')}>
                                    <MaterialIcons name="content-copy" size={14} color={COLORS.textTertiary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.virtualAccountNote}>
                            <MaterialIcons name="info" size={14} color={COLORS.info} />
                            <Text style={styles.noteText}>
                                Transfer to this account and your wallet gets credited instantly
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
            {/* Header */}
            <LinearGradient
                colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerTitle}>My Wallet</Text>
                        <Text style={styles.headerSubtitle}>Manage your finances</Text>
                    </View>
                    <TouchableOpacity onPress={() => console.log('Wallet settings')}>
                        <MaterialIcons name="more-vert" size={24} color={COLORS.textInverse} />
                    </TouchableOpacity>
                </View>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <View style={styles.balanceRow}>
                        <View style={styles.balanceInfo}>
                            <View style={styles.balanceHeader}>
                                <Text style={styles.balanceLabel}>Available Balance</Text>
                                <TouchableOpacity
                                    onPress={() => setBalanceVisible(!balanceVisible)}
                                    style={styles.eyeButton}
                                >
                                    <MaterialIcons
                                        name={balanceVisible ? "visibility" : "visibility-off"}
                                        size={20}
                                        color={COLORS.withOpacity(COLORS.textInverse, 0.8)}
                                    />
                                </TouchableOpacity>
                            </View>
                            <Text
                                style={styles.balanceAmount}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.6}
                            >
                                {balanceVisible
                                    ? (walletData?.data ? formatCurrency(walletData.data.balance) : '₦0.00')
                                    : '****'
                                }
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addMoneyButton}
                            onPress={() => router.push('/wallet/fund')}
                        >
                            <MaterialIcons name="add" size={16} color={COLORS.textInverse} />
                            <Text style={styles.addMoneyText}>Add Money</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>

            {/* Main Content */}
                {/* Virtual Account Card */}
                {virtualAccountData?.data && (
                    <View style={styles.section}>
                        {renderVirtualAccountCard()}
                    </View>
                )}

                {/* Quick Stats */}
                {/*<View style={styles.section}>*/}
                {/*    <Text style={styles.sectionTitle}>Overview</Text>*/}
                {/*    <View style={styles.statsGrid}>*/}
                {/*        {quickStats.map((stat, index) => (*/}
                {/*            <View key={index} style={styles.statCard}>*/}
                {/*                <Text style={styles.statLabel}>{stat.label}</Text>*/}
                {/*                <Text style={styles.statValue}>{stat.value}</Text>*/}
                {/*                <Text style={[*/}
                {/*                    styles.statChange,*/}
                {/*                    stat.positive === true && { color: COLORS.success },*/}
                {/*                    stat.positive === false && { color: COLORS.error },*/}
                {/*                ]}>*/}
                {/*                    {stat.change}*/}
                {/*                </Text>*/}
                {/*            </View>*/}
                {/*        ))}*/}
                {/*    </View>*/}
                {/*</View>*/}

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        {walletActions.map((action) => (
                            <TouchableOpacity
                                key={action.id}
                                style={styles.actionCard}
                                onPress={action.onPress}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                                    <MaterialIcons name={action.icon as any} size={24} color={action.color} />
                                </View>
                                <Text style={styles.actionTitle}>{action.title}</Text>
                                {/*<Text style={styles.actionSubtitle}>{action.subtitle}</Text>*/}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Recent Transactions */}
                {/*<View style={styles.section}>*/}
                {/*    <View style={styles.sectionHeader}>*/}
                {/*        <Text style={styles.sectionTitle}>Recent Transactions</Text>*/}
                {/*        <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>*/}
                {/*            <Text style={styles.seeAllText}>View All</Text>*/}
                {/*        </TouchableOpacity>*/}
                {/*    </View>*/}

                {/*    {transactionData?.transactions?.length ? (*/}
                {/*        <View style={styles.transactionsList}>*/}
                {/*            {transactionData.transactions.slice(0, 5).map(renderTransaction)}*/}
                {/*        </View>*/}
                {/*    ) : (*/}
                {/*        <View style={styles.emptyState}>*/}
                {/*            <MaterialIcons name="receipt-long" size={48} color={COLORS.textTertiary} />*/}
                {/*            <Text style={styles.emptyStateText}>No transactions yet</Text>*/}
                {/*            <Text style={styles.emptyStateSubtext}>*/}
                {/*                Start by funding your wallet or making a payment*/}
                {/*            </Text>*/}
                {/*            <TouchableOpacity*/}
                {/*                style={styles.emptyStateButton}*/}
                {/*                onPress={() => router.push('/wallet/fund')}*/}
                {/*            >*/}
                {/*                <Text style={styles.emptyStateButtonText}>Fund Wallet</Text>*/}
                {/*            </TouchableOpacity>*/}
                {/*        </View>*/}
                {/*    )}*/}
                {/*</View>*/}

                <View style={{ height: SPACING['4xl'] }} />
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
        paddingBottom: SPACING['2xl'],
        paddingHorizontal: SPACING.xl,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    headerLeft: {
        flex: 1,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSizes['2xl'],
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
        marginBottom: SPACING.xs,
    },
    headerSubtitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.withOpacity(COLORS.textInverse, 0.8),
    },
    balanceCard: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.base,
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    balanceInfo: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    balanceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    balanceLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.withOpacity(COLORS.textInverse, 0.8),
        marginRight: SPACING.sm,
    },
    eyeButton: {
        padding: SPACING.xs,
    },
    balanceAmount: {
        fontSize: TYPOGRAPHY.fontSizes['2xl'],
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
        flexShrink: 1,
        lineHeight: 24,
    },
    addMoneyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.withOpacity(COLORS.textInverse, 0.2),
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.withOpacity(COLORS.textInverse, 0.3),
    },
    addMoneyText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textInverse,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        marginLeft: SPACING.xs,
    },
    primaryFundButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.withOpacity(COLORS.white, 0.25),
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.base,
        alignSelf: 'flex-start',
    },
    primaryFundButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textInverse,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['3xl'],
        borderTopRightRadius: RADIUS['3xl'],
        marginTop: -SPACING.xl,
        paddingTop: SPACING.xl,
    },
    section: {
        marginBottom: SPACING['2xl'],
        paddingHorizontal: SPACING.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.base,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    seeAllText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.primary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },

    // Virtual Account Styles
    virtualAccountCard: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.info + '30',
        ...SHADOWS.sm,
        marginTop: SPACING.base,
    },
    virtualAccountHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.xs,
    },
    virtualAccountHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    virtualAccountTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.info,
        marginLeft: SPACING.sm,
    },
    toggleButton: {
        padding: SPACING.xs,
    },
    virtualAccountDetails: {
        marginTop: SPACING.sm,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    accountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    accountLabel: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        flex: 1,
    },
    accountValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 2,
        justifyContent: 'flex-end',
    },
    accountValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textPrimary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        marginRight: SPACING.sm,
        textAlign: 'right',
    },
    accountNumber: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        color: COLORS.info,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
    },
    virtualAccountNote: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.info + '08',
        borderRadius: RADIUS.base,
        padding: SPACING.sm,
        marginTop: SPACING.sm,
    },
    noteText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
        marginLeft: SPACING.xs,
        flex: 1,
        fontStyle: 'italic',
    },

    // Other styles
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statCard: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        flex: 1,
        marginHorizontal: SPACING.xs,
        ...SHADOWS.sm,
    },
    statLabel: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginBottom: SPACING.xs,
    },
    statValue: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    statChange: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionCard: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: SPACING.xs,
        ...SHADOWS.sm,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    actionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    actionSubtitle: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        textAlign: 'center',
    },
    transactionsList: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        ...SHADOWS.sm,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    transactionIcon: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.base,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionDescription: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    transactionDate: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
    },
    transactionRight: {
        alignItems: 'flex-end',
    },
    transactionAmount: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginBottom: SPACING.xs,
    },
    statusBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    statusText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        textTransform: 'capitalize',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING['3xl'],
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        ...SHADOWS.sm,
    },
    emptyStateText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
        marginTop: SPACING.base,
        marginBottom: SPACING.xs,
    },
    emptyStateSubtext: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    emptyStateButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.base,
    },
    emptyStateButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
});