// app/(tabs)/index.tsx - Complete Updated Dashboard with Fixed Transactions
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
// Use the typed hooks
import { useAppSelector } from '@/store/hooks';
import { selectCurrentUser } from '@/store/slices/authSlice';
import { handleLogout } from '@/utils/auth';
import {
  useGetWalletBalanceQuery,
  useGetServiceCategoriesQuery,
  useGetServicesByCategoryQuery,
  useGetTransactionHistoryQuery,
  useGetBillHistoryQuery,
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  route: string;
}

// Service category to route mapping
const getCategoryRoute = (identifier: string): string => {
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

// Service category to icon mapping
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

// Service category to color mapping
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

export default function DashboardScreen() {
  const router = useRouter();
  // Use the typed selector
  const user = useAppSelector(selectCurrentUser);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);

  // API queries
  const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
  const { data: serviceCategories } = useGetServiceCategoriesQuery();

  // Fetch both wallet transactions and bill payment history
  const { data: walletTransactionData } = useGetTransactionHistoryQuery({
    page: 1,
    limit: 5
  });

  const { data: billHistoryData } = useGetBillHistoryQuery({
    page: 1,
    limit: 5
  });

  // Get common bill services
  const { data: electricityServices } = useGetServicesByCategoryQuery('electricity-bill');
  const { data: airtimeServices } = useGetServicesByCategoryQuery('airtime');
  const { data: dataServices } = useGetServicesByCategoryQuery('data');
  const { data: tvServices } = useGetServicesByCategoryQuery('tv-subscription');

  // Debug logs
  console.log('Dashboard Debug:');
  console.log('walletTransactionData:', walletTransactionData);
  console.log('billHistoryData:', billHistoryData);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchWallet();
    } finally {
      setRefreshing(false);
    }
  };

  // Updated quick actions with navigation routes
  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Buy Airtime',
      icon: 'phone',
      route: '/bills/airtime',
    },
    {
      id: '2',
      title: 'Buy Data',
      icon: 'wifi',
      route: '/bills/data',
    },
    {
      id: '3',
      title: 'Pay Electric',
      icon: 'flash-on',
      route: '/bills/electricity',
    },
    {
      id: '4',
      title: 'Send SMS',
      icon: 'sms',
      route: '/bills/bulk-sms',
    },
  ];

  // Enhanced service categories with Bulk SMS
  const enhancedServiceCategories = [
    ...(serviceCategories?.content || []),
    { identifier: 'bulk-sms', name: 'Bulk SMS' }
  ];

  // Combine and sort transactions - Corrected based on actual API response
  const getAllTransactions = () => {
    // Wallet transactions structure: { transactions: [...], pagination: {...} }
    const walletTransactions = walletTransactionData?.transactions || [];

    // Bill history structure: { docs: [...], totalDocs: 8, limit: 10, etc }
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
        metadata: {
          serviceType: bill.serviceType,
          serviceID: bill.serviceID,
          phone: bill.phone,
          vtpassRef: bill.vtpassRef,
          responseData: bill.responseData
        }
      };
    });

    console.log('Normalized bill transactions:', normalizedBillTransactions);

    // Combine and sort by date (newest first)
    const allTransactions = [...walletTransactions, ...normalizedBillTransactions];
    const sortedTransactions = allTransactions.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log('Final sorted transactions:', sortedTransactions.length);
    return sortedTransactions;
  };

  // Enhanced renderTransaction function
  const renderTransaction = (transaction: any) => {
    const getTransactionIcon = (type: string, status?: string) => {
      if (type === 'bill_payment') {
        if (status === 'failed') return 'error';
        if (status === 'pending') return 'hourglass-empty';
        return 'receipt';
      }

      switch (type) {
        case 'deposit':
          return 'add';
        case 'transfer':
          return 'swap-horiz';
        case 'refund':
          return 'keyboard-return';
        default:
          return 'receipt';
      }
    };

    const getTransactionTitle = (transaction: any) => {
      if (transaction.type === 'bill_payment') {
        if (transaction.serviceType && transaction.serviceID) {
          const networkName = transaction.serviceID.toUpperCase();
          const serviceType = transaction.serviceType.charAt(0).toUpperCase() +
              transaction.serviceType.slice(1);
          return `${networkName} ${serviceType}`;
        }
        return transaction.description || 'Bill Payment';
      }
      return transaction.description || transaction.type || 'Transaction';
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
      }
      return formatDate(transaction.createdAt || transaction.date);
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'completed':
        case 'success':
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

    return (
        <TouchableOpacity
            key={transaction.id || transaction._id}
            style={styles.transactionItem}
            onPress={() => {
              if (transaction.type === 'bill_payment' && transaction.reference) {
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
                // Navigate to transactions tab for wallet transactions
                router.push('/(tabs)/transactions');
              }
            }}
            activeOpacity={0.7}
        >
          <View style={styles.transactionLeft}>
            <View style={[
              styles.transactionIcon,
              { backgroundColor: getStatusColor(transaction.status) + '20' }
            ]}>
              <MaterialIcons
                  name={getTransactionIcon(transaction.type, transaction.status)}
                  size={16}
                  color={getStatusColor(transaction.status)}
              />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionService}>
                {getTransactionTitle(transaction)}
              </Text>
              <Text style={styles.transactionDate}>
                {getTransactionSubtitle(transaction)}
              </Text>
            </View>
          </View>
          <View style={styles.transactionRight}>
            <Text style={[
              styles.transactionAmount,
              {
                color: transaction.type === 'deposit' || transaction.type === 'refund'
                    ? COLORS.success
                    : COLORS.textPrimary
              }
            ]}>
              {transaction.type === 'deposit' || transaction.type === 'refund' ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(transaction.status) + '20' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getStatusColor(transaction.status) }
              ]}>
                {transaction.status}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

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

  const renderServiceCategory = (category: any) => (
      <TouchableOpacity
          key={category.identifier}
          style={styles.serviceCard}
          activeOpacity={0.7}
          onPress={() => router.push(getCategoryRoute(category.identifier))}
      >
        <View style={[
          styles.serviceIcon,
          { backgroundColor: getCategoryColor(category.identifier) + '20' }
        ]}>
          <MaterialIcons
              name={getCategoryIcon(category.identifier) as any}
              size={20}
              color={getCategoryColor(category.identifier)}
          />
        </View>
        <Text style={styles.serviceName}>{category.name}</Text>
      </TouchableOpacity>
  );

  const renderQuickAction = (action: QuickAction) => (
      <TouchableOpacity
          key={action.id}
          style={styles.quickActionCard}
          activeOpacity={0.7}
          onPress={() => router.push(action.route)}
      >
        <View style={styles.quickActionIcon}>
          <MaterialIcons name={action.icon as any} size={18} color={COLORS.primary} />
        </View>
        <Text style={styles.quickActionTitle}>{action.title}</Text>
      </TouchableOpacity>
  );

  return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* Header with gradient */}
        <LinearGradient
            colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
            style={styles.header}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.username}>{user?.username || 'User'}</Text>
              {!user?.verified && (
                  <Text style={styles.verificationWarning}>⚠️ Please verify your email</Text>
              )}
            </View>
            <TouchableOpacity
                style={styles.profileButton}
                onPress={() => router.push('/(tabs)/profile')}
            >
              <MaterialIcons name="account-circle" size={32} color={COLORS.textInverse} />
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
                  ? (walletData?.data ? formatCurrency(walletData.data.balance) : '₦0.00')
                  : '****'
              }
            </Text>
            <TouchableOpacity
                style={styles.addMoneyButton}
                onPress={() => router.push('/wallet/fund')}
            >
              <MaterialIcons name="add" size={16} color={COLORS.textInverse} />
              <Text style={styles.addMoneyText}>Add Money</Text>
            </TouchableOpacity>
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
          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map(renderQuickAction)}
            </View>
          </View>

          {/* Service Categories */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bill Services</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bills')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.servicesGrid}>
              {enhancedServiceCategories.slice(0, 8).map(renderServiceCategory)}
            </View>
          </View>

          {/* Popular Services */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Services</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/bills')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.horizontalServicesList}>
                {/* MTN Services */}
                {airtimeServices?.content?.filter(service =>
                    service.serviceID === 'mtn'
                ).map((service: any) => (
                    <TouchableOpacity
                        key={`${service.serviceID}-airtime`}
                        style={styles.horizontalServiceCard}
                        onPress={() => router.push('/bills/airtime')}
                    >
                      <Image
                          source={{ uri: service.image }}
                          style={styles.serviceImage}
                          resizeMode="contain"
                      />
                      <Text style={styles.horizontalServiceName}>MTN</Text>
                      <Text style={styles.serviceType}>Airtime</Text>
                    </TouchableOpacity>
                ))}

                {/* MTN Data */}
                {dataServices?.content?.filter(service =>
                    service.serviceID === 'mtn-data'
                ).map((service: any) => (
                    <TouchableOpacity
                        key={`${service.serviceID}-data`}
                        style={styles.horizontalServiceCard}
                        onPress={() => router.push('/bills/data')}
                    >
                      <Image
                          source={{ uri: service.image }}
                          style={styles.serviceImage}
                          resizeMode="contain"
                      />
                      <Text style={styles.horizontalServiceName}>MTN</Text>
                      <Text style={styles.serviceType}>Data</Text>
                    </TouchableOpacity>
                ))}

                {/* Electricity Services */}
                {electricityServices?.content?.slice(0, 2).map((service: any) => (
                    <TouchableOpacity
                        key={`${service.serviceID}-electric`}
                        style={styles.horizontalServiceCard}
                        onPress={() => router.push('/bills/electricity')}
                    >
                      <Image
                          source={{ uri: service.image }}
                          style={styles.serviceImage}
                          resizeMode="contain"
                      />
                      <Text style={styles.horizontalServiceName}>
                        {service.name.split(' ')[0]}
                      </Text>
                      <Text style={styles.serviceType}>Electric</Text>
                    </TouchableOpacity>
                ))}

                {/* TV Services */}
                {tvServices?.content?.slice(0, 2).map((service: any) => (
                    <TouchableOpacity
                        key={`${service.serviceID}-tv`}
                        style={styles.horizontalServiceCard}
                        onPress={() => router.push('/bills/tv-subscription')}
                    >
                      <Image
                          source={{ uri: service.image }}
                          style={styles.serviceImage}
                          resizeMode="contain"
                      />
                      <Text style={styles.horizontalServiceName}>
                        {service.name.split(' ')[0]}
                      </Text>
                      <Text style={styles.serviceType}>TV</Text>
                    </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Recent Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.transactionsList}>
              {(() => {
                // Show loading state while data is being fetched
                if (walletTransactionData === undefined && billHistoryData === undefined) {
                  return (
                      <View style={styles.emptyState}>
                        <MaterialIcons name="hourglass-empty" size={48} color={COLORS.textTertiary} />
                        <Text style={styles.emptyStateText}>Loading transactions...</Text>
                      </View>
                  );
                }

                const allTransactions = getAllTransactions();

                if (allTransactions.length > 0) {
                  return (
                      <>
                        {allTransactions.slice(0, 5).map(renderTransaction)}
                        {/* Show total count if there are more transactions */}
                        {allTransactions.length > 5 && (
                            <View style={styles.moreTransactionsIndicator}>
                              <Text style={styles.moreTransactionsText}>
                                +{allTransactions.length - 5} more transactions
                              </Text>
                            </View>
                        )}
                      </>
                  );
                } else {
                  return (
                      <View style={styles.emptyState}>
                        <MaterialIcons name="receipt-long" size={48} color={COLORS.textTertiary} />
                        <Text style={styles.emptyStateText}>No transactions yet</Text>
                        <Text style={styles.emptyStateSubtext}>
                          Start by buying airtime or paying bills
                        </Text>

                        {/* Debug info in development */}
                        {__DEV__ && (
                            <View style={styles.debugInfo}>
                              <Text style={styles.debugText}>
                                Debug Info:{'\n'}
                                Bills API: {billHistoryData ? 'Connected' : 'No data'}
                                ({billHistoryData?.docs?.length || 0} bills){'\n'}
                                Wallet API: {walletTransactionData ? 'Connected' : 'No data'}
                                ({walletTransactionData?.transactions?.length || 0} transactions)
                              </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.viewHistoryButton}
                            onPress={() => router.push('/bills/airtime')}
                        >
                          <Text style={styles.viewHistoryButtonText}>Make Your First Transaction</Text>
                        </TouchableOpacity>
                      </View>
                  );
                }
              })()}
            </View>
          </View>

          {/* Temporary logout for testing */}
          <View style={styles.section}>
            <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={20} color={COLORS.error} />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
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
  greeting: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.withOpacity(COLORS.textInverse, 0.8),
    marginBottom: SPACING.xs,
  },
  username: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.textInverse,
    textTransform: 'capitalize',
  },
  verificationWarning: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.warning,
    marginTop: SPACING.xs,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  profileButton: {
    padding: SPACING.xs,
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
    fontSize: TYPOGRAPHY.fontSizes['3xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.textInverse,
    marginBottom: SPACING.lg,
    lineHeight: TYPOGRAPHY.fontSizes['3xl'] * 1.4,
    includeFontPadding: false,
    textAlignVertical: 'center',
    paddingVertical: SPACING.xs,
  },
  addMoneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.withOpacity(COLORS.white, 0.2),
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.base,
    alignSelf: 'flex-start',
  },
  addMoneyText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.textInverse,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    marginLeft: SPACING.xs,
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
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
    width: (width - SPACING.xl * 2 - SPACING.base * 3) / 4,
    ...SHADOWS.sm,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.base,
    backgroundColor: COLORS.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  quickActionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    lineHeight: TYPOGRAPHY.fontSizes.xs * 1.2,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
    width: (width - SPACING.xl * 2 - SPACING.base * 3) / 4,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  serviceName: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    lineHeight: TYPOGRAPHY.fontSizes.xs * 1.2,
  },
  horizontalServicesList: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.base,
  },
  horizontalServiceCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    alignItems: 'center',
    marginRight: SPACING.base,
    width: 100,
    ...SHADOWS.sm,
  },
  serviceImage: {
    width: 40,
    height: 40,
    marginBottom: SPACING.sm,
  },
  horizontalServiceName: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    marginBottom: 2,
  },
  serviceType: {
    fontSize: TYPOGRAPHY.fontSizes.xs - 1,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
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
    backgroundColor: COLORS.primaryBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionService: {
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
    color: COLORS.textPrimary,
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
  moreTransactionsIndicator: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    marginTop: SPACING.sm,
  },
  moreTransactionsText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING['2xl'],
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.textSecondary,
    marginTop: SPACING.base,
  },
  emptyStateSubtext: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    marginBottom: SPACING.base,
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
  viewHistoryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.base,
    marginTop: SPACING.sm,
  },
  viewHistoryButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    ...SHADOWS.sm,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.error,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    marginLeft: SPACING.sm,
  },
});