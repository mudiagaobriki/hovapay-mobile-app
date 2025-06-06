// app/(tabs)/bills.tsx
import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { Text, Input } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    useGetServiceCategoriesQuery,
    useGetWalletBalanceQuery
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

// Enhanced service category mapping
const getCategoryIcon = (identifier: string): string => {
    const iconMap: { [key: string]: string } = {
        'airtime': 'phone',
        'data': 'wifi',
        'tv-subscription': 'tv',
        'electricity-bill': 'flash-on',
        'education': 'school',
        'insurance': 'security',
        'other-services': 'more-horiz',
        'bulk-sms': 'sms',
    };
    return iconMap[identifier] || 'receipt';
};

const getCategoryColor = (identifier: string): string => {
    const colorMap: { [key: string]: string } = {
        'airtime': '#10B981',
        'data': '#3B82F6',
        'tv-subscription': '#EF4444',
        'electricity-bill': '#F59E0B',
        'education': '#8B5CF6',
        'insurance': '#6366F1',
        'other-services': '#9CA3AF',
        'bulk-sms': '#F97316',
    };
    return colorMap[identifier] || '#6B7280';
};

const getCategoryDescription = (identifier: string): string => {
    const descriptionMap: { [key: string]: string } = {
        'airtime': 'Buy airtime for all networks',
        'data': 'Purchase data bundles',
        'tv-subscription': 'Pay for cable TV subscriptions',
        'electricity-bill': 'Pay electricity bills',
        'education': 'Educational payments & PINs',
        'insurance': 'Insurance payments',
        'other-services': 'Other merchant services',
        'bulk-sms': 'Send bulk SMS messages',
    };
    return descriptionMap[identifier] || 'Various services available';
};

// Navigation mapping
const getNavigationRoute = (identifier: string): string => {
    const routeMap: { [key: string]: string } = {
        'airtime': '/bills/airtime',
        'data': '/bills/data',
        'tv-subscription': '/bills/tv-subscription',
        'electricity-bill': '/bills/electricity',
        'education': '/bills/education',
        'insurance': '/bills/insurance',
        'other-services': '/bills/other-services',
        'bulk-sms': '/bills/bulk-sms',
    };
    return routeMap[identifier] || '/bills/other-services';
};

// Popular services data
const popularServices = [
    {
        id: 'mtn-airtime',
        name: 'MTN Airtime',
        icon: 'phone',
        color: '#FFCC02',
        route: '/bills/airtime',
        category: 'Airtime',
    },
    {
        id: 'electricity',
        name: 'Electricity',
        icon: 'flash-on',
        color: '#F59E0B',
        route: '/bills/electricity',
        category: 'Utilities',
    },
    {
        id: 'data-bundles',
        name: 'Data Bundles',
        icon: 'wifi',
        color: '#3B82F6',
        route: '/bills/data',
        category: 'Internet',
    },
    {
        id: 'dstv',
        name: 'DSTV',
        icon: 'tv',
        color: '#EF4444',
        route: '/bills/tv-subscription',
        category: 'Entertainment',
    },
    {
        id: 'bulk-sms',
        name: 'Bulk SMS',
        icon: 'sms',
        color: '#F97316',
        route: '/bills/bulk-sms',
        category: 'Messaging',
    },
    {
        id: 'education',
        name: 'Education',
        icon: 'school',
        color: '#8B5CF6',
        route: '/bills/education',
        category: 'Academic',
    },
];

