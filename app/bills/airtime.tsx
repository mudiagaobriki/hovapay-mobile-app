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
  TextInput, Modal,
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
import * as LocalAuthentication from 'expo-local-authentication';
import {
  useGetUserProfileQuery,
  useVerifyTransactionPinMutation
} from '@/store/api/profileApi';

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

  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityType, setSecurityType] = useState<'pin' | 'biometric' | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pendingTransaction, setPendingTransaction] = useState<any>(null);

  const { data: airtimeServices, isLoading: servicesLoading } = useGetServicesByCategoryQuery('airtime');
  const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
  const [payBill, { isLoading }] = usePayBillMutation();

  const { data: userProfile } = useGetUserProfileQuery();
  const [verifyPin] = useVerifyTransactionPinMutation();

  // console.log("airtime services: ", airtimeServices);

  // Filter and map networks properly
  const networks = airtimeServices?.content?.filter(service => {
    const serviceId = service.serviceID.toLowerCase();
    return ['mtn', 'airtel', 'glo', 'etisalat', '9mobile'].includes(serviceId);
  }) || [];

  // console.log("networks: ", networks);

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

  const checkSecuritySetup = () => {
    const hasPin = userProfile?.data?.pin; // Pin exists in database
    const hasBiometric = userProfile?.data?.biometricTransactions; // Biometric enabled for transactions

    return {
      hasPin: !!hasPin,
      hasBiometric: !!hasBiometric,
      hasAnySecurity: !!hasPin || !!hasBiometric,
      canUseBiometric: !!hasBiometric && userProfile?.data?.biometricType !== 'none'
    };
  };

  const promptForSecurity = async (transactionData: any) => {
    const security = checkSecuritySetup();

    if (!security.hasAnySecurity) {
      // No security method enabled - redirect to profile
      Alert.alert(
          'Security Setup Required',
          'To make transactions, you need to set up either a transaction PIN or enable biometric authentication.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Setup Security',
              onPress: () => router.push('/(tabs)/profile'),
            }
          ]
      );
      return false;
    }

    setPendingTransaction(transactionData);

    // If both are available, prefer biometric
    if (security.canUseBiometric) {
      return await attemptBiometricAuth();
    } else if (security.hasPin) {
      setSecurityType('pin');
      setShowSecurityModal(true);
      return false; // Will continue after PIN verification
    }

    return false;
  };

  const attemptBiometricAuth = async () => {
    try {
      const biometricAuth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm your transaction',
        subtitle: 'Use your biometric to authorize this payment',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use PIN'
      });

      if (biometricAuth.success) {
        return true;
      } else if (biometricAuth.error === 'UserCancel') {
        return false;
      } else {
        // Biometric failed, try PIN if available
        const security = checkSecuritySetup();
        if (security.hasPin) {
          setSecurityType('pin');
          setShowSecurityModal(true);
        } else {
          Alert.alert('Authentication Failed', 'Biometric authentication failed and no PIN is set up.');
        }
        return false;
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      const security = checkSecuritySetup();
      if (security.hasPin) {
        setSecurityType('pin');
        setShowSecurityModal(true);
      } else {
        Alert.alert('Error', 'Biometric authentication is not available and no PIN is set up.');
      }
      return false;
    }
  };

  const verifyTransactionPin = async () => {
    if (!enteredPin || enteredPin.length !== 4) {
      setPinError('Please enter a 4-digit PIN');
      return false;
    }

    try {
      const result = await verifyPin({ pin: enteredPin }).unwrap();

      if (result.status === 'success') {
        setShowSecurityModal(false);
        setEnteredPin('');
        setPinError('');
        return true;
      } else {
        setPinError('Incorrect PIN. Please try again.');
        return false;
      }
    } catch (error: any) {
      setPinError(error.data?.message || 'PIN verification failed');
      return false;
    }
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

    // Prepare transaction data
    const transactionData = {
      request_id: `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      serviceID: selectedNetwork.serviceID,
      amount: Number(values.amount),
      phone: values.phone.startsWith('0') ? values.phone.substring(1) : values.phone,
      formValues: values // Store form values for later use
    };

    // Check security setup and handle accordingly
    const security = checkSecuritySetup();

    if (!security.hasAnySecurity) {
      // No security method enabled - redirect to profile
      Alert.alert(
          'Security Setup Required',
          'To make transactions, you need to set up either a transaction PIN or enable biometric authentication.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Setup Security',
              onPress: () => router.push('/(tabs)/profile'),
            }
          ]
      );
      return;
    }

    // Store pending transaction
    setPendingTransaction(transactionData);

    // Try biometric first if available
    if (security.canUseBiometric) {
      const biometricSuccess = await attemptBiometricAuth();
      if (biometricSuccess) {
        await processPurchase(transactionData);
      }
    } else if (security.hasPin) {
      // Show PIN modal
      setSecurityType('pin');
      setShowSecurityModal(true);
    }
  };

  const processPurchase = async (transactionData: any) => {
    try {
      // console.log('Sending airtime purchase request:', transactionData);

      // Create the payload for the API
      const payload = {
        request_id: transactionData.request_id,
        serviceID: transactionData.serviceID,
        amount: transactionData.amount,
        phone: transactionData.phone,
      };

      console.log("Here-----------------")

      const result = await payBill(payload).unwrap();
      console.log('Airtime purchase result:', result);

      const isActuallySuccessful = result.success === true;

      // Refetch wallet balance to update UI
      refetchWallet();

      // Get form values for display
      const formValues = transactionData.formValues || {
        phone: `0${transactionData.phone}`,
        amount: transactionData.amount
      };

      if (isActuallySuccessful) {
        // Success
        Alert.alert(
            'Purchase Successful!',
            `₦${formValues.amount} ${selectedNetwork.name} airtime has been sent to ${formValues.phone}`,
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
                      phone: formValues.phone,
                      amount: formValues.amount,
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
                      phone: formValues.phone,
                      amount: formValues.amount,
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

  // const handlePurchase = async (values: any) => {
  //   if (!selectedNetwork) {
  //     Alert.alert('Error', 'Please select a network');
  //     return;
  //   }
  //
  //   // Validate phone number against selected network
  //   if (!validatePhoneNumber(values.phone, selectedNetwork.serviceID)) {
  //     Alert.alert(
  //         'Invalid Phone Number',
  //         `The phone number ${values.phone} does not match the selected ${selectedNetwork.name} network. Please check and try again.`
  //     );
  //     return;
  //   }
  //
  //   // Check wallet balance
  //   if (walletData && values.amount > walletData.data.balance) {
  //     const shortfall = values.amount - walletData.data.balance;
  //     Alert.alert(
  //         'Insufficient Balance',
  //         `You need ${formatCurrency(shortfall)} more to complete this transaction.`,
  //         [
  //           { text: 'Cancel', style: 'cancel' },
  //           {
  //             text: 'Fund Wallet',
  //             onPress: () => router.push('/(tabs)/wallet'),
  //             style: 'default'
  //           }
  //         ]
  //     );
  //     return;
  //   }
  //
  //   try {
  //     // Prepare the payload according to VTPass airtime API specification
  //     const payload = {
  //       request_id: `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  //       serviceID: selectedNetwork.serviceID,
  //       amount: Number(values.amount),
  //       phone: values.phone.startsWith('0') ? values.phone.substring(1) : values.phone,
  //     };
  //
  //     console.log('Sending airtime purchase request:', payload);
  //
  //     const result = await payBill(payload).unwrap();
  //
  //     console.log('Airtime purchase result:', result);
  //
  //     // Check the actual success status from the response
  //     const isActuallySuccessful = result.success === true;
  //
  //     console.log('Transaction status check:', {
  //       resultSuccess: result.success,
  //       resultMessage: result.message,
  //       resultData: result.data,
  //       isActuallySuccessful
  //     });
  //
  //     // Refetch wallet balance to update UI
  //     refetchWallet();
  //
  //     if (isActuallySuccessful) {
  //       // Success
  //       Alert.alert(
  //           'Purchase Successful!',
  //           `₦${values.amount} ${selectedNetwork.name} airtime has been sent to ${values.phone}`,
  //           [
  //             {
  //               text: 'View Receipt',
  //               onPress: () => {
  //                 router.push({
  //                   pathname: '/bills/receipt',
  //                   params: {
  //                     transactionRef: result.data?.transactionRef || payload.request_id,
  //                     type: 'airtime',
  //                     network: selectedNetwork.name,
  //                     phone: values.phone,
  //                     amount: values.amount,
  //                     status: 'successful'
  //                   }
  //                 });
  //               }
  //             },
  //             {
  //               text: 'Done',
  //               onPress: () => router.back(),
  //               style: 'default'
  //             }
  //           ]
  //       );
  //     } else {
  //       // Transaction failed
  //       const errorMessage = result.message || result.data?.vtpassResponse?.message || 'Transaction failed. Please try again.';
  //
  //       Alert.alert(
  //           'Transaction Failed',
  //           errorMessage,
  //           [
  //             {
  //               text: 'View Details',
  //               onPress: () => {
  //                 router.push({
  //                   pathname: '/bills/receipt',
  //                   params: {
  //                     transactionRef: result.data?.transactionRef || payload.request_id,
  //                     type: 'airtime',
  //                     network: selectedNetwork.name,
  //                     phone: values.phone,
  //                     amount: values.amount,
  //                     status: 'failed',
  //                     errorMessage: errorMessage
  //                   }
  //                 });
  //               }
  //             },
  //             {
  //               text: 'Try Again',
  //               style: 'default'
  //             }
  //           ]
  //       );
  //     }
  //   } catch (error: any) {
  //     console.error('Airtime purchase error:', error);
  //
  //     let errorMessage = 'Something went wrong. Please try again.';
  //
  //     if (error.data?.message) {
  //       errorMessage = error.data.message;
  //     } else if (error.message) {
  //       errorMessage = error.message;
  //     }
  //
  //     Alert.alert('Purchase Failed', errorMessage, [
  //       {
  //         text: 'OK',
  //         style: 'default'
  //       }
  //     ]);
  //   }
  // };

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

  const SecurityModal = () => (
      <Modal
          visible={showSecurityModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSecurityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Transaction</Text>
              <TouchableOpacity
                  onPress={() => {
                    setShowSecurityModal(false);
                    setEnteredPin('');
                    setPinError('');
                  }}
                  style={styles.modalCloseButton}
              >
                <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.transactionSummary}>
              <Text style={styles.summaryText}>
                {selectedNetwork?.name} Airtime
              </Text>
              <Text style={styles.summaryAmount}>
                {pendingTransaction ? formatCurrency(pendingTransaction.amount) : ''}
              </Text>
              <Text style={styles.summaryPhone}>
                {pendingTransaction ? `0${pendingTransaction.phone}` : ''}
              </Text>
            </View>

            <View style={styles.pinSection}>
              <Text style={styles.pinLabel}>Enter Transaction PIN</Text>
              <View style={styles.pinInputContainer}>
                <TextInput
                    style={styles.pinInput}
                    value={enteredPin}
                    onChangeText={(text) => {
                      setEnteredPin(text.replace(/[^0-9]/g, '').slice(0, 4));
                      setPinError('');
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    placeholder="••••"
                    placeholderTextColor={COLORS.textTertiary}
                />
              </View>
              {pinError ? (
                  <Text style={styles.pinError}>{pinError}</Text>
              ) : null}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowSecurityModal(false);
                    setEnteredPin('');
                    setPinError('');
                  }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    enteredPin.length !== 4 && styles.confirmButtonDisabled
                  ]}
                  onPress={async () => {
                    const verified = await verifyTransactionPin();
                    if (verified && pendingTransaction) {
                      setShowSecurityModal(false);
                      setEnteredPin('');
                      setPinError('');
                      await processPurchase(pendingTransaction);
                    }
                  }}
                  disabled={enteredPin.length !== 4}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
  );

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
          <View style={styles.contentContainer}>
        {/* Main Content */}
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
          </View>
        </ScrollView>
        <SecurityModal />
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingTop: SPACING.md
  },
  header: {
    paddingTop: SPACING.base,
    paddingBottom: SPACING["2.5xl"],
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
    paddingTop: SPACING.sm,
  },
  section: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
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
    // borderWidth: 2,
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
    marginVertical: SPACING['2xl'],
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.textPrimary,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  transactionSummary: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.xl,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  summaryAmount: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  summaryPhone: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.textPrimary,
  },
  pinSection: {
    marginBottom: SPACING.xl,
  },
  pinLabel: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.base,
    textAlign: 'center',
  },
  pinInputContainer: {
    alignItems: 'center',
  },
  pinInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.border,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.xl,
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    textAlign: 'center',
    letterSpacing: 8,
    color: COLORS.textPrimary,
    width: 120,
  },
  pinError: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.error,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.base,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.textSecondary,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
    opacity: 0.6,
  },
  confirmButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.textInverse,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    backgroundColor: COLORS.background,
    // borderTopLeftRadius: RADIUS['2xl'],
    // borderTopRightRadius: RADIUS['2xl'],
    marginTop: -SPACING.base,
    paddingTop: SPACING.sm,
    flex: 1,
  },
});