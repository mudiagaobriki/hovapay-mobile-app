// app/(tabs)/transactions.tsx
import React, { useState, useCallback } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    StatusBar,
    RefreshControl,
    FlatList,
} from 'react-native';
import { Text, Input } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '@/store/slices/authSlice';
import {
    useGetTransactionHistoryQuery,
    useGetWalletBalanceQuery
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

interface Transaction {
    _id: string;
    type: 'deposit' | 'withdrawal' | 'bill_payment' | 'airtime' | 'data' | 'electricity' | 'transfer';
    amount: number;
    description: string;
    status: 'completed' | 'pending' | 'failed' | 'success';
    reference: string;
    serviceType?: string;
    createdAt: string;
    updatedAt: string;
    recipient?: string;
    provider?: string;
}

// Demo transactions to supplement API data
const demoTransactions: Transaction[] = [
    {
        _id: 'demo_1',
        type: 'airtime',
        amount: 500,
        description: 'MTN Airtime Purchase',
        status: 'completed',
        reference: 'TXN_AIR_001',
        serviceType: 'airtime',
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        recipient: '08012345678',
        provider: 'MTN',
    },
    {
        _id: 'demo_2',
        type: 'deposit',
        amount: 10000,
        description: 'Wallet Funding via Paystack',
        status: 'completed',
        reference: 'TXN_DEP_002',
        serviceType: 'wallet_funding',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
        _id: 'demo_3',
        type: 'data',
        amount: 1500,
        description: 'Airtel Data Bundle - 2GB',
        status: 'completed',
        reference: 'TXN_DATA_003',
        serviceType: 'data',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        recipient: '08098765432',
        provider: 'Airtel',
    },
    {
        _id: 'demo_4',
        type: 'electricity',
        amount: 5000,
        description: 'EKEDC Electricity Payment',
        status: 'completed',
        reference: 'TXN_ELEC_004',
        serviceType: 'electricity',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        recipient: '45234567890',
        provider: 'EKEDC',
    },
    {
        _id: 'demo_5',
        type: 'bill_payment',
        amount: 8500,
        description: 'DSTV Subscription Payment',
        status: 'pending',
        reference: 'TXN_TV_005',
        serviceType: 'tv_subscription',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        recipient: '1234567890',
        provider: 'DSTV',
    },
    {
        _id: 'demo_6',
        type: 'withdrawal',
        amount: 2000,
        description: 'Failed Transfer to Bank',
        status: 'failed',
        reference: 'TXN_WITH_006',
        serviceType: 'transfer',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    },
];

const filterOptions = [
    { value: 'all', label: 'All Transactions' },
    { value: 'deposit', label: 'Deposits' },
    { value: 'withdrawal', label: 'Withdrawals' },
    { value: 'airtime', label: 'Airtime' },
    { value: 'data', label: 'Data' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'bill_payment', label: 'Bill Payments' },
];

export default function TransactionsScreen() {
    const user = useSelector(selectCurrentUser);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [page, setPage] = useState(1);

    const { data: walletData } = useGetWalletBalanceQuery();
    const { data: transactionData, refetch, isFetching } = useGetTransactionHistoryQuery({
        page,
        limit: 20,
        type: selectedFilter !== 'all' ? selectedFilter : undefined,
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
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
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('en-NG', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTransactionIcon = (type: string, status: string) => {
        const iconMap: { [key: string]: string } = {
            'deposit': 'add-circle',
            'withdrawal': 'remove-circle',
            'airtime': 'phone',
            'data': 'wifi',
            'electricity': 'flash-on',
            'bill_payment': 'receipt',
            'transfer': 'send',
        };

        if (status === 'failed') return 'error';
        if (status === 'pending') return 'schedule';

        return iconMap[type] || 'receipt';
    };

    const getTransactionColor = (type: string, status: string) => {
        if (status === 'failed') return COLORS.error;
        if (status === 'pending') return COLORS.warning;

        const colorMap: { [key: string]: string } = {
            'deposit': COLORS.success,
            'withdrawal': COLORS.error,
            'airtime': '#10B981',
            'data': '#3B82F6',
            'electricity': '#F59E0B',
            'bill_payment': COLORS.primary,
            'transfer': '#8B5CF6',
        };

        return colorMap[type] || COLORS.primary;
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } finally {
            setRefreshing(false);
        }
    }, [refetch]);

    // Combine API transactions with demo transactions
    const allTransactions = [
        ...(transactionData?.transactions || []),
        ...demoTransactions,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Filter transactions based on search and filter
    const filteredTransactions = allTransactions.filter(transaction => {
        const matchesSearch =
            transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            transaction.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (transaction.recipient && transaction.recipient.includes(searchQuery)) ||
            (transaction.provider && transaction.provider.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesFilter = selectedFilter === 'all' || transaction.type === selectedFilter;

        return matchesSearch && matchesFilter;
    });

    const renderFilterChip = (filter: any) => (
        <TouchableOpacity
            key={filter.value}
            style={[
                styles.filterChip,
                selectedFilter === filter.value && styles.filterChipSelected
            ]}
            onPress={() => setSelectedFilter(filter.value)}
        >
            <Text style={[
                styles.filterChipText,
                selectedFilter === filter.value && styles.filterChipTextSelected
            ]}>
                {filter.label}
            </Text>
        </TouchableOpacity>
    );

    const renderTransaction = ({ item: transaction }: { item: Transaction }) => (
        <TouchableOpacity style={styles.transactionCard} activeOpacity={0.7}>
            <View style={styles.transactionLeft}>
                <View style={[
                    styles.transactionIcon,
                    { backgroundColor: getTransactionColor(transaction.type, transaction.status) + '20' }
                ]}>
                    <MaterialIcons
                        name={getTransactionIcon(transaction.type, transaction.status) as any}
                        size={20}
                        color={getTransactionColor(transaction.type, transaction.status)}
                    />
                </View>
                <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>{transaction.description}</Text>
                    <Text style={styles.transactionReference}>Ref: {transaction.reference}</Text>
                    {transaction.recipient && (
                        <Text style={styles.transactionRecipient}>
                            {transaction.provider ? `${transaction.provider} • ` : ''}{transaction.recipient}
                        </Text>
                    )}
                    <Text style={styles.transactionDate}>
                        {formatDate(transaction.createdAt)} • {formatTime(transaction.createdAt)}
                    </Text>
                </View>
            </View>
            <View style={styles.transactionRight}>
                <Text style={[
                    styles.transactionAmount,
                    {
                        color: transaction.type === 'deposit'
                            ? COLORS.success
                            : transaction.status === 'failed'
                                ? COLORS.textSecondary
                                : COLORS.textPrimary
                    }
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
                        {transaction.status === 'success' ? 'completed' : transaction.status}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={64} color={COLORS.textTertiary} />
            <Text style={styles.emptyStateTitle}>
                {searchQuery || selectedFilter !== 'all' ? 'No matching transactions' : 'No transactions yet'}
            </Text>
            <Text style={styles.emptyStateText}>
                {searchQuery || selectedFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'Your transaction history will appear here'
                }
            </Text>
        </View>
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
                    <Text style={styles.headerTitle}>Transaction History</Text>
                    <Text style={styles.headerSubtitle}>Track all your payments and deposits</Text>
                </View>

                {/* Balance Summary */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={styles.balanceAmount}>
                        {walletData ? formatCurrency(walletData.balance) : '₦0.00'}
                    </Text>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <MaterialIcons name="search" size={20} color={COLORS.textTertiary} style={styles.searchIcon} />
                    <Input
                        flex={1}
                        variant="unstyled"
                        placeholder="Search transactions..."
                        placeholderTextColor={COLORS.textTertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        fontSize={TYPOGRAPHY.fontSizes.base}
                        color={COLORS.textPrimary}
                        _focus={{ borderWidth: 0 }}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                            <MaterialIcons name="close" size={20} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            {/* Content */}
            <View style={styles.content}>
                {/* Filter Chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filtersContainer}
                    contentContainerStyle={styles.filtersContent}
                >
                    {filterOptions.map(renderFilterChip)}
                </ScrollView>

                {/* Transaction List */}
                <FlatList
                    data={filteredTransactions}
                    renderItem={renderTransaction}
                    keyExtractor={(item) => item._id}
                    style={styles.transactionsList}
                    contentContainerStyle={styles.transactionsContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={renderEmptyState}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
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
        marginBottom: SPACING.xl,
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
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        marginBottom: SPACING.xl,
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
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.withOpacity(COLORS.white, 0.2),
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.xs,
        minHeight: 48,
    },
    searchIcon: {
        marginRight: SPACING.sm,
    },
    clearButton: {
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
    filtersContainer: {
        marginBottom: SPACING.base,
    },
    filtersContent: {
        paddingHorizontal: SPACING.xl,
        gap: SPACING.sm,
    },
    filterChip: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterChipSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterChipText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    filterChipTextSelected: {
        color: COLORS.textInverse,
    },
    transactionsList: {
        flex: 1,
    },
    transactionsContent: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING['4xl'],
    },
    transactionCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    transactionLeft: {
        flexDirection: 'row',
        flex: 1,
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.base,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionDescription: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    transactionReference: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginBottom: 2,
        fontFamily: 'monospace',
    },
    transactionRecipient: {
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
        fontSize: TYPOGRAPHY.fontSizes.base,
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
    separator: {
        height: SPACING.base,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: SPACING['4xl'],
    },
    emptyStateTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textSecondary,
        marginTop: SPACING.base,
        marginBottom: SPACING.xs,
    },
    emptyStateText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textTertiary,
        textAlign: 'center',
        lineHeight: TYPOGRAPHY.fontSizes.base * 1.4,
    },
});