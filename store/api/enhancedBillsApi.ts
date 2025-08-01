// store/api/enhancedBillsApi.ts - Enhanced Bills API with Corrected VTPass Structure
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

// ==================== CORRECTED INTERNATIONAL AIRTIME INTERFACES ====================

// VTPass Country interface (matches get-international-airtime-countries response)
interface Country {
    code: string;          // ISO 2-letter country code (e.g., 'GH', 'KE')
    name: string;          // Country name (e.g., 'Ghana', 'Kenya')
    flag?: string;         // Country flag emoji (optional)
    region?: string;       // Region name (optional)
    dialingCode?: string;  // Will be added by frontend (e.g., '+233')
}

// VTPass Product Type interface (matches get-international-airtime-product-types response)
interface ProductType {
    product_type_id: number;  // Product type ID (1=Mobile Top Up, 4=Mobile Data)
    name: string;            // Product type name
}

// VTPass Operator interface (matches get-international-airtime-operators response)
interface Operator {
    operator_id: number;     // VTPass operator ID (not string!)
    name: string;           // Operator name (e.g., 'MTN Ghana')
    logo?: string;          // Operator logo URL (optional)
}

// VTPass Product/Variation interface (matches service-variations response)
interface AirtimeProduct {
    code: string;              // VTPass variation_code for purchase
    name: string;             // Product name/description
    denomination: string;     // Display denomination (e.g., '5 GHS', '10 KES')
    amount: number;          // Amount in local currency
    currency: string;        // Local currency code (e.g., 'GHS', 'KES')
    fixedPrice?: boolean;    // Whether price is fixed (uses chargedAmount) or variable (uses variationRate)
    variationRate?: number;  // Rate multiplier for variable pricing (amount * rate = NGN cost)
    chargedAmount?: number;  // Fixed NGN amount charged (for fixed price products)
}

// Request interface for purchasing international airtime
interface InternationalAirtimeRequest {
    country: {
        code: string;         // ISO 2-letter country code
        name: string;         // Country name
        dialingCode: string;  // International dialing code (e.g., '+233')
        flag?: string;        // Country flag emoji
        region?: string;      // Region name
    };
    operator: {
        id: number;          // VTPass operator_id (number, not string!)
        name: string;        // Operator name
        logo?: string;       // Operator logo URL
    };
    productCode: string;     // VTPass variation_code
    phoneNumber: string;     // Recipient phone number (will be formatted to international)
    amount: number;          // Amount in local currency
    localCurrency: string;   // Local currency code (e.g., 'GHS', 'KES')
    denomination: string;    // Display denomination (e.g., '5 GHS')
    productName: string;     // Product name/description
    paymentMethod?: 'wallet';
}

// Response interface for international airtime purchase
interface InternationalAirtimeResponse {
    success: boolean;
    message: string;
    data: {
        transactionRef: string;     // Our transaction reference
        phoneNumber: string;        // Recipient phone number
        amount: number;             // Amount in local currency
        currency: string;           // Local currency code
        nairaAmount: number;        // Amount charged in NGN
        status: string;             // Transaction status
        deliveryMethod: string;     // Delivery method (usually 'instant')
        instructions: string;       // Delivery instructions
    };
}

// Exchange rates interface
interface ExchangeRate {
    base: string;           // Base currency (NGN)
    rates: Record<string, number>;  // Currency rates object
    lastUpdated: string;    // ISO timestamp
}

// API Response wrapper interfaces to match backend structure
interface CountriesResponse {
    success: boolean;
    data: {
        success: boolean;
        countries: Country[];
    };
}

interface ProductTypesResponse {
    success: boolean;
    data: {
        success: boolean;
        productTypes: ProductType[];
    };
}

interface OperatorsResponse {
    success: boolean;
    data: {
        success: boolean;
        operators: Operator[];
    };
}

interface ProductsResponse {
    success: boolean;
    data: {
        success: boolean;
        products: AirtimeProduct[];
    };
}

interface ExchangeRatesResponse {
    success: boolean;
    data: ExchangeRate;
}

export const enhancedBillsApi = createApi({
    reducerPath: 'enhancedBillsApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'https://hovapay-api.onrender.com/api/bills', // Fixed: removed /enhanced
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
            query: () => ({
                url: 'https://hovapay-api.onrender.com/api/bills/sports',
                method: 'GET',
            }),
            providesTags: ['Sports'],
        }),

        /**
         * Get leagues for a specific sport
         */
        getLeagues: builder.query<{ success: boolean; data: League[] }, string>({
            query: (sportId) => ({
                url: `https://hovapay-api.onrender.com/api/bills/sports/${sportId}/leagues`,
                method: 'GET',
            }),
            providesTags: ['Sports'],
        }),

        /**
         * Get matches for a sport/league
         */
        getMatches: builder.query<{ success: boolean; data: Match[] }, { sportId: string; leagueId?: string }>({
            query: ({ sportId, leagueId }) => {
                const params = leagueId ? `?leagueId=${leagueId}` : '';
                return {
                    url: `https://hovapay-api.onrender.com/api/bills/sports/${sportId}/matches${params}`,
                    method: 'GET',
                };
            },
            providesTags: ['Sports'],
        }),

        /**
         * Place a sports bet
         */
        placeBet: builder.mutation<SportsBetResponse, PlaceBetRequest>({
            query: (betData) => ({
                url: 'https://hovapay-api.onrender.com/api/bills/sports-betting/place-bet',
                method: 'POST',
                body: betData,
            }),
            invalidatesTags: ['Wallet', 'Transactions'],
        }),

        /**
         * Get bet status
         */
        getBetStatus: builder.query<{ success: boolean; data: any }, string>({
            query: (transactionRef) => ({
                url: `https://hovapay-api.onrender.com/api/bills/sports-betting/bet-status/${transactionRef}`,
                method: 'GET',
            }),
            providesTags: ['Transactions'],
        }),

        // ==================== FLIGHT BOOKING ENDPOINTS ====================

        /**
         * Search flights
         */
        searchFlights: builder.query<{ success: boolean; data: FlightOffer[]; meta: any }, FlightSearchParams>({
            query: (params) => ({
                url: 'https://hovapay-api.onrender.com/api/bills/flights/search',
                method: 'GET',
                params,
            }),
            providesTags: ['Flights'],
        }),

        /**
         * Search airports
         */
        searchAirports: builder.query<{ success: boolean; data: Airport[] }, string>({
            query: (keyword) => ({
                url: `https://hovapay-api.onrender.com/api/bills/flights/airports/search?keyword=${keyword}`,
                method: 'GET',
            }),
            providesTags: ['Flights'],
        }),

        /**
         * Book a flight
         */
        bookFlight: builder.mutation<FlightBookingResponse, FlightBookingRequest>({
            query: (bookingData) => ({
                url: 'https://hovapay-api.onrender.com/api/bills/flights/book',
                method: 'POST',
                body: bookingData,
            }),
            invalidatesTags: ['Wallet', 'Transactions'],
        }),

        /**
         * Get flight booking details
         */
        getFlightBooking: builder.query<{ success: boolean; data: any }, string>({
            query: (transactionRef) => ({
                url: `https://hovapay-api.onrender.com/api/bills/flights/booking/${transactionRef}`,
                method: 'GET',
            }),
            providesTags: ['Transactions'],
        }),

        // ==================== TEST ENDPOINT ====================

        /**
         * Test if basic bills endpoint works
         */
        testBillsEndpoint: builder.query<any, void>({
            query: () => ({
                url: 'https://hovapay-api.onrender.com/api/bills',
                method: 'GET',
            }),
            transformResponse: (response: any) => {
                console.log('Bills endpoint response:', response);
                return response;
            },
            transformErrorResponse: (response: any) => {
                console.log('Bills endpoint error:', response);
                return response;
            },
        }),

        // ==================== CORRECTED INTERNATIONAL AIRTIME ENDPOINTS ====================

        /**
         * Get supported countries for international airtime
         * Maps to: GET /api/get-international-airtime-countries
         */
        getInternationalCountries: builder.query<CountriesResponse, void>({
            query: () => ({
                url: 'https://hovapay-api.onrender.com/api/bills/enhanced/international-airtime/countries',
                method: 'GET',
            }),
            providesTags: ['InternationalAirtime'],
            transformResponse: (response: any) => {
                console.log('Raw countries API response:', response);
                return response;
            },
            transformErrorResponse: (response: any) => {
                console.log('Countries API Error response:', response);
                return response;
            },
        }),

        /**
         * Get product types for a country (optional step)
         * Maps to: GET /api/get-international-airtime-product-types?code={countryCode}
         */
        getInternationalProductTypes: builder.query<ProductTypesResponse, string>({
            query: (countryCode) => ({
                url: `https://hovapay-api.onrender.com/api/bills/enhanced/international-airtime/product-types/${countryCode}`,
                method: 'GET',
            }),
            providesTags: ['InternationalAirtime'],
        }),

        /**
         * Get operators for a country and product type
         * Maps to: GET /api/get-international-airtime-operators?code={countryCode}&product_type_id={productTypeId}
         * @param params - Should be in format "GH?product_type_id=1" or just "GH" (defaults to product_type_id=1)
         */
        getInternationalOperators: builder.query<OperatorsResponse, string>({
            query: (params) => ({
                url: `https://hovapay-api.onrender.com/api/bills/enhanced/international-airtime/operators/${params}`,
                method: 'GET',
            }),
            providesTags: ['InternationalAirtime'],
        }),

        /**
         * Get products/variations for an operator
         * Maps to: GET /api/service-variations?serviceID=foreign-airtime&operator_id={operatorId}&product_type_id={productTypeId}
         * @param params - Should be in format "1?product_type_id=1" or just "1" (defaults to product_type_id=1)
         */
        getInternationalProducts: builder.query<ProductsResponse, string>({
            query: (params) => ({
                url: `https://hovapay-api.onrender.com/api/bills/enhanced/international-airtime/products/${params}`,
                method: 'GET',
            }),
            providesTags: ['InternationalAirtime'],
        }),

        /**
         * Get exchange rates for international airtime
         */
        getExchangeRates: builder.query<ExchangeRatesResponse, void>({
            query: () => ({
                url: 'https://hovapay-api.onrender.com/api/bills/enhanced/international-airtime/exchange-rates',
                method: 'GET',
            }),
            providesTags: ['InternationalAirtime'],
        }),

        /**
         * Purchase international airtime
         * Maps to: POST /api/pay with serviceID=foreign-airtime
         */
        purchaseInternationalAirtime: builder.mutation<InternationalAirtimeResponse, InternationalAirtimeRequest>({
            query: (airtimeData) => ({
                url: 'https://hovapay-api.onrender.com/api/bills/enhanced/international-airtime/purchase',
                method: 'POST',
                body: airtimeData,
            }),
            invalidatesTags: ['Wallet', 'Transactions'],
        }),

        /**
         * Get international airtime transaction status
         */
        getInternationalAirtimeStatus: builder.query<{ success: boolean; data: any }, string>({
            query: (transactionRef) => ({
                url: `https://hovapay-api.onrender.com/api/bills/enhanced/international-airtime/status/${transactionRef}`,
                method: 'GET',
            }),
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
    // Test hook
    useTestBillsEndpointQuery,

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

    // International Airtime hooks (corrected)
    useGetInternationalCountriesQuery,
    useGetInternationalProductTypesQuery,  // Added new hook
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