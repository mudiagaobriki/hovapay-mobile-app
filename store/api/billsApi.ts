// store/api/billsApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '../index';

interface ServiceCategory {
  identifier: string;
  name: string;
}

interface BillService {
  serviceID: string;
  name: string;
  minimium_amount: string;
  maximum_amount: number;
  convinience_fee: string;
  product_type: string;
  image: string;
}

interface ServiceVariation {
  variation_code: string;
  name: string;
  variation_amount: number;
  fixedPrice: string;
}

interface ServiceVariationsResponse {
  content: {
    ServiceName: string;
    convinience_fee: string;
    serviceID: string;
    varations: ServiceVariation[]; // Note: API has typo "varations"
    variations: ServiceVariation[]; // Correct spelling also exists
  };
  response_description: string;
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
    Customer_Type: string;
    DueDate: string;
    CustomerNumber: string;
    CustomerAddress: string;
  };
}

interface PayBillRequest {
  serviceID: string;
  billersCode?: string;
  variation_code?: string;
  amount: number;
  phone: string;
}

interface PayBillResponse {
  response_description: string;
  requestId: string;
  transactionId: string;
  amount: number;
  purchased_code: string;
}

interface WalletBalance {
  balance: number;
  currency: string;
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  reference: string;
  serviceType?: string;
  createdAt: string;
  updatedAt: string;
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
  tagTypes: ['Wallet', 'Transactions', 'Services'],
  endpoints: (builder) => ({
    // Wallet endpoints
    getWalletBalance: builder.query<WalletBalance, void>({
      query: () => '/wallet/balance',
      providesTags: ['Wallet'],
    }),

    fundWallet: builder.mutation<any, { amount: number; gateway: 'paystack' | 'monnify' }>({
      query: (data) => ({
        url: '/wallet/fund',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Wallet'],
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

    // Bills service endpoints
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
  useGetTransactionHistoryQuery,
  useGetServiceCategoriesQuery,
  useGetServicesByCategoryQuery,
  useGetServiceVariationsQuery,
  useVerifyCustomerMutation,
  usePayBillMutation,
  useGetBillHistoryQuery,
  useCheckTransactionStatusQuery,
} = billsApi;