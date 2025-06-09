// store/provider.tsx - Clean version with Redux Persist
import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { View, Text } from 'react-native';
import { store, persistor } from './index';

interface ReduxProviderProps {
    children: React.ReactNode;
}

const LoadingScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
    </View>
);

export function ReduxProvider({ children }: ReduxProviderProps) {
    return (
        <Provider store={store}>
            <PersistGate loading={<LoadingScreen />} persistor={persistor}>
                {children}
            </PersistGate>
        </Provider>
    );
}