export default function BillsScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const { data: serviceCategories, refetch } = useGetServiceCategoriesQuery();
    const { data: walletData } = useGetWalletBalanceQuery();

    // Enhanced service categories with Bulk SMS
    const enhancedServiceCategories = [
        ...(serviceCategories?.content || []),
        { identifier: 'bulk-sms', name: 'Bulk SMS' }
    ];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await refetch();
        } finally {
            setRefreshing(false);
        }
    };

    const filteredCategories = enhancedServiceCategories.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredPopularServices = popularServices.filter(service =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderServiceCategory = (category: any) => (
        <TouchableOpacity
            key={category.identifier}
            style={styles.categoryCard}
            activeOpacity={0.7}
            onPress={() => router.push(getNavigationRoute(category.identifier))}
        >
            <View style={[
                styles.categoryIcon,
                { backgroundColor: getCategoryColor(category.identifier) + '20' }
            ]}>
                <MaterialIcons
                    name={getCategoryIcon(category.identifier) as any}
                    size={32}
                    color={getCategoryColor(category.identifier)}
                />
            </View>
            <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryDescription}>
                    {getCategoryDescription(category.identifier)}
                </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={COLORS.textTertiary} />
        </TouchableOpacity>
    );

    const renderPopularService = (service: any) => (
        <TouchableOpacity
            key={service.id}
            style={styles.popularServiceCard}
            activeOpacity={0.7}
            onPress={() => router.push(service.route)}
        >
            <View style={[
                styles.popularServiceIcon,
                { backgroundColor: service.color + '20' }
            ]}>
                <MaterialIcons
                    name={service.icon as any}
                    size={24}
                    color={service.color}
                />
            </View>
            <Text style={styles.popularServiceName}>{service.name}</Text>
            <Text style={styles.popularServiceCategory}>{service.category}</Text>
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
                    <Text style={styles.headerTitle}>Bill Payments</Text>
                    <Text style={styles.headerSubtitle}>Pay bills and recharge easily</Text>
                </View>

                {/* Balance Card */}
                <TouchableOpacity style={styles.balanceCard}
                                  onPress={() => router.push('/(tabs)/wallet')}>
                    <Text style={styles.balanceLabel}>Wallet Balance</Text>
                    <Text style={styles.balanceAmount}>
                        {walletData ? formatCurrency(walletData.data.balance) : '₦0.00'}
                    </Text>
                </TouchableOpacity>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <MaterialIcons name="search" size={20} color={COLORS.textTertiary} style={styles.searchIcon} />
                    <Input
                        flex={1}
                        variant="unstyled"
                        placeholder="Search for bills and services..."
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

            {/* Main Content */}
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Popular Services */}
                {(!searchQuery || filteredPopularServices.length > 0) && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Popular Services</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.popularServicesContainer}>
                                {(searchQuery ? filteredPopularServices : popularServices).map(renderPopularService)}
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* All Categories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {searchQuery ? 'Search Results' : 'All Categories'}
                    </Text>

                    {filteredCategories.length > 0 ? (
                        <View style={styles.categoriesContainer}>
                            {filteredCategories.map(renderServiceCategory)}
                        </View>
                    ) : searchQuery ? (
                        <View style={styles.emptySearchState}>
                            <MaterialIcons name="search-off" size={64} color={COLORS.textTertiary} />
                            <Text style={styles.emptyStateTitle}>No results found</Text>
                            <Text style={styles.emptyStateText}>
                                Try searching with different keywords
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Quick Tips */}
                {!searchQuery && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quick Tips</Text>
                        <View style={styles.tipsContainer}>
                            <View style={styles.tipCard}>
                                <MaterialIcons name="account-balance-wallet" size={24} color={COLORS.primary} />
                                <View style={styles.tipContent}>
                                    <Text style={styles.tipTitle}>Fund Your Wallet</Text>
                                    <Text style={styles.tipText}>
                                        Add money to your wallet for faster bill payments
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.tipCard}>
                                <MaterialIcons name="schedule" size={24} color={COLORS.success} />
                                <View style={styles.tipContent}>
                                    <Text style={styles.tipTitle}>Set Reminders</Text>
                                    <Text style={styles.tipText}>
                                        Never miss a bill payment with automatic reminders
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.tipCard}>
                                <MaterialIcons name="history" size={24} color={COLORS.info} />
                                <View style={styles.tipContent}>
                                    <Text style={styles.tipTitle}>Track History</Text>
                                    <Text style={styles.tipText}>
                                        View all your payment history in the transactions tab
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

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
    section: {
        marginBottom: SPACING['2xl'],
        paddingHorizontal: SPACING.xl,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    popularServicesContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.base,
    },
    popularServiceCard: {
        width: 100,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        marginRight: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    popularServiceIcon: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    popularServiceName: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: 2,
    },
    popularServiceCategory: {
        fontSize: TYPOGRAPHY.fontSizes.xs - 1,
        color: COLORS.textTertiary,
        textAlign: 'center',
    },
    categoriesContainer: {
        gap: SPACING.base,
    },
    categoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    categoryIcon: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.base,
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    categoryDescription: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        lineHeight: TYPOGRAPHY.fontSizes.sm * 1.3,
    },
    emptySearchState: {
        alignItems: 'center',
        paddingVertical: SPACING['3xl'],
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
    },
    tipsContainer: {
        gap: SPACING.base,
    },
    tipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tipContent: {
        marginLeft: SPACING.base,
        flex: 1,
    },
    tipTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    tipText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        lineHeight: TYPOGRAPHY.fontSizes.sm * 1.3,
    },
    balanceHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.sm,
    },
    balanceHintText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.withOpacity(COLORS.textInverse, 0.8),
        marginLeft: SPACING.xs,
    },
});