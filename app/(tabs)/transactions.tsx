// app/(tabs)/transactions.tsx - Enhanced with Virtual Account transactions
import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    RefreshControl,
    FlatList,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    useGetTransactionHistoryQuery,
    useGetBillHistoryQuery,
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

type TransactionFilter = 'all' | 'deposit' | 'withdrawal' | 'bill_payment' | 'transfer' | 'virtual_account_credit';

interface FilterOption {
    id: TransactionFilter;
    label: string;
    icon: string;
    color: string;
}

const filterOptions: FilterOption[] = [
    { id: 'all', label: 'All', icon: 'receipt-long', color: COLORS.textSecondary },
    { id: 'deposit', label: 'Deposits', icon: 'add-circle', color: COLORS.success },
    { id: 'virtual_account_credit', label: 'Bank Transfer', icon: 'account-balance', color: COLORS.info },
    { id: 'bill_payment', label: 'Bills', icon: 'receipt', color: COLORS.warning },
    { id: 'transfer', label: 'Transfer', icon: 'send', color: COLORS.primary },
    { id: 'withdrawal', label: 'Withdraw', icon: 'remove-circle', color: COLORS.error },
];

export default function TransactionsScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<TransactionFilter>('all');
    const [page, setPage] = useState(1);

    const { data: transactionData, refetch: refetchTransactions, isLoading } = useGetTransactionHistoryQuery({
        page,
        limit: 20,
        type: activeFilter === 'all' ? undefined : activeFilter,
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
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-NG', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await refetchTransactions();
        } finally {
            setRefreshing(false);
        }
    };

    const getTransactionIcon = (transaction: any) => {
        switch (transaction.type) {
            case 'deposit':
                return 'add-circle';
            case 'virtual_account_credit':
                return 'account-balance';
            case 'bill_payment':
                return 'receipt';
            case 'transfer':
                return 'send';
            case 'withdrawal':
                return 'remove-circle';
            default:
                return 'receipt';
        }
    };

    const getTransactionColor = (transaction: any) => {
        switch (transaction.type) {
            case 'deposit':
            case 'virtual_account_credit':
                return COLORS.success;
            case 'bill_payment':
                return COLORS.warning;
            case 'transfer':
                return COLORS.primary;
            case 'withdrawal':
                return COLORS.error;
            default:
                return COLORS.textSecondary;
        }
    };

    const getTransactionDescription = (transaction: any) => {
        switch (transaction.type) {
            case 'virtual_account_credit':
                return 'Bank Transfer';
            case 'bill_payment':
                return transaction.serviceType || 'Bill Payment';
            case 'deposit':
                return 'Wallet Funding';
            case 'transfer':
                return 'Money Transfer';
            case 'withdrawal':
                return 'Withdrawal';
            default:
                return transaction.description || 'Transaction';
        }
    };

    const getTransactionSubtitle = (transaction: any) => {
        if (transaction.type === 'virtual_account_credit') {
            return 'Via Dedicated Account';
        }
        if (transaction.type === 'bill_payment' && transaction.serviceType) {
            return `${transaction.serviceType} - ${transaction.reference?.substring(0, 8)}...`;
        }
        if (transaction.reference) {
            return `Ref: ${transaction.reference.substring(0, 10)}...`;
        }
        return formatTime(transaction.createdAt || transaction.date);
    };

    const renderFilterChip = (filter: FilterOption) => (
        <TouchableOpacity
            key={filter.id}
            style={[
                styles.filterChip,
                activeFilter === filter.id && [
                    styles.activeFilterChip,
                    { backgroundColor: filter.color + '20', borderColor: filter.color }
                ]
            ]}
            onPress={() => setActiveFilter(filter.id)}
        >
            <MaterialIcons
                name={filter.icon as any}
                size={16}
                color={activeFilter === filter.id ? filter.color : COLORS.textTertiary}
            />
            <Text style={[
                styles.filterChipText,
                activeFilter === filter.id && { color: filter.color, fontWeight: TYPOGRAPHY.fontWeights.semibold }
            ]}>
                {filter.label}
            </Text>
        </TouchableOpacity>
    );

    const renderTransaction = ({ item: transaction }: { item: any }) => (
        <TouchableOpacity
            style={styles.transactionCard}
            onPress={() => {
                // Navigate to transaction details
                console.log('Transaction details:', transaction._id);
            }}
            activeOpacity={0.7}
        >
            <View style={styles.transactionLeft}>
                <View style={[
                    styles.transactionIcon,
                    { backgroundColor: getTransactionColor(transaction) + '20' }
                ]}>
                    <MaterialIcons
                        name={getTransactionIcon(transaction) as any}
                        size={20}
                        color={getTransactionColor(transaction)}
                    />
                </View>
                <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>
                        {getTransactionDescription(transaction)}
                    </Text>
                    <Text style={styles.transactionSubtitle}>
                        {getTransactionSubtitle(transaction)}
                    </Text>
                    <Text style={styles.transactionDate}>
                        {formatDate(transaction.createdAt || transaction.date)}
                    </Text>
                </View>
            </View>
            <View style={styles.transactionRight}>
                <Text style={[
                    styles.transactionAmount,
                    {
                        color: (transaction.type === 'deposit' || transaction.type === 'virtual_account_credit')
                            ? COLORS.success
                            : COLORS.textPrimary
                    }
                ]}>
                    {(transaction.type === 'deposit' || transaction.type === 'virtual_account_credit') ? '+' : '-'}
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

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <MaterialIcons
                name={activeFilter === 'all' ? 'receipt-long' : filterOptions.find(f => f.id === activeFilter)?.icon as any || 'receipt-long'}
                size={64}
                color={COLORS.textTertiary}
            />
            <Text style={styles.emptyStateTitle}>
                No {activeFilter === 'all' ? 'transactions' : filterOptions.find(f => f.id === activeFilter)?.label.toLowerCase()} found
            </Text>
            <Text style={styles.emptyStateSubtitle}>
                {activeFilter === 'all'
                    ? 'Your transaction history will appear here when you start using your wallet.'
                    : `You haven't made any ${filterOptions.find(f => f.id === activeFilter)?.label.toLowerCase()} yet.`
                }
            </Text>
            {activeFilter === 'all' && (
                <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => router.push('/wallet/fund')}
                >
                    <MaterialIcons name="add" size={20} color={COLORS.textInverse} />
                    <Text style={styles.emptyStateButtonText}>Fund Wallet</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const transactions = transactionData?.transactions || [];
    const hasTransactions = transactions.length > 0;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Header */}
            <LinearGradient
                colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Transactions</Text>
                    <Text style={styles.headerSubtitle}>
                        {hasTransactions ? `${transactions.length} transactions` : 'Transaction history'}
                    </Text>
                </View>
            </LinearGradient>

            {/* Main Content */}
            <View style={styles.content}>
                {/* Filter Chips */}
                <View style={styles.filtersSection}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtersContainer}
                    >
                        {filterOptions.map(renderFilterChip)}
                    </ScrollView>
                </View>

                {/* Transaction Summary */}
                {hasTransactions && (
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total Transactions</Text>
                            <Text style={styles.summaryValue}>{transactions.length}</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>This Month</Text>
                            <Text style={styles.summaryValue}>
                                {transactions.filter(t => {
                                    const transactionDate = new Date(t.createdAt || t.date);
                                    const now = new Date();
                                    return transactionDate.getMonth() === now.getMonth() &&
                                        transactionDate.getFullYear() === now.getFullYear();
                                }).length}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Transactions List */}
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item._id || item.id}
                    renderItem={renderTransaction}
                    contentContainerStyle={[
                        styles.transactionsList,
                        !hasTransactions && styles.emptyListContainer
                    ]}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.transactionSeparator} />}
                />
            </View>
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
        marginBottom: SPACING.base,
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
    content: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['3xl'],
        borderTopRightRadius: RADIUS['3xl'],
        marginTop: -SPACING.base,
    },
    filtersSection: {
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.base,
    },
    filtersContainer: {
        paddingHorizontal: SPACING.xl,
        gap: SPACING.sm,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    activeFilterChip: {
        backgroundColor: COLORS.primary + '20',
        borderColor: COLORS.primary,
    },
    filterChipText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginLeft: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    summaryCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginHorizontal: SPACING.xl,
        marginBottom: SPACING.base,
        ...SHADOWS.sm,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginBottom: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    summaryValue: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        color: COLORS.textPrimary,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
    },
    summaryDivider: {
        width: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: SPACING.base,
    },
    transactionsList: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING['4xl'],
    },
    emptyListContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    transactionCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        ...SHADOWS.sm,
    },
    transactionSeparator: {
        height: SPACING.sm,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.base,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    transactionSubtitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
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
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
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
        paddingVertical: SPACING['4xl'],
        paddingHorizontal: SPACING.xl,
    },
    emptyStateTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textSecondary,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    emptyStateSubtitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
        textAlign: 'center',
        lineHeight: TYPOGRAPHY.fontSizes.sm * 1.4,
        marginBottom: SPACING.xl,
    },
    emptyStateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
        ...SHADOWS.colored(COLORS.primary),
    },
    emptyStateButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
    },
});