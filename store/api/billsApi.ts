// store/api/billsApi.ts - Enhanced with SMS Support
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';

// Base interfaces
interface WalletBalance {
  balance: number;
  currency: string;
  status: string;
}

interface PaymentVerificationResponse {
  success: boolean;
  message: string;
  data: {
    status: string;
    amount: number;
    reference: string;
    gateway: string;
    channel?: string;
    paidAt?: string;
  };
}

interface FundWalletRequest {
  amount: number;
  gateway: 'paystack' | 'monnify';
}

interface FundWalletResponse {
  success: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bill_payment' | 'transfer' | 'refund';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  reference: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

interface VirtualAccountResponse {
  success: boolean;
  message: string;
  data: {
    accountNumber: string;
    accountName: string;
    bankName: string;
    bankCode: string;
    reservationReference: string;
    status: string;
    createdAt: string;
  };
}

interface ServiceCategory {
  identifier: string;
  name: string;
  description: string;
}

interface BillService {
  serviceID: string;
  name: string;
  image: string;
  description?: string;
  category: string;
  minimumAmount?: number;
  maximumAmount?: number;
  convenienceFee?: string;
  type?: string;
}

interface ServiceVariation {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice: string;
}

interface ServiceVariationsResponse {
  response_description: string;
  content: {
    serviceID: string;
    name: string;
    variations: ServiceVariation[];
  };
}

// NEW: SMS-specific interfaces
interface SMSBalanceResponse {
  success: boolean;
  message: string;
  data: {
    balance: number;
    units: number;
    currency: string;
  };
}

interface BulkSMSRequest {
  recipients: string; // Comma-separated phone numbers or newline-separated
  message: string;
  sender?: string; // Optional sender ID (max 11 characters)
  amount: number;
  paymentMethod?: 'wallet';
}

interface SMSUnitsRequest {
  units: number;
  amount: number;
  paymentMethod?: 'wallet';
}

interface BulkSMSResponse {
  response_description: string;
  success: boolean;
  message: string;
  data: {
    transactionRef: string;
    status: string;
    amount: number;
    serviceID: string;
    serviceType: string;
    walletBalance: number;
    vtpassResponse: {
      code: string;
      message: string;
      batchId: string;
    };
    emailSent: boolean;
    notifications: {
      emailSent: boolean;
      emailAddress: string;
    };
    smsDetails: {
      recipientCount: number;
      messageLength: number;
      totalUnits: number;
      batchId: string;
      sentDate: string;
    };
  };
}

// Insurance-specific interfaces
interface InsuranceVariation {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice: string;
}

interface InsuranceVariationsResponse {
  response_description: string;
  content: {
    ServiceName: string;
    serviceID: string;
    convinience_fee: string;
    variations: InsuranceVariation[];
  };
}

interface VehicleColor {
  ColourCode: string;
  ColourName: string;
}

interface VehicleColorsResponse {
  response_description: string;
  content: VehicleColor[];
}

interface EngineCapacity {
  CapacityCode: string;
  CapacityName: string;
}

interface EngineCapacitiesResponse {
  response_description: string;
  content: EngineCapacity[];
}

interface State {
  StateCode: string;
  StateName: string;
}

interface StatesResponse {
  response_description: string;
  content: State[];
}

interface LGA {
  LGACode: string;
  LGAName: string;
  StateCode: string;
}

interface LGAsResponse {
  response_description: string;
  content: LGA[];
}

interface VehicleMake {
  VehicleMakeCode: string;
  VehicleMakeName: string;
}

interface VehicleMakesResponse {
  response_description: string;
  content: VehicleMake[];
}

interface VehicleModel {
  VehicleModelCode: string;
  VehicleModelName: string;
  VehicleMakeCode: string;
}

interface VehicleModelsResponse {
  response_description: string;
  content: VehicleModel[];
}

interface VerifyCustomerRequest {
  serviceID: string;
  billersCode: string;
  type?: string;
}

interface VerifyCustomerResponse {
  response_description: string;
  content: {
    Customer_Name: string;
    Status: string;
    Product_Name: string;
    Customer_Number: string;
    Address?: string;
    Email?: string;
    Phone?: string;
  };
}

interface PayBillRequest {
  request_id?: string; // Optional - can be generated if not provided
  serviceID: string;
  billersCode?: string; // Optional for airtime, required for other services
  variation_code?: string; // Optional for airtime, required for data/cable/electricity
  amount: number;
  phone: string;

  // SMS-specific fields
  recipients?: string; // For bulk SMS
  message?: string; // For bulk SMS
  sender?: string; // For bulk SMS
  units?: number; // For SMS units purchase

  // Insurance-specific fields for third-party motor insurance
  Insured_Name?: string; // Required for ui-insure
  engine_capacity?: string; // Required for ui-insure
  Chasis_Number?: string; // Required for ui-insure
  Plate_Number?: string; // Required for ui-insure
  vehicle_make?: string; // Required for ui-insure
  vehicle_color?: string; // Required for ui-insure
  vehicle_model?: string; // Required for ui-insure
  YearofMake?: string; // Required for ui-insure
  state?: string; // Required for ui-insure
  lga?: string; // Required for ui-insure
  email?: string; // Required for ui-insure
}

interface PayBillResponse {
  response_description: string;
  success: boolean;
  message: string;
  data: {
    transactionRef: string;
    status: string;
    amount: number;
    serviceID: string;
    serviceType: string;
    walletBalance: number;
    vtpassResponse: {
      code: string;
      message: string;
      transactionId: string;
      certificateUrl?: string; // For insurance certificates
      batchId?: string; // For SMS services
    };
    emailSent: boolean;
    notifications: {
      emailSent: boolean;
      emailAddress: string;
    };
    // Insurance-specific response data
    insurance?: {
      plateNumber: string;
      insuredName: string;
      certificateUrl: string;
      hasCertificate: boolean;
    };
    // SMS-specific response data
    smsDetails?: {
      recipientCount: number;
      messageLength: number;
      totalUnits: number;
      batchId: string;
      sentDate: string;
    };
    // SMS units response data
    unitsDetails?: {
      unitsPurchased: number;
      unitPrice: number;
      totalAmount: number;
    };
  };
}

export const billsApi = createApi({
  reducerPath: 'billsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'https://hovapay-api.onrender.com/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('content-type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Wallet', 'Transactions', 'Services', 'VirtualAccount', 'InsuranceOptions', 'SMS'],
  endpoints: (builder) => ({
    // Wallet endpoints
    getWalletBalance: builder.query<{data: WalletBalance}, void>({
      query: () => '/wallet/balance',
      providesTags: ['Wallet'],
    }),

    fundWallet: builder.mutation<FundWalletResponse, FundWalletRequest>({
      query: (data) => ({
        url: '/wallet/fund',
        method: 'POST',
        body: data,
      }),
    }),

    verifyPayment: builder.mutation<PaymentVerificationResponse, string>({
      query: (reference) => `/wallet/verify/${reference}`,
      invalidatesTags: ['Wallet', 'Transactions'],
    }),

    getTransactionHistory: builder.query<{
      transactions: Transaction[];
      pagination: any;
    }, {
      page?: number;
      limit?: number;
      type?: string;
    }>({
      query: ({ page = 1, limit = 10, type }) => ({
        url: '/wallet/transactions',
        params: { page, limit, ...(type && { type }) },
      }),
      providesTags: ['Transactions'],
    }),

    createVirtualAccount: builder.mutation<VirtualAccountResponse, {}>({
      query: () => ({
        url: '/wallet/virtual-account',
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['VirtualAccount'],
    }),

    getVirtualAccount: builder.query<VirtualAccountResponse, void>({
      query: () => '/wallet/virtual-account',
      providesTags: ['VirtualAccount'],
    }),

    transferFunds: builder.mutation<any, {
      recipientIdentifier: string;
      amount: number;
      description: string;
    }>({
      query: (data) => ({
        url: '/wallet/transfer',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Wallet', 'Transactions'],
    }),

    getPaystackBanks: builder.query<{success: boolean; banks: any[]}, void>({
      query: () => '/wallet/banks/paystack',
    }),

    getMonnifyBanks: builder.query<{success: boolean; banks: any[]}, void>({
      query: () => '/wallet/banks/monnify',
    }),

    // Bills endpoints
    getServiceCategories: builder.query<{
      content: ServiceCategory[];
      response_description: string;
    }, void>({
      query: () => '/bills/services/categories',
      providesTags: ['Services'],
    }),

    getServicesByCategory: builder.query<{
      content: BillService[];
      response_description: string;
    }, string>({
      query: (category) => `/bills/services/${category}`,
      providesTags: ['Services'],
    }),

    getServiceVariations: builder.query<ServiceVariationsResponse, string>({
      query: (serviceId) => `/bills/services/variations/${serviceId}`,
      providesTags: ['Services'],
    }),

    // NEW: SMS endpoints
    getSMSBalance: builder.query<SMSBalanceResponse, void>({
      query: () => '/bills/sms/balance',
      providesTags: ['SMS'],
    }),

    sendBulkSMS: builder.mutation<BulkSMSResponse, BulkSMSRequest>({
      query: (data) => ({
        url: '/bills/sms/bulk',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Wallet', 'Transactions', 'SMS'],
    }),

    purchaseSMSUnits: builder.mutation<PayBillResponse, SMSUnitsRequest>({
      query: (data) => ({
        url: '/bills/sms/units',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Wallet', 'Transactions', 'SMS'],
    }),

    testSMSConnection: builder.query<{
      success: boolean;
      message: string;
      data: any;
    }, void>({
      query: () => '/bills/sms/test-connection',
      providesTags: ['SMS'],
    }),

    // Insurance-specific endpoints
    getInsuranceVariations: builder.query<InsuranceVariationsResponse, void>({
      query: () => '/bills/insurance/variations',
      providesTags: ['InsuranceOptions'],
    }),

    getVehicleColors: builder.query<VehicleColorsResponse, void>({
      query: () => '/bills/insurance/vehicle-colors',
      providesTags: ['InsuranceOptions'],
    }),

    getEngineCapacities: builder.query<EngineCapacitiesResponse, void>({
      query: () => '/bills/insurance/engine-capacities',
      providesTags: ['InsuranceOptions'],
    }),

    getStates: builder.query<StatesResponse, void>({
      query: () => '/bills/insurance/states',
      providesTags: ['InsuranceOptions'],
    }),

    getLGAs: builder.query<LGAsResponse, string>({
      query: (stateCode) => `/bills/insurance/lgas/${stateCode}`,
      providesTags: ['InsuranceOptions'],
    }),

    getVehicleMakes: builder.query<VehicleMakesResponse, void>({
      query: () => '/bills/insurance/vehicle-makes',
      providesTags: ['InsuranceOptions'],
    }),

    getVehicleModels: builder.query<VehicleModelsResponse, string>({
      query: (makeCode) => `/bills/insurance/vehicle-models/${makeCode}`,
      providesTags: ['InsuranceOptions'],
    }),

    verifyCustomer: builder.mutation<VerifyCustomerResponse, VerifyCustomerRequest>({
      query: (data) => ({
        url: '/bills/verify',
        method: 'POST',
        body: data,
      }),
    }),

    payBill: builder.mutation<PayBillResponse, PayBillRequest>({
      query: (data) => ({
        url: '/bills/pay',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Wallet', 'Transactions'],
    }),

    getTransactionStatus: builder.query<{
      data: {
        _id: string;
        user: string;
        serviceType: string;
        serviceID: string;
        billersCode?: string;
        variation_code?: string;
        amount: number;
        phone: string;
        status: 'pending' | 'completed' | 'failed';
        transactionRef: string;
        vtpassRef?: string;
        responseData?: any;
        paymentMethod: string;
        createdAt: string;
        updatedAt: string;
        certificateUrl?: string; // For insurance certificates
      };
    }, string>({
      query: (transactionRef) => `/bills/transactions/${transactionRef}`,
      providesTags: ['Transactions'],
    }),

    getBillHistory: builder.query<{
      transactions: Transaction[];
      pagination: any;
    }, {
      page?: number;
      limit?: number;
      serviceType?: string;
    }>({
      query: ({ page = 1, limit = 10, serviceType }) => ({
        url: '/bills/history',
        params: { page, limit, ...(serviceType && { serviceType }) },
      }),
      providesTags: ['Transactions'],
    }),

    checkTransactionStatus: builder.query<any, string>({
      query: (transactionRef) => `/bills/transactions/${transactionRef}`,
      providesTags: ['Transactions'],
    }),
  }),
});

export const {
  useGetWalletBalanceQuery,
  useFundWalletMutation,
  useVerifyPaymentMutation,
  useGetTransactionHistoryQuery,
  useCreateVirtualAccountMutation,
  useGetVirtualAccountQuery,
  useTransferFundsMutation,
  useGetPaystackBanksQuery,
  useGetMonnifyBanksQuery,
  useGetServiceCategoriesQuery,
  useGetServicesByCategoryQuery,
  useGetServiceVariationsQuery,
  // NEW: SMS-specific hooks
  useGetSMSBalanceQuery,
  useSendBulkSMSMutation,
  usePurchaseSMSUnitsMutation,
  useTestSMSConnectionQuery,
  // Insurance-specific hooks
  useGetInsuranceVariationsQuery,
  useGetVehicleColorsQuery,
  useGetEngineCapacitiesQuery,
  useGetStatesQuery,
  useGetLGAsQuery,
  useGetVehicleMakesQuery,
  useGetVehicleModelsQuery,
  useVerifyCustomerMutation,
  usePayBillMutation,
  useGetBillHistoryQuery,
  useCheckTransactionStatusQuery,
  useGetTransactionStatusQuery,
} = billsApi;