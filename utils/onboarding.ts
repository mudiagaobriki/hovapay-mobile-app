// utils/onboarding.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_STORAGE_KEY = '@solo_bills_onboarding_completed';

export const markOnboardingCompleted = async (): Promise<void> => {
    try {
        await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
        console.log('✅ Onboarding marked as completed');
    } catch (error) {
        console.error('❌ Failed to mark onboarding as completed:', error);
        throw error;
    }
};

export const isOnboardingCompleted = async (): Promise<boolean> => {
    try {
        const completed = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
        return completed === 'true';
    } catch (error) {
        console.error('❌ Failed to check onboarding status:', error);
        return false;
    }
};

export const resetOnboarding = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
        console.log('🔄 Onboarding status reset');
    } catch (error) {
        console.error('❌ Failed to reset onboarding:', error);
        throw error;
    }
};