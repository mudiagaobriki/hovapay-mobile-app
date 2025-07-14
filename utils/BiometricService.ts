// services/BiometricService.ts - Comprehensive biometric authentication service
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface BiometricCapabilities {
    isSupported: boolean;
    isEnrolled: boolean;
    supportedTypes: LocalAuthentication.AuthenticationType[];
    securityLevel: 'none' | 'weak' | 'strong';
    primaryType: string;
    availableTypes: string[];
}

export interface BiometricAuthResult {
    success: boolean;
    biometricType?: string;
    error?: string;
    cancelled?: boolean;
}

export interface StoredBiometricData {
    lastUsedIdentifier?: string;
    biometricEnabled?: boolean;
    biometricType?: string;
    deviceId?: string;
}

class BiometricService {
    private static instance: BiometricService;
    private capabilities: BiometricCapabilities | null = null;

    private constructor() {}

    public static getInstance(): BiometricService {
        if (!BiometricService.instance) {
            BiometricService.instance = new BiometricService();
        }
        return BiometricService.instance;
    }

    /**
     * Initialize and check biometric capabilities
     */
    public async initialize(): Promise<BiometricCapabilities> {
        try {
            const isSupported = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

            const capabilities: BiometricCapabilities = {
                isSupported,
                isEnrolled,
                supportedTypes,
                securityLevel: this.determineSecurityLevel(supportedTypes),
                primaryType: this.getPrimaryBiometricType(supportedTypes),
                availableTypes: this.getAvailableBiometricTypes(supportedTypes),
            };

            this.capabilities = capabilities;
            return capabilities;
        } catch (error) {
            console.error('Error initializing biometric service:', error);
            throw new Error('Failed to initialize biometric authentication');
        }
    }

    /**
     * Get current biometric capabilities
     */
    public getCapabilities(): BiometricCapabilities | null {
        return this.capabilities;
    }

    /**
     * Check if biometric authentication is available and configured
     */
    public async isBiometricAvailable(): Promise<boolean> {
        if (!this.capabilities) {
            await this.initialize();
        }
        return this.capabilities?.isSupported && this.capabilities?.isEnrolled || false;
    }

    /**
     * Authenticate user with biometrics
     */
    public async authenticate(options: {
        promptMessage?: string;
        cancelLabel?: string;
        fallbackLabel?: string;
        disableDeviceFallback?: boolean;
    } = {}): Promise<BiometricAuthResult> {
        try {
            const isAvailable = await this.isBiometricAvailable();
            if (!isAvailable) {
                return {
                    success: false,
                    error: 'Biometric authentication is not available on this device',
                };
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: options.promptMessage || 'Authenticate to continue',
                cancelLabel: options.cancelLabel || 'Cancel',
                fallbackLabel: options.fallbackLabel || 'Use Password',
                disableDeviceFallback: options.disableDeviceFallback ?? false,
            });

            if (result.success) {
                return {
                    success: true,
                    biometricType: this.capabilities?.primaryType || 'Unknown',
                };
            } else {
                return {
                    success: false,
                    error: result.error || 'Authentication failed',
                    cancelled: result.error === 'user_cancel',
                };
            }
        } catch (error) {
            console.error('Biometric authentication error:', error);
            return {
                success: false,
                error: 'An error occurred during biometric authentication',
            };
        }
    }

    /**
     * Store biometric data securely
     */
    public async storeBiometricData(data: StoredBiometricData): Promise<void> {
        try {
            await SecureStore.setItemAsync('biometric_data', JSON.stringify(data));
        } catch (error) {
            console.error('Error storing biometric data:', error);
            throw new Error('Failed to store biometric data');
        }
    }

    /**
     * Retrieve stored biometric data
     */
    public async getStoredBiometricData(): Promise<StoredBiometricData | null> {
        try {
            const data = await SecureStore.getItemAsync('biometric_data');
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error retrieving biometric data:', error);
            return null;
        }
    }

    /**
     * Clear stored biometric data
     */
    public async clearBiometricData(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync('biometric_data');
        } catch (error) {
            console.error('Error clearing biometric data:', error);
        }
    }

    /**
     * Check if user has enabled biometric login for a specific identifier
     */
    public async isBiometricEnabledForUser(identifier: string): Promise<boolean> {
        try {
            const storedData = await this.getStoredBiometricData();
            return storedData?.lastUsedIdentifier === identifier && storedData?.biometricEnabled === true;
        } catch (error) {
            console.error('Error checking biometric status for user:', error);
            return false;
        }
    }

    /**
     * Enable biometric authentication for a user
     */
    public async enableBiometricForUser(identifier: string, biometricType: string): Promise<void> {
        try {
            const deviceId = await this.getDeviceId();
            const data: StoredBiometricData = {
                lastUsedIdentifier: identifier,
                biometricEnabled: true,
                biometricType,
                deviceId,
            };
            await this.storeBiometricData(data);
        } catch (error) {
            console.error('Error enabling biometric for user:', error);
            throw new Error('Failed to enable biometric authentication');
        }
    }

    /**
     * Disable biometric authentication
     */
    public async disableBiometric(): Promise<void> {
        try {
            await this.clearBiometricData();
        } catch (error) {
            console.error('Error disabling biometric:', error);
            throw new Error('Failed to disable biometric authentication');
        }
    }

    /**
     * Get a unique device identifier
     */
    public async getDeviceId(): Promise<string> {
        try {
            let deviceId = await SecureStore.getItemAsync('device_id');
            if (!deviceId) {
                // Generate a unique device ID
                deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                await SecureStore.setItemAsync('device_id', deviceId);
            }
            return deviceId;
        } catch (error) {
            console.error('Error getting device ID:', error);
            return `device_${Date.now()}`;
        }
    }

    /**
     * Get human-readable biometric type name
     */
    public getBiometricTypeName(type?: LocalAuthentication.AuthenticationType): string {
        if (!type && this.capabilities) {
            return this.capabilities.primaryType;
        }

        switch (type) {
            case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
                return 'Face ID';
            case LocalAuthentication.AuthenticationType.FINGERPRINT:
                return 'Fingerprint';
            case LocalAuthentication.AuthenticationType.IRIS:
                return 'Iris';
            default:
                return 'Biometric';
        }
    }

    /**
     * Get appropriate icon name for biometric type
     */
    public getBiometricIcon(type?: string): string {
        const biometricType = type || this.capabilities?.primaryType;

        switch (biometricType) {
            case 'Face ID':
                return 'face';
            case 'Fingerprint':
                return 'fingerprint';
            case 'Iris':
                return 'visibility';
            default:
                return 'security';
        }
    }

    /**
     * Check if the current biometric setup has changed
     */
    public async hasBiometricSetupChanged(): Promise<boolean> {
        try {
            const storedData = await this.getStoredBiometricData();
            if (!storedData) return false;

            const currentCapabilities = await this.initialize();

            // Check if enrollment status changed
            if (!currentCapabilities.isEnrolled && storedData.biometricEnabled) {
                return true;
            }

            // Check if supported types changed significantly
            const currentPrimaryType = currentCapabilities.primaryType;
            if (currentPrimaryType !== storedData.biometricType) {
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error checking biometric setup changes:', error);
            return false;
        }
    }

    /**
     * Validate biometric authentication strength
     */
    public validateBiometricStrength(): { isStrong: boolean; warnings: string[] } {
        if (!this.capabilities) {
            return { isStrong: false, warnings: ['Biometric capabilities not initialized'] };
        }

        const warnings: string[] = [];
        let isStrong = true;

        if (this.capabilities.securityLevel === 'weak') {
            warnings.push('Biometric hardware security level is weak');
            isStrong = false;
        }

        if (this.capabilities.availableTypes.length === 1) {
            warnings.push('Only one biometric method available - consider enabling multiple methods');
        }

        if (!this.capabilities.isEnrolled) {
            warnings.push('No biometric data enrolled on device');
            isStrong = false;
        }

        return { isStrong, warnings };
    }

    // Private helper methods

    private determineSecurityLevel(types: LocalAuthentication.AuthenticationType[]): 'none' | 'weak' | 'strong' {
        if (types.length === 0) return 'none';

        // Face ID and Iris are generally considered stronger
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ||
            types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            return 'strong';
        }

        // Fingerprint is generally good
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            return Platform.OS === 'ios' ? 'strong' : 'weak'; // iOS Touch ID is generally more secure
        }

        return 'weak';
    }

    private getPrimaryBiometricType(types: LocalAuthentication.AuthenticationType[]): string {
        // Prioritize Face ID over fingerprint over others
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            return 'Face ID';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            return 'Fingerprint';
        }
        if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            return 'Iris';
        }
        return 'none';
    }

    private getAvailableBiometricTypes(types: LocalAuthentication.AuthenticationType[]): string[] {
        const available: string[] = [];

        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            available.push('Face ID');
        }
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            available.push('Fingerprint');
        }
        if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            available.push('Iris');
        }

        return available;
    }
}

export default BiometricService.getInstance();