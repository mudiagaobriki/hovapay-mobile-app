// store/api/betWalletApi.ts - Corrected Bet Wallet Funding API
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@/store';

// Interfaces for Bet Wallet Funding
interface BettingPlatform {
    id: string;
    name: string;
    logo: string;
    color: string;
    minAmount: number;
    maxAmount: number;
    fundingTypes: ('instant' | 'voucher' | 'direct')[];
    website: string;
    supportedFunding: string[];
}

interface FundingOption {
    type: 'instant' | 'voucher' | 'direct';
    name: string;
    description: string;
    fee: number;
    estimatedTime: string;
    available: boolean;
}

interface VerifyAccountRequest {
    platform: 'bet9ja' | 'sportybet' | 'nairabet' | 'betway' | '1xbet' | 'betking' | 'merrybet';
    accountIdentifier: string;
    customerPhone?: string;
}

interface VerifyAccountResponse {
    success: boolean;
    message: string;
    data: {
        accountName: string;
        accountId: string;
        platform: string;
        verified: boolean;
        minAmount: number;
        maxAmount: number;
    };
}

interface FundWalletRequest {
    platform: 'bet9ja' | 'sportybet' | 'nairabet' | 'betway' | '1xbet' | 'betking' | 'merrybet';
    accountIdentifier: string;
    accountName: string;
    amount: number;
    fundingType: 'instant' | 'voucher' | 'direct';
    paymentMethod?: 'wallet';
    customerPhone?: string;
    description?: string;
}

interface FundWalletResponse {
    success: boolean;
    message: string;
    data: {
        transactionRef: string;
        platform: string;
        accountName: string;
        amount: number;
        status: string;
        fundingMethod: string;
        voucherCode?: string;
        instructions: string;
    };
}

interface BetWalletTransaction {
    id: string;
    transactionRef: string;
    platform: string;
    accountName: string;
    accountIdentifier: string;
    amount: number;
    fundingType: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    voucherCode?: string;
    instructions?: string;
    createdAt: string;
    completedAt?: string;
}

interface PlatformStats {
    platform: {
        id: string;
        name: string;
        minAmount: number;
        maxAmount: number;
        fees: Record<string, number>;
    };
    userStats: {
        totalFunded: number;
        totalTransactions: number;
        averageAmount: number;
        lastFunding: string | null;
    };
}

interface WalletBalance {
    balance: number;
    currency: string;
    status: string;
}

export const betWalletApi = createApi({
    reducerPath: 'betWalletApi',
    baseQuery: fetchBaseQuery({
        // CORRECTED: Use the correct base URL that matches your app.js routing
        // baseUrl: 'http://localhoost:3040/api/bet', // This matches app.use("/api/bet", betWalletFundingRoute);
        baseUrl: "https://hovapay-api.onrender.com/api/bet", // This matches app.use("/api/bet", betWalletFundingRoute);
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as RootState).auth.token;
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            headers.set('content-type', 'application/json');
            return headers;
        },
    }),
    tagTypes: ['BettingPlatforms', 'BetWalletTransactions', 'Wallet'],
    endpoints: (builder) => ({
        // ==================== PUBLIC ENDPOINTS ====================

        /**
         * Get supported betting platforms
         */
        getSupportedBettingPlatforms: builder.query<{ success: boolean; data: BettingPlatform[] }, void>({
            query: () => ({
                url: '/bet-wallet/platforms', // This will become: /api/bet/bet-wallet/platforms
                method: 'GET',
            }),
            providesTags: ['BettingPlatforms'],
        }),

        /**
         * Get funding options for a specific platform
         */
        getPlatformFundingOptions: builder.query<{ success: boolean; data: FundingOption[] }, string>({
            query: (platformId) => ({
                url: `/bet-wallet/platforms/${platformId}/funding-options`,
                method: 'GET',
            }),
            providesTags: ['BettingPlatforms'],
        }),

        // ==================== AUTHENTICATED ENDPOINTS ====================

        /**
         * Verify betting account
         */
        verifyBettingAccount: builder.mutation<VerifyAccountResponse, VerifyAccountRequest>({
            query: (accountData) => ({
                url: '/bet-wallet/verify-account',
                method: 'POST',
                body: accountData,
            }),
        }),

        /**
         * Fund betting wallet
         */
        fundBettingWallet: builder.mutation<FundWalletResponse, FundWalletRequest>({
            query: (fundingData) => ({
                url: '/bet-wallet/fund',
                method: 'POST',
                body: fundingData,
            }),
            invalidatesTags: ['Wallet', 'BetWalletTransactions'],
        }),

        /**
         * Get bet wallet funding status
         */
        getBetWalletFundingStatus: builder.query<{ success: boolean; data: BetWalletTransaction }, string>({
            query: (transactionRef) => ({
                url: `/bet-wallet/status/${transactionRef}`,
                method: 'GET',
            }),
            providesTags: ['BetWalletTransactions'],
        }),

        /**
         * Get bet wallet funding history
         */
        getBetWalletFundingHistory: builder.query<{
            success: boolean;
            data: {
                docs: BetWalletTransaction[];
                totalDocs: number;
                limit: number;
                page: number;
                totalPages: number;
                hasNextPage: boolean;
                hasPrevPage: boolean;
            };
        }, {
            page?: number;
            limit?: number;
            platform?: string;
        }>({
            query: ({ page = 1, limit = 10, platform }) => ({
                url: '/bet-wallet/history',
                params: { page, limit, ...(platform && { platform }) },
            }),
            providesTags: ['BetWalletTransactions'],
        }),

        /**
         * Get platform statistics
         */
        getPlatformStats: builder.query<{ success: boolean; data: PlatformStats }, string>({
            query: (platformId) => ({
                url: `/bet-wallet/platforms/${platformId}/stats`,
                method: 'GET',
            }),
            providesTags: ['BettingPlatforms'],
        }),

        /**
         * Get user's favorite betting platforms
         */
        getFavoritePlatforms: builder.query<{
            success: boolean;
            data: Array<{
                platform: string;
                totalAmount: number;
                totalTransactions: number;
                lastUsed: string;
            }>;
        }, void>({
            query: () => ({
                url: '/bet-wallet/platforms/favorites',
                method: 'GET',
            }),
            providesTags: ['BettingPlatforms'],
        }),

        /**
         * Get bet wallet funding summary
         */
        getBetWalletSummary: builder.query<{
            success: boolean;
            data: {
                totalFunded: number;
                totalTransactions: number;
                totalPlatforms: number;
                favoritePlatform: string | null;
                monthlyStats: {
                    funded: number;
                    transactions: number;
                };
                recentTransactions: BetWalletTransaction[];
            };
        }, void>({
            query: () => ({
                url: '/bet-wallet/summary',
                method: 'GET',
            }),
            providesTags: ['BetWalletTransactions'],
        }),

        // ==================== WALLET ENDPOINT ====================

        /**
         * Get wallet balance (re-exported for convenience)
         */
        getWalletBalance: builder.query<{ data: WalletBalance }, void>({
            query: () => ({
                // url: 'http://localhost:3040/api/wallet/balance', // This will become: /api/bet/wallet/balance
                url: 'https://hovapay-api.onrender.com/api/wallet/balance', // This will become: /api/bet/wallet/balance
            }),
            providesTags: ['Wallet'],
        }),
    }),
});

export const {
    // Public endpoints
    useGetSupportedBettingPlatformsQuery,
    useGetPlatformFundingOptionsQuery,

    // Account verification and funding
    useVerifyBettingAccountMutation,
    useFundBettingWalletMutation,

    // Transaction management
    useGetBetWalletFundingStatusQuery,
    useGetBetWalletFundingHistoryQuery,

    // Statistics and analytics
    useGetPlatformStatsQuery,
    useGetFavoritePlatformsQuery,
    useGetBetWalletSummaryQuery,

    // Wallet
    useGetWalletBalanceQuery,
} = betWalletApi;