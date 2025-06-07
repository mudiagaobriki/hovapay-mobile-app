// store/api/billsApi.ts - FIXED
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';

// ... (interfaces remain the same)
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


export const billsApi = createApi({
  reducerPath: 'billsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://192.168.148.122:3040/api',
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
      // This mutation only starts the process, so it doesn't invalidate the wallet yet.
    }),

    // [MODIFIED] Changed from query to mutation to invalidate cache on success
    verifyPayment: builder.mutation<PaymentVerificationResponse, string>({
      query: (reference) => `/wallet/verify/${reference}`,
      // Invalidating 'Wallet' will force getWalletBalance to refetch.
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

    // ... (rest of the endpoints remain the same)
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
  useVerifyPaymentMutation, // [MODIFIED] Export the new mutation hook
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