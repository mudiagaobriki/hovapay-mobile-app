// store/index.ts - Updated Redux Store with Enhanced Bills API
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';
import { authApi } from './api/authApi';
import { billsApi } from './api/billsApi';
import { enhancedBillsApi } from './api/enhancedBillsApi'; // Add enhanced bills API
import { profileApi } from './api/profileApi';
import authReducer from './slices/authSlice';

// Only persist auth, not the entire store
const authPersistConfig = {
    key: 'auth',
    storage: AsyncStorage,
    whitelist: ['user', 'token', 'isAuthenticated'], // only persist these fields
};

const rootReducer = combineReducers({
    auth: persistReducer(authPersistConfig, authReducer),
    [authApi.reducerPath]: authApi.reducer,
    [billsApi.reducerPath]: billsApi.reducer,
    [enhancedBillsApi.reducerPath]: enhancedBillsApi.reducer, // Add enhanced bills API reducer
    [profileApi.reducerPath]: profileApi.reducer,
});

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            },
        }).concat(
            authApi.middleware,
            billsApi.middleware,
            enhancedBillsApi.middleware, // Add enhanced bills API middleware
            profileApi.middleware
        ),
    devTools: __DEV__,
});

export const persistor = persistStore(store);

// Setup listeners for RTK Query
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;