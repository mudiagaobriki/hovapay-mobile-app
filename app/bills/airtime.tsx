// app/bills/airtime.tsx - Fixed Implementation with Proper Error Handling
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
  TextInput,
} from 'react-native';
import { Text } from 'native-base';
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

  const { data: airtimeServices, isLoading: servicesLoading } = useGetServicesByCategoryQuery('airtime');
  const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
  const [payBill, { isLoading }] = usePayBillMutation();

  console.log("airtime services: ", airtimeServices);

  // Filter and map networks properly
  const networks = airtimeServices?.content?.filter(service => {
    const serviceId = service.serviceID.toLowerCase();
    return ['mtn', 'airtel', 'glo', 'etisalat', '9mobile'].includes(serviceId);
  }) || [];

  console.log("networks: ", networks);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const validatePhoneNumber = (phone: string, network: string) => {
    // VTPass sandbox test numbers - allow these for any network
    const testNumbers = [
      '08011111111', // Successful test
      '201000000000', // Pending test
      '500000000000', // Unexpected response test
      '400000000000', // No response test
      '300000000000', // Timeout test
    ];

    // If it's a test number, allow it for any network
    if (testNumbers.includes(phone)) {
      return true;
    }

    // Regular validation for real phone numbers
    const networkPrefixes = {
      'mtn': ['0803', '0806', '0813', '0816', '0903', '0906', '0913', '0916'],
      'airtel': ['0802', '0808', '0812', '0901', '0907', '0911'],
      'glo': ['0805', '0807', '0811', '0815', '0905', '0915'],
      'etisalat': ['0809', '0817', '0818', '0908', '0909'],
      '9mobile': ['0809', '0817', '0818', '0908', '0909']
    };

    const prefix = phone.substring(0, 4);
    const validPrefixes = networkPrefixes[network.toLowerCase()] || [];

    return validPrefixes.includes(prefix);
  };

  const handlePurchase = async (values: any) => {
    if (!selectedNetwork) {
      Alert.alert('Error', 'Please select a network');
      return;
    }

    // Validate phone number against selected network
    if (!validatePhoneNumber(values.phone, selectedNetwork.serviceID)) {
      Alert.alert(
          'Invalid Phone Number',
          `The phone number ${values.phone} does not match the selected ${selectedNetwork.name} network. Please check and try again.`
      );
      return;
    }

    // Check wallet balance
    if (walletData && values.amount > walletData.data.balance) {
      const shortfall = values.amount - walletData.data.balance;
      Alert.alert(
          'Insufficient Balance',
          `You need ${formatCurrency(shortfall)} more to complete this transaction.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Fund Wallet',
              onPress: () => router.push('/(tabs)/wallet'),
              style: 'default'
            }
          ]
      );
      return;
    }

    try {
      // Prepare the payload according to VTPass airtime API specification
      const payload = {
        request_id: `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        serviceID: selectedNetwork.serviceID,
        amount: Number(values.amount),
        phone: values.phone.startsWith('0') ? values.phone.substring(1) : values.phone,
      };

      console.log('Sending airtime purchase request:', payload);

      const result = await payBill(payload).unwrap();

      console.log('Airtime purchase result:', result);

      // Check the actual success status from the response
      const isActuallySuccessful = result.success === true;

      console.log('Transaction status check:', {
        resultSuccess: result.success,
        resultMessage: result.message,
        resultData: result.data,
        isActuallySuccessful
      });

      // Refetch wallet balance to update UI
      refetchWallet();

      if (isActuallySuccessful) {
        // Success
        Alert.alert(
            'Purchase Successful!',
            `₦${values.amount} ${selectedNetwork.name} airtime has been sent to ${values.phone}`,
            [
              {
                text: 'View Receipt',
                onPress: () => {
                  router.push({
                    pathname: '/bills/receipt',
                    params: {
                      transactionRef: result.data?.transactionRef || payload.request_id,
                      type: 'airtime',
                      network: selectedNetwork.name,
                      phone: values.phone,
                      amount: values.amount,
                      status: 'successful'
                    }
                  });
                }
              },
              {
                text: 'Done',
                onPress: () => router.back(),
                style: 'default'
              }
            ]
        );
      } else {
        // Transaction failed
        const errorMessage = result.message || result.data?.vtpassResponse?.message || 'Transaction failed. Please try again.';

        Alert.alert(
            'Transaction Failed',
            errorMessage,
            [
              {
                text: 'View Details',
                onPress: () => {
                  router.push({
                    pathname: '/bills/receipt',
                    params: {
                      transactionRef: result.data?.transactionRef || payload.request_id,
                      type: 'airtime',
                      network: selectedNetwork.name,
                      phone: values.phone,
                      amount: values.amount,
                      status: 'failed',
                      errorMessage: errorMessage
                    }
                  });
                }
              },
              {
                text: 'Try Again',
                style: 'default'
              }
            ]
        );
      }
    } catch (error: any) {
      console.error('Airtime purchase error:', error);

      let errorMessage = 'Something went wrong. Please try again.';

      if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Purchase Failed', errorMessage, [
        {
          text: 'OK',
          style: 'default'
        }
      ]);
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
        <Text style={styles.networkName} numberOfLines={1} ellipsizeMode='tail'>{network.name.split(' ')[0]}</Text>
        {selectedNetwork?.serviceID === network.serviceID && (
            <View style={styles.selectedBadge}>
              <MaterialIcons name="check" size={16} color={COLORS.textInverse} />
            </View>
        )}
      </TouchableOpacity>
  );

  const renderQuickAmount = (amount: number, setFieldValue: (field: string, value: any) => void) => (
      <TouchableOpacity
          key={amount}
          style={[
            styles.amountCard,
            selectedAmount === amount && styles.amountCardSelected
          ]}
          onPress={() => {
            setSelectedAmount(amount);
            setFieldValue('amount', amount.toString()); // Set the form field value
          }}
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
              initialValues={{ phone: '', amount: '' }}
              validationSchema={AirtimeSchema}
              onSubmit={handlePurchase}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
                <>
                  {/* Network Selection */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Network</Text>
                    {servicesLoading ? (
                        <View style={styles.loadingContainer}>
                          <Text style={styles.loadingText}>Loading networks...</Text>
                        </View>
                    ) : (
                        <View style={styles.networksGrid}>
                          {networks.map(renderNetwork)}
                        </View>
                    )}
                  </View>

                  {/* Phone Number */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Phone Number</Text>
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
                      <TextInput
                          style={styles.textInput}
                          placeholder="08012345678"
                          placeholderTextColor={COLORS.textTertiary}
                          value={values.phone}
                          onChangeText={handleChange('phone')}
                          onBlur={handleBlur('phone')}
                          keyboardType="phone-pad"
                          maxLength={11}
                          returnKeyType="next"
                      />
                    </View>
                    {touched.phone && errors.phone && (
                        <Text style={styles.errorText}>{errors.phone}</Text>
                    )}
                  </View>

                  {/* Quick Amounts */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Amount</Text>
                    <View style={styles.amountsGrid}>
                      {quickAmounts.map(amount => renderQuickAmount(amount, setFieldValue))}
                    </View>
                  </View>

                  {/* Custom Amount */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Or Enter Amount</Text>
                    <View style={[
                      styles.inputContainer,
                      touched.amount && errors.amount && styles.inputContainerError
                    ]}>
                      <Text style={styles.currencySymbol}>₦</Text>
                      <TextInput
                          style={styles.textInput}
                          placeholder="0"
                          placeholderTextColor={COLORS.textTertiary}
                          value={values.amount.toString()}
                          onChangeText={(text) => {
                            setFieldValue('amount', text);
                            // Reset selected amount when typing custom amount
                            if (text && !quickAmounts.includes(Number(text))) {
                              setSelectedAmount(null);
                            }
                          }}
                          onBlur={handleBlur('amount')}
                          keyboardType="numeric"
                          returnKeyType="done"
                      />
                    </View>
                    {touched.amount && errors.amount && (
                        <Text style={styles.errorText}>{errors.amount}</Text>
                    )}
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
                      onPress={() => handleSubmit()}
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.base,
  },
  loadingText: {
    marginLeft: SPACING.sm,
    color: COLORS.textSecondary,
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
    maxHeight: 100,
    // ...SHADOWS.sm,
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
  textInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.textPrimary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
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
});