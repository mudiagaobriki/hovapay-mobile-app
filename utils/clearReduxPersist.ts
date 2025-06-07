// utils/clearReduxPersist.ts - Utility to clear Redux Persist cache
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistor } from '@/store';

export const clearAllReduxPersist = async () => {
    try {
        console.log('Clearing Redux Persist cache...');

        // Method 1: Use persistor to purge
        await persistor.purge();

        // Method 2: Clear AsyncStorage keys manually
        await AsyncStorage.removeItem('persist:root');
        await AsyncStorage.removeItem('reduxPersist:auth');

        // Method 3: Clear all AsyncStorage (nuclear option)
        // await AsyncStorage.clear();

        console.log('Redux Persist cache cleared successfully');
        return true;
    } catch (error) {
        console.error('Error clearing Redux Persist cache:', error);
        return false;
    }
};

// Call this function if you need to reset everything
// clearAllReduxPersist();