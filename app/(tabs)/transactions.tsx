// app/(tabs)/transactions.tsx - Enhanced with Combined Transaction History (Updated)
import React, { useState, useMemo } from 'react';
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

type TransactionFilter = 'all' | 'deposit' | 'bill_payment' | 'virtual_account_credit' | 'refund';

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
    { id: 'refund', label: 'Refunds', icon: 'keyboard-return', color: COLORS.success },
];

export default function TransactionsScreen() {
    const router = useRouter();
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<TransactionFilter>('all');
    const [page, setPage] = useState(1);

    // Fetch both wallet transactions and bill payment history
    const { data: walletTransactionData, refetch: refetchWalletTransactions, isLoading: walletLoading } = useGetTransactionHistoryQuery({
        page,
        limit: 50, // Increase limit to get more transactions
        type: activeFilter === 'all' || activeFilter === 'bill_payment' ? undefined : activeFilter,
    });

    const { data: billHistoryData, refetch: refetchBillHistory, isLoading: billLoading } = useGetBillHistoryQuery({
        page,
        limit: 50, // Increase limit to get more transactions
    });

    console.log('Transactions Screen Debug:');
    console.log('walletTransactionData:', walletTransactionData);
    console.log('billHistoryData:', billHistoryData);

    // Combine and process all transactions
    const allTransactions = useMemo(() => {
        const walletTransactions = walletTransactionData?.docs || [];
        const billTransactions = billHistoryData?.docs || [];

        console.log('Processing transactions:');
        console.log('- Wallet transactions:', walletTransactions.length);
        console.log('- Bill transactions:', billTransactions.length);

        // Convert bill transactions to match wallet transaction format
        const normalizedBillTransactions = billTransactions.map((bill: any) => {
            const serviceTypeFormatted = bill.serviceType ?
                bill.serviceType.charAt(0).toUpperCase() + bill.serviceType.slice(1) :
                'Bill';

            return {
                _id: bill._id,
                id: bill._id,
                type: 'bill_payment',
                amount: bill.amount,
                description: `${serviceTypeFormatted} Payment`,
                status: bill.status,
                reference: bill.transactionRef,
                createdAt: bill.createdAt,
                updatedAt: bill.updatedAt,
                serviceType: bill.serviceType,
                serviceID: bill.serviceID,
                phone: bill.phone,
                paymentMethod: bill.paymentMethod,
                vtpassRef: bill.vtpassRef,
                responseData: bill.responseData,
                metadata: {
                    serviceType: bill.serviceType,
                    serviceID: bill.serviceID,
                    phone: bill.phone,
                    vtpassRef: bill.vtpassRef,
                    responseData: bill.responseData
                }
            };
        });

        // Combine and sort by date (newest first)
        const combined = [...walletTransactions, ...normalizedBillTransactions];
        const sorted = combined.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        console.log('Combined transactions:', sorted.length);
        return sorted;
    }, [walletTransactionData, billHistoryData]);

    // Filter transactions based on active filter
    const filteredTransactions = useMemo(() => {
        if (activeFilter === 'all') {
            return allTransactions;
        }
        return allTransactions.filter(transaction => transaction.type === activeFilter);
    }, [allTransactions, activeFilter]);

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
            await Promise.all([
                refetchWalletTransactions(),
                refetchBillHistory()
            ]);
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
                if (transaction.status === 'failed') return 'error';
                if (transaction.status === 'pending') return 'hourglass-empty';
                return 'receipt';
            case 'refund':
                return 'keyboard-return';
            default:
                return 'receipt';
        }
    };

    const getTransactionColor = (transaction: any) => {
        if (transaction.type === 'bill_payment') {
            switch (transaction.status) {
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
        }

        switch (transaction.type) {
            case 'deposit':
            case 'virtual_account_credit':
            case 'refund':
                return COLORS.success;
            default:
                return COLORS.textSecondary;
        }
    };

    const getTransactionDescription = (transaction: any) => {
        if (transaction.type === 'bill_payment') {
            if (transaction.serviceType && transaction.serviceID) {
                const networkName = transaction.serviceID.toUpperCase();
                const serviceType = transaction.serviceType.charAt(0).toUpperCase() +
                    transaction.serviceType.slice(1);
                return `${networkName} ${serviceType}`;
            }
            return transaction.description || 'Bill Payment';
        }

        switch (transaction.type) {
            case 'virtual_account_credit':
                return 'Bank Transfer';
            case 'deposit':
                return 'Wallet Funding';
            case 'refund':
                return 'Refund';
            default:
                return transaction.description || 'Transaction';
        }
    };

    const getTransactionSubtitle = (transaction: any) => {
        if (transaction.type === 'bill_payment') {
            if (transaction.phone) {
                // Format phone number nicely
                const phone = transaction.phone.toString();
                if (phone.length === 10) {
                    return `0${phone}`;
                } else if (phone.length === 11 && phone.startsWith('0')) {
                    return phone;
                } else if (phone.length === 10 || phone.length === 11) {
                    return phone.startsWith('0') ? phone : `0${phone}`;
                }
                return phone;
            }
            return `Ref: ${transaction.reference?.substring(0, 10)}...`;
        }

        if (transaction.type === 'virtual_account_credit') {
            return 'Via Dedicated Account';
        }

        if (transaction.reference) {
            return `Ref: ${transaction.reference.substring(0, 10)}...`;
        }

        return formatTime(transaction.createdAt || transaction.date);
    };

    const handleTransactionPress = (transaction: any) => {
        console.log('Transaction pressed:', transaction);

        if (transaction.type === 'bill_payment') {
            // Navigate to receipt screen for bill payments
            router.push({
                pathname: '/bills/receipt',
                params: {
                    transactionRef: transaction.reference,
                    type: transaction.serviceType,
                    phone: transaction.phone,
                    amount: transaction.amount.toString(),
                    status: transaction.status,
                    serviceID: transaction.serviceID,
                }
            });
        } else {
            // For other transaction types, you could navigate to a general transaction details screen
            // or show more details in a modal
            console.log('Other transaction type details:', transaction);
            // TODO: Implement general transaction details screen if needed
        }
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
            onPress={() => handleTransactionPress(transaction)}
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
                        color: (transaction.type === 'deposit' ||
                            transaction.type === 'virtual_account_credit' ||
                            transaction.type === 'refund')
                            ? COLORS.success
                            : COLORS.textPrimary
                    }
                ]}>
                    {(transaction.type === 'deposit' ||
                        transaction.type === 'virtual_account_credit' ||
                        transaction.type === 'refund') ? '+' : '-'}
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

            {/* Debug info in development */}
            {__DEV__ && (
                <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>
                        Debug Info:{'\n'}
                        All Transactions: {allTransactions.length}{'\n'}
                        Filtered: {filteredTransactions.length}{'\n'}
                        Bills: {billHistoryData?.docs?.length || 0}{'\n'}
                        Wallet: {walletTransactionData?.docs?.length || 0}
                    </Text>
                </View>
            )}

            {activeFilter === 'all' && (
                <TouchableOpacity
                    style={styles.emptyStateButton}
                    onPress={() => router.push('/bills/airtime')}
                >
                    <MaterialIcons name="receipt" size={20} color={COLORS.textInverse} />
                    <Text style={styles.emptyStateButtonText}>Make a Transaction</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const hasTransactions = filteredTransactions.length > 0;
    const isLoading = walletLoading || billLoading;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            <View style={styles.content}>
            {/* Header */}
                <LinearGradient
                    colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Transactions</Text>
                        <Text style={styles.headerSubtitle}>
                            {hasTransactions ? `${filteredTransactions.length} transactions` : 'Transaction history'}
                        </Text>
                    </View>
                </LinearGradient>

                {/* Main Content */}
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
                            <Text style={styles.summaryLabel}>Total Showing</Text>
                            <Text style={styles.summaryValue}>{filteredTransactions.length}</Text>
                        </View>
                        <View style={styles.summaryDivider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>This Month</Text>
                            <Text style={styles.summaryValue}>
                                {filteredTransactions.filter(t => {
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
                    data={filteredTransactions}
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
        backgroundColor: COLORS.primary,
        // paddingTop: SPACING["2xl"],
    },
    header: {
        paddingTop: SPACING["4xl"],
        paddingBottom: SPACING.lg,
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
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    transactionSubtitle: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
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
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        marginBottom: SPACING.xs,
    },
    statusBadge: {
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: RADIUS.sm,
    },
    statusText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        textTransform: 'capitalize',
    },
    debugInfo: {
        marginTop: 10,
        padding: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        alignSelf: 'stretch',
    },
    debugText: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
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
        marginTop: SPACING.base,
    },
    emptyStateButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
    },

});