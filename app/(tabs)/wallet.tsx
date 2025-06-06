// app/(tabs)/wallet.tsx
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
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    useGetWalletBalanceQuery,
    useGetTransactionHistoryQuery
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

export default function WalletScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [balanceVisible, setBalanceVisible] = useState(true);

    const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
    const { data: transactionData } = useGetTransactionHistoryQuery({
        page: 1,
        limit: 5
    });

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

    const walletActions = [
        {
            id: 'fund',
            title: 'Fund Wallet',
            subtitle: 'Add money',
            icon: 'add',
            color: COLORS.success,
            onPress: () => router.push('/wallet/fund'),
        },
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
                            : COLORS.primary + '20'
                    }
                ]}>
                    <MaterialIcons
                        name={transaction.type === 'deposit' ? 'add' : 'receipt'}
                        size={16}
                        color={transaction.type === 'deposit' ? COLORS.success : COLORS.primary}
                    />
                </View>
                <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>
                        {transaction.description || transaction.serviceType || 'Transaction'}
                    </Text>
                    <Text style={styles.transactionDate}>
                        {formatDate(transaction.createdAt || transaction.date)}
                    </Text>
                </View>
            </View>
            <View style={styles.transactionRight}>
                <Text style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'deposit' ? COLORS.success : COLORS.textPrimary }
                ]}>
                    {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(transaction.amount)}
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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

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
                    <Text style={styles.balanceAmount}>
                        {balanceVisible
                            ? (walletData ? formatCurrency(walletData.balance) : '₦0.00')
                            : '****'
                        }
                    </Text>

                    {/* Primary Fund Button */}
                    <TouchableOpacity
                        style={styles.primaryFundButton}
                        onPress={() => router.push('/wallet/fund')}
                    >
                        <MaterialIcons name="add" size={20} color={COLORS.textInverse} />
                        <Text style={styles.primaryFundButtonText}>Add Money</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Main Content */}
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Quick Stats */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Overview</Text>
                    <View style={styles.statsGrid}>
                        {quickStats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={[
                                    styles.statChange,
                                    stat.positive === true && { color: COLORS.success },
                                    stat.positive === false && { color: COLORS.error },
                                ]}>
                                    {stat.change}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

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
                                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Recent Transactions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                            <Text style={styles.seeAllText}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {transactionData?.transactions?.length ? (
                        <View style={styles.transactionsList}>
                            {transactionData.transactions.slice(0, 5).map(renderTransaction)}
                        </View>
                    ) : (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="receipt-long" size={48} color={COLORS.textTertiary} />
                            <Text style={styles.emptyStateText}>No transactions yet</Text>
                            <Text style={styles.emptyStateSubtext}>
                                Start by funding your wallet or making a payment
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyStateButton}
                                onPress={() => router.push('/wallet/fund')}
                            >
                                <Text style={styles.emptyStateButtonText}>Fund Wallet</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

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
        paddingBottom: SPACING['3xl'],
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
        backgroundColor: COLORS.withOpacity(COLORS.white, 0.15),
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        paddingVertical: SPACING['2xl'],
        backdropFilter: 'blur(10px)',
    },
    balanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    balanceLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.withOpacity(COLORS.textInverse, 0.8),
    },
    eyeButton: {
        padding: SPACING.xs,
    },
    balanceAmount: {
        fontSize: TYPOGRAPHY.fontSizes['4xl'],
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
        marginBottom: SPACING.lg,
        lineHeight: TYPOGRAPHY.fontSizes['4xl'] * 1.2,
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