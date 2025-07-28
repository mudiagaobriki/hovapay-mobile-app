// store/api/enhancedBillsApi.ts - Enhanced Bills API with Sports Betting, Flight Booking, and International Airtime
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@/store';

// Base interfaces from existing billsApi
interface WalletBalance {
    balance: number;
    currency: string;
    status: string;
}

interface Transaction {
    id: string;
    type: 'deposit' | 'withdrawal' | 'bill_payment' | 'transfer' | 'refund' | 'sports_betting' | 'flight_booking' | 'international_airtime';
    amount: number;
    description: string;
    status: 'pending' | 'completed' | 'failed';
    reference: string;
    createdAt: string;
    updatedAt: string;
    metadata?: any;
}

// Sports Betting interfaces
interface Sport {
    id: string;
    name: string;
    icon: string;
    active: boolean;
    popularLeagues?: League[];
}

interface League {
    id: string;
    name: string;
    sportId: string;
    country: string;
    logo?: string;
    active: boolean;
}

interface Match {
    id: string;
    sportId: string;
    leagueId: string;
    homeTeam: string;
    awayTeam: string;
    kickoffTime: string;
    status: 'upcoming' | 'live' | 'finished';
    markets: Market[];
}

interface Market {
    id: string;
    name: string;
    type: string;
    selections: Selection[];
}

interface Selection {
    id: string;
    name: string;
    odds: number;
    active: boolean;
}

interface BetSlip {
    matches: BetSelection[];
    betType: 'single' | 'accumulator' | 'system' | 'combo';
    stake: number;
    potentialWinnings: number;
    totalOdds: number;
}

interface BetSelection {
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    market: string;
    selection: string;
    odds: number;
    kickoffTime?: string;
}

interface PlaceBetRequest {
    betType: 'single' | 'accumulator' | 'system' | 'combo';
    sport: string;
    league?: string;
    matches: BetSelection[];
    stake: number;
    potentialWinnings: number;
    totalOdds: number;
    bookmaker: 'bet9ja' | 'sportybet' | 'nairabet' | 'betway' | '1xbet' | 'betking';
    paymentMethod?: 'wallet';
}

interface SportsBetResponse {
    success: boolean;
    message: string;
    data: {
        transactionRef: string;
        betSlip: string;
        stake: number;
        potentialWinnings: number;
        status: string;
        bookmaker: string;
    };
}

// Flight Booking interfaces
interface Airport {
    iataCode: string;
    name: string;
    city: string;
    country: string;
    timezone?: string;
}

interface FlightSearchParams {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    children?: number;
    infants?: number;
    travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
    limit?: number;
}

interface FlightOffer {
    id: string;
    price: {
        total: number;
        base: number;
        taxes: number;
        currency: string;
    };
    itineraries: Itinerary[];
    travelerPricings: any[];
    validatingAirlineCodes: string[];
    numberOfStops: number;
}

interface Itinerary {
    duration: string;
    segments: FlightSegment[];
}

interface FlightSegment {
    departure: {
        iataCode: string;
        terminal?: string;
        at: string;
    };
    arrival: {
        iataCode: string;
        terminal?: string;
        at: string;
    };
    carrierCode: string;
    number: string;
    aircraft?: { code: string };
    duration: string;
    numberOfStops: number;
}

interface Passenger {
    type: 'adult' | 'child' | 'infant';
    title: 'Mr' | 'Mrs' | 'Ms' | 'Dr' | 'Prof';
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'male' | 'female';
    passportNumber?: string;
    nationality?: string;
}

interface FlightBookingRequest {
    flightOffer: FlightOffer;
    travelers: Passenger[];
    contactInfo: {
        email: string;
        phone: string;
        emergencyContact?: {
            name?: string;
            phone?: string;
            relationship?: string;
        };
    };
    paymentMethod?: 'wallet';
}

interface FlightBookingResponse {
    success: boolean;
    message: string;
    data: {
        transactionRef: string;
        bookingReference: string;
        pnr: string;
        totalAmount: number;
        status: string;
        eTicket: any;
    };
}

// International Airtime interfaces
interface Country {
    code: string;
    name: string;
    dialingCode: string;
    flag?: string;
    region?: string;
}

interface Operator {
    id: string;
    name: string;
    logo?: string;
    type: 'prepaid' | 'postpaid' | 'both';
}

interface AirtimeProduct {
    code: string;
    name: string;
    denomination: string;
    amount: number;
    currency: string;
}

interface InternationalAirtimeRequest {
    country: Country;
    operator: Operator;
    phoneNumber: string;
    amount: number;
    localCurrency: string;
    productCode: string;
    denomination: string;
    productName: string;
    paymentMethod?: 'wallet';
}

interface InternationalAirtimeResponse {
    success: boolean;
    message: string;
    data: {
        transactionRef: string;
        phoneNumber: string;
        amount: number;
        currency: string;
        nairaAmount: number;
        status: string;
        deliveryMethod: string;
        instructions: string;
    };
}

interface ExchangeRate {
    from: string;
    to: string;
    rate: number;
    lastUpdated: string;
}

export const enhancedBillsApi = createApi({
    reducerPath: 'enhancedBillsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'https://hovapay-api.onrender.com/api/bills/enhanced',
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as RootState).auth.token;
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            headers.set('content-type', 'application/json');
            return headers;
        },
    }),
    tagTypes: ['Wallet', 'Transactions', 'Services', 'Sports', 'Flights', 'InternationalAirtime'],
    endpoints: (builder) => ({
        // ==================== SPORTS BETTING ENDPOINTS ====================

        /**
         * Get available sports for betting
         */
        getSports: builder.query<{ success: boolean; data: Sport[] }, void>({
            query: () => '/sports',
            providesTags: ['Sports'],
        }),

        /**
         * Get leagues for a specific sport
         */
        getLeagues: builder.query<{ success: boolean; data: League[] }, string>({
            query: (sportId) => `/sports/${sportId}/leagues`,
            providesTags: ['Sports'],
        }),

        /**
         * Get matches for a sport/league
         */
        getMatches: builder.query<{ success: boolean; data: Match[] }, { sportId: string; leagueId?: string }>({
            query: ({ sportId, leagueId }) => {
                const params = leagueId ? `?leagueId=${leagueId}` : '';
                return `/sports/${sportId}/matches${params}`;
            },
            providesTags: ['Sports'],
        }),

        /**
         * Place a sports bet
         */
        placeBet: builder.mutation<SportsBetResponse, PlaceBetRequest>({
            query: (betData) => ({
                url: '/sports-betting/place-bet',
                method: 'POST',
                body: betData,
            }),
            invalidatesTags: ['Wallet', 'Transactions'],
        }),

        /**
         * Get bet status
         */
        getBetStatus: builder.query<{ success: boolean; data: any }, string>({
            query: (transactionRef) => `/sports-betting/bet-status/${transactionRef}`,
            providesTags: ['Transactions'],
        }),

        // ==================== FLIGHT BOOKING ENDPOINTS ====================

        /**
         * Search flights
         */
        searchFlights: builder.query<{ success: boolean; data: FlightOffer[]; meta: any }, FlightSearchParams>({
            query: (params) => ({
                url: '/flights/search',
                params,
            }),
            providesTags: ['Flights'],
        }),

        /**
         * Search airports
         */
        searchAirports: builder.query<{ success: boolean; data: Airport[] }, string>({
            query: (keyword) => `/flights/airports/search?keyword=${keyword}`,
            providesTags: ['Flights'],
        }),

        /**
         * Book a flight
         */
        bookFlight: builder.mutation<FlightBookingResponse, FlightBookingRequest>({
            query: (bookingData) => ({
                url: '/flights/book',
                method: 'POST',
                body: bookingData,
            }),
            invalidatesTags: ['Wallet', 'Transactions'],
        }),

        /**
         * Get flight booking details
         */
        getFlightBooking: builder.query<{ success: boolean; data: any }, string>({
            query: (transactionRef) => `/flights/booking/${transactionRef}`,
            providesTags: ['Transactions'],
        }),

        // ==================== INTERNATIONAL AIRTIME ENDPOINTS ====================

        /**
         * Get supported countries
         */
        getInternationalCountries: builder.query<{ success: boolean; data: Country[] }, void>({
            query: () => '/international-airtime/countries',
            providesTags: ['InternationalAirtime'],
        }),

        /**
         * Get operators for a country
         */
        getInternationalOperators: builder.query<{ success: boolean; data: Operator[] }, string>({
            query: (countryCode) => `/international-airtime/operators/${countryCode}`,
            providesTags: ['InternationalAirtime'],
        }),

        /**
         * Get products for an operator
         */
        getInternationalProducts: builder.query<{ success: boolean; data: AirtimeProduct[] }, string>({
            query: (operatorId) => `/international-airtime/products/${operatorId}`,
            providesTags: ['InternationalAirtime'],
        }),

        /**
         * Get exchange rates
         */
        getExchangeRates: builder.query<{ success: boolean; data: ExchangeRate[] }, void>({
            query: () => '/international-airtime/exchange-rates',
            providesTags: ['InternationalAirtime'],
        }),

        /**
         * Purchase international airtime
         */
        purchaseInternationalAirtime: builder.mutation<InternationalAirtimeResponse, InternationalAirtimeRequest>({
            query: (airtimeData) => ({
                url: '/international-airtime/purchase',
                method: 'POST',
                body: airtimeData,
            }),
            invalidatesTags: ['Wallet', 'Transactions'],
        }),

        /**
         * Get international airtime transaction status
         */
        getInternationalAirtimeStatus: builder.query<{ success: boolean; data: any }, string>({
            query: (transactionRef) => `/international-airtime/status/${transactionRef}`,
            providesTags: ['Transactions'],
        }),

        // ==================== ENHANCED PAYMENT HISTORY ====================

        /**
         * Get enhanced payment history including all service types
         */
        getEnhancedPaymentHistory: builder.query<{
            success: boolean;
            docs: Transaction[];
            totalDocs: number;
            limit: number;
            page: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        }, {
            page?: number;
            limit?: number;
            serviceType?: string;
        }>({
            query: ({ page = 1, limit = 10, serviceType }) => ({
                url: '/enhanced-history',
                params: { page, limit, ...(serviceType && { serviceType }) },
            }),
            providesTags: ['Transactions'],
        }),

        // Re-export some existing wallet endpoints for convenience
        getWalletBalance: builder.query<{data: WalletBalance}, void>({
            query: () => ({
                url: 'https://hovapay-api.onrender.com/api/wallet/balance',
            }),
            providesTags: ['Wallet'],
        }),
    }),
});

export const {
    // Sports Betting hooks
    useGetSportsQuery,
    useGetLeaguesQuery,
    useGetMatchesQuery,
    usePlaceBetMutation,
    useGetBetStatusQuery,

    // Flight Booking hooks
    useSearchFlightsQuery,
    useSearchAirportsQuery,
    useBookFlightMutation,
    useGetFlightBookingQuery,

    // International Airtime hooks
    useGetInternationalCountriesQuery,
    useGetInternationalOperatorsQuery,
    useGetInternationalProductsQuery,
    useGetExchangeRatesQuery,
    usePurchaseInternationalAirtimeMutation,
    useGetInternationalAirtimeStatusQuery,

    // Enhanced history
    useGetEnhancedPaymentHistoryQuery,

    // Wallet
    useGetWalletBalanceQuery,
} = enhancedBillsApi;