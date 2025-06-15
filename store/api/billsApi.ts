// store/api/billsApi.ts - Enhanced with complete types
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
}

interface PayBillResponse {
  response_description: string;
  content: {
    transactions: {
      status: string;
      product_name: string;
      unique_element: string;
      unit_price: number;
      quantity: string;
      service_verification: string;
      channel: string;
      commission: number;
      total_amount: number;
      discount: string;
      type: string;
      email: string;
      phone: string;
      name: string;
      convinience_fee: string;
      amount: number;
      platform: string;
      method: string;
      transactionId: string;
    };
  };
  purchased_code?: string;
  token?: string;
  reference?: string;
}

export const billsApi = createApi({
  reducerPath: 'billsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://192.168.14.122:3040/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('content-type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Wallet', 'Transactions', 'Services', 'VirtualAccount'],
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
  useVerifyCustomerMutation,
  usePayBillMutation,
  useGetBillHistoryQuery,
  useCheckTransactionStatusQuery,
} = billsApi;