// store/api/chatApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@/store';

export const chatApi = createApi({
    reducerPath: 'chatApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'https://hovapay-api.onrender.com/api', // Your backend URL
        // baseUrl: 'http://localhost:3040/api', // Your backend URL
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as RootState).auth.token;
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ['Messages'],
    endpoints: (builder) => ({
        getChatHistory: builder.query<any, { conversationId: string; page: number }>({
            query: ({ conversationId, page }) => `/chat/history/${conversationId}?page=${page}&limit=20`,
            providesTags: ['Messages'],
        }),
    }),
});

export const { useGetChatHistoryQuery } = chatApi;