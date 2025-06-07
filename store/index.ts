// store/index.ts - Without Redux Persist
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authApi } from './api/authApi';
import { billsApi } from './api/billsApi';
import authReducer from './slices/authSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        [authApi.reducerPath]: authApi.reducer,
        [billsApi.reducerPath]: billsApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types for API calls
                ignoredActions: ['api/executeQuery/fulfilled'],
            },
        }).concat(authApi.middleware, billsApi.middleware),
    devTools: __DEV__,
});

// Setup listeners for RTK Query
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;