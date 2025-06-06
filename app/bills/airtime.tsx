// app/bills/airtime.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { Text, Input, FormControl } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
  useGetServicesByCategoryQuery,
  usePayBillMutation,
  useGetWalletBalanceQuery
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

const AirtimeSchema = Yup.object().shape({
  phone: Yup.string()
      .matches(/^[0-9]{11}$/, 'Phone number must be 11 digits')
      .required('Phone number is required'),
  amount: Yup.number()
      .min(10, 'Minimum amount is ₦10')
      .max(50000, 'Maximum amount is ₦50,000')
      .required('Amount is required'),
});

const quickAmounts = [50, 100, 200, 500, 1000, 2000];

interface NetworkService {
  serviceID: string;
  name: string;
  image: string;
  [key: string]: any;
}

export default function AirtimeScreen() {
  const router = useRouter();
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkService | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const { data: airtimeServices } = useGetServicesByCategoryQuery('airtime');
  const { data: walletData } = useGetWalletBalanceQuery();
  const [payBill, { isLoading }] = usePayBillMutation();

  const networks = airtimeServices?.content?.filter(service =>
      ['mtn', 'airtel', 'glo', 'etisalat'].includes(service.serviceID)
  ) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handlePurchase = async (values: any) => {
    if (!selectedNetwork) {
      Alert.alert('Error', 'Please select a network');
      return;
    }

    // console.log({walletData})

    if (walletData && values.amount > walletData.data.balance) {
      const shortfall = values.amount - walletData.data.balance;
      Alert.alert(
          'Insufficient Balance',
          `You need ${formatCurrency(shortfall)} more to complete this transaction.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go to Wallet',
              onPress: () => router.push('/(tabs)/wallet'), // Navigate to wallet tab
              style: 'default'
            }
          ]
      );
      return;
    }

    try {
      const result = await payBill({
        serviceID: selectedNetwork.serviceID,
        amount: values.amount,
        phone: `+234${values.phone.substring(1)}`, // Convert to international format
      }).unwrap();

      Alert.alert(
          'Purchase Successful!',
          `₦${values.amount} airtime has been sent to ${values.phone}`,
          [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
          'Purchase Failed',
          error.message || 'Something went wrong. Please try again.'
      );
    }
  };

  const renderNetwork = (network: NetworkService) => (
      <TouchableOpacity
          key={network.serviceID}
          style={[
            styles.networkCard,
            selectedNetwork?.serviceID === network.serviceID && styles.networkCardSelected
          ]}
          onPress={() => setSelectedNetwork(network)}
      >
        <Image
            source={{ uri: network.image }}
            style={styles.networkImage}
            resizeMode="contain"
        />
        <Text style={styles.networkName}>{network.name.split(' ')[0]}</Text>
        {selectedNetwork?.serviceID === network.serviceID && (
            <View style={styles.selectedBadge}>
              <MaterialIcons name="check" size={16} color={COLORS.textInverse} />
            </View>
        )}
      </TouchableOpacity>
  );

  const renderQuickAmount = (amount: number) => (
      <TouchableOpacity
          key={amount}
          style={[
            styles.amountCard,
            selectedAmount === amount && styles.amountCardSelected
          ]}
          onPress={() => setSelectedAmount(amount)}
      >
        <Text style={[
          styles.amountText,
          selectedAmount === amount && styles.amountTextSelected
        ]}>
          {formatCurrency(amount)}
        </Text>
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.textInverse} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Buy Airtime</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Wallet Balance</Text>
            <Text style={styles.balanceAmount}>
              {walletData ? formatCurrency(walletData.data.balance) : '₦0.00'}
            </Text>
          </View>
        </LinearGradient>

        {/* Main Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Formik
              initialValues={{ phone: '', amount: selectedAmount || '' }}
              validationSchema={AirtimeSchema}
              onSubmit={handlePurchase}
              enableReinitialize
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
                <>
                  {/* Network Selection */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Network</Text>
                    <View style={styles.networksGrid}>
                      {networks.map(renderNetwork)}
                    </View>
                  </View>

                  {/* Phone Number */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Phone Number</Text>
                    <FormControl isInvalid={touched.phone && errors.phone}>
                      <View style={[
                        styles.inputContainer,
                        touched.phone && errors.phone && styles.inputContainerError
                      ]}>
                        <MaterialIcons
                            name="phone"
                            size={20}
                            color={COLORS.textTertiary}
                            style={styles.inputIcon}
                        />
                        <Input
                            flex={1}
                            variant="unstyled"
                            placeholder="08012345678"
                            placeholderTextColor={COLORS.textTertiary}
                            value={values.phone}
                            onChangeText={handleChange('phone')}
                            onBlur={handleBlur('phone')}
                            keyboardType="phone-pad"
                            maxLength={11}
                            fontSize={TYPOGRAPHY.fontSizes.base}
                            color={COLORS.textPrimary}
                            _focus={{ borderWidth: 0 }}
                        />
                      </View>
                      {touched.phone && errors.phone && (
                          <Text style={styles.errorText}>{errors.phone}</Text>
                      )}
                    </FormControl>
                  </View>

                  {/* Quick Amounts */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Amount</Text>
                    <View style={styles.amountsGrid}>
                      {quickAmounts.map(renderQuickAmount)}
                    </View>
                  </View>

                  {/* Custom Amount */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Or Enter Amount</Text>
                    <FormControl isInvalid={touched.amount && errors.amount}>
                      <View style={[
                        styles.inputContainer,
                        touched.amount && errors.amount && styles.inputContainerError
                      ]}>
                        <Text style={styles.currencySymbol}>₦</Text>
                        <Input
                            flex={1}
                            variant="unstyled"
                            placeholder="0"
                            placeholderTextColor={COLORS.textTertiary}
                            value={values.amount.toString()}
                            onChangeText={(text) => {
                              setFieldValue('amount', text);
                              setSelectedAmount(null);
                            }}
                            onBlur={handleBlur('amount')}
                            keyboardType="numeric"
                            fontSize={TYPOGRAPHY.fontSizes.base}
                            color={COLORS.textPrimary}
                            _focus={{ borderWidth: 0 }}
                        />
                      </View>
                      {touched.amount && errors.amount && (
                          <Text style={styles.errorText}>{errors.amount}</Text>
                      )}
                    </FormControl>
                  </View>

                  {/* Purchase Summary */}
                  {selectedNetwork && values.amount && (
                      <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>Purchase Summary</Text>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Network:</Text>
                          <Text style={styles.summaryValue}>{selectedNetwork.name.split(' ')[0]}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Phone:</Text>
                          <Text style={styles.summaryValue}>{values.phone}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Amount:</Text>
                          <Text style={styles.summaryValue}>{formatCurrency(Number(values.amount))}</Text>
                        </View>
                        <View style={[styles.summaryRow, styles.summaryTotal]}>
                          <Text style={styles.summaryTotalLabel}>Total:</Text>
                          <Text style={styles.summaryTotalValue}>{formatCurrency(Number(values.amount))}</Text>
                        </View>
                      </View>
                  )}

                  {/* Purchase Button */}
                  <TouchableOpacity
                      style={[
                        styles.purchaseButton,
                        (!selectedNetwork || !values.amount || !values.phone || isLoading) && styles.purchaseButtonDisabled
                      ]}
                      onPress={() => {
                        if (selectedAmount && selectedAmount !== values.amount) {
                          setFieldValue('amount', selectedAmount);
                        }
                        handleSubmit();
                      }}
                      disabled={!selectedNetwork || !values.amount || !values.phone || isLoading}
                  >
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                          <MaterialIcons name="hourglass-empty" size={20} color={COLORS.textInverse} />
                          <Text style={styles.purchaseButtonText}>Processing...</Text>
                        </View>
                    ) : (
                        <Text style={styles.purchaseButtonText}>
                          Buy Airtime - {values.amount ? formatCurrency(Number(values.amount)) : '₦0'}
                        </Text>
                    )}
                  </TouchableOpacity>
                </>
            )}
          </Formik>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.textInverse,
  },
  placeholder: {
    width: 32,
  },
  balanceCard: {
    backgroundColor: COLORS.withOpacity(COLORS.white, 0.15),
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    alignItems: 'center',
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
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS['2xl'],
    borderTopRightRadius: RADIUS['2xl'],
    marginTop: -SPACING.base,
    paddingTop: SPACING.xl,
  },
  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.base,
  },
  networksGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  networkCard: {
    width: (width - SPACING.xl * 2 - SPACING.base * 3) / 4,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: SPACING.base,
    position: 'relative',
    ...SHADOWS.sm,
  },
  networkCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBackground,
  },
  networkImage: {
    width: 40,
    height: 40,
    marginBottom: SPACING.sm,
  },
  networkName: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.xs,
    minHeight: 56,
  },
  inputContainerError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.withOpacity(COLORS.error, 0.05),
  },
  inputIcon: {
    marginRight: SPACING.md,
  },
  currencySymbol: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginLeft: SPACING.xs,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  amountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  amountCard: {
    width: (width - SPACING.xl * 2 - SPACING.base * 2) / 3,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.base,
  },
  amountCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  amountText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.textSecondary,
  },
  amountTextSelected: {
    color: COLORS.textInverse,
  },
  summaryCard: {
    margin: SPACING.xl,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  summaryTitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.base,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.textPrimary,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  summaryTotalLabel: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.textPrimary,
  },
  summaryTotalValue: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.primary,
  },
  purchaseButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING['2xl'],
    minHeight: 56,
    ...SHADOWS.colored(COLORS.primary),
  },
  purchaseButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: COLORS.textInverse,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});