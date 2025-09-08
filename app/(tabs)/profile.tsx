// app/(tabs)/profile.tsx - Complete Profile Screen with Email Verification
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Image,
    Alert,
    Modal,
    Switch,
    TextInput,
    Dimensions,
    ActionSheetIOS,
    Platform,
    RefreshControl,
    Linking,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { Formik } from 'formik';
import * as Yup from 'yup';

// Use your existing hooks and store structure
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectCurrentUser, updateUserProfile } from '@/store/slices/authSlice';
import {
    useGetUserProfileQuery,
    useUpdateUserProfileMutation,
    useUploadProfileImageMutation,
    useSetTransactionPinMutation,
    useChangeTransactionPinMutation,
    useToggleBiometricSettingMutation
} from '@/store/api/profileApi';
import { useResendVerificationEmailMutation } from '@/store/api/authApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';
import { handleLogout } from '@/utils/auth';
// import {navigate} from "expo-router/build/global-state/routing";

const { width } = Dimensions.get('window');

// Validation schemas
const ProfileUpdateSchema = Yup.object().shape({
    firstName: Yup.string().required('First name is required'),
    lastName: Yup.string().required('Last name is required'),
    phone: Yup.string()
        .matches(/^[0-9]{11}$/, 'Phone number must be 11 digits')
        .required('Phone number is required'),
    email: Yup.string().email('Invalid email').required('Email is required'),
});

const PinSchema = Yup.object().shape({
    pin: Yup.string()
        .matches(/^[0-9]{4}$/, 'PIN must be 4 digits')
        .required('PIN is required'),
    confirmPin: Yup.string()
        .oneOf([Yup.ref('pin')], 'PINs must match')
        .required('Confirm PIN is required'),
});

const ChangePinSchema = Yup.object().shape({
    currentPin: Yup.string()
        .matches(/^[0-9]{4}$/, 'Current PIN must be 4 digits')
        .required('Current PIN is required'),
    newPin: Yup.string()
        .matches(/^[0-9]{4}$/, 'New PIN must be 4 digits')
        .required('New PIN is required'),
    confirmPin: Yup.string()
        .oneOf([Yup.ref('newPin')], 'PINs must match')
        .required('Confirm PIN is required'),
});

interface UserSettings {
    biometricSignIn: boolean;
    biometricTransactions: boolean;
    hasTransactionPin: boolean;
    biometricType: string;
    fallbackBiometricTypes: string[];
    biometricHardwareLevel: string;
}

interface BiometricInfo {
    isAvailable: boolean;
    types: LocalAuthentication.AuthenticationType[];
    primaryType: string;
    fallbackTypes: string[];
    hardwareLevel: 'none' | 'weak' | 'strong';
    enrolledMethods: string[];
}

export default function ProfileScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectCurrentUser);

    // Enhanced biometric state
    const [biometricInfo, setBiometricInfo] = useState<BiometricInfo>({
        isAvailable: false,
        types: [],
        primaryType: 'none',
        fallbackTypes: [],
        hardwareLevel: 'none',
        enrolledMethods: []
    });

    // State management
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showChangePinModal, setShowChangePinModal] = useState(false);
    const [showBiometricModal, setShowBiometricModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [userSettings, setUserSettings] = useState<UserSettings>({
        biometricSignIn: false,
        biometricTransactions: false,
        hasTransactionPin: false,
        biometricType: 'none',
        fallbackBiometricTypes: [],
        biometricHardwareLevel: 'none'
    });
    const [emailResendCountdown, setEmailResendCountdown] = useState(0);

    // API hooks
    const { data: profileData, refetch: refetchProfile, isLoading } = useGetUserProfileQuery();
    const [updateProfile, { isLoading: isUpdatingProfile }] = useUpdateUserProfileMutation();
    const [uploadImage, { isLoading: isUploadingImage }] = useUploadProfileImageMutation();
    const [setTransactionPin, { isLoading: isSettingPin }] = useSetTransactionPinMutation();
    const [changeTransactionPin, { isLoading: isChangingPinLoading }] = useChangeTransactionPinMutation();
    const [toggleBiometricSetting] = useToggleBiometricSettingMutation();
    const [resendVerificationEmail, { isLoading: isResendingEmail }] = useResendVerificationEmailMutation();

    useEffect(() => {
        initializeBiometricSupport();
    }, []);

    useEffect(() => {
        if (profileData?.data) {
            loadUserSettings();
        }
    }, [profileData]);

    // Email resend countdown timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (emailResendCountdown > 0) {
            interval = setInterval(() => {
                setEmailResendCountdown(countdown => countdown - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [emailResendCountdown]);

    const initializeBiometricSupport = async () => {
        try {
            console.log('Initializing biometric support...');

            // Check if device has biometric hardware
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            if (!hasHardware) {
                console.log('No biometric hardware available');
                setBiometricInfo(prev => ({ ...prev, isAvailable: false, hardwareLevel: 'none' }));
                return;
            }

            // Check if biometrics are enrolled
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!isEnrolled) {
                console.log('No biometrics enrolled');
                setBiometricInfo(prev => ({
                    ...prev,
                    isAvailable: false,
                    hardwareLevel: 'weak',
                    enrolledMethods: []
                }));
                return;
            }

            // Get available biometric types
            const availableTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
            console.log('Available biometric types:', availableTypes);

            // Map biometric types to user-friendly names
            const typeMapping = {
                [LocalAuthentication.AuthenticationType.FINGERPRINT]: 'Fingerprint',
                [LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION]: 'Face ID',
                [LocalAuthentication.AuthenticationType.IRIS]: 'Iris',
            };

            const enrolledMethods = availableTypes.map(type => typeMapping[type]).filter(Boolean);

            // Determine primary and fallback types
            let primaryType = 'Biometric';
            let fallbackTypes: string[] = [];

            if (availableTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                primaryType = 'Face ID';
                fallbackTypes = enrolledMethods.filter(method => method !== 'Face ID');
            } else if (availableTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                primaryType = 'Fingerprint';
                fallbackTypes = enrolledMethods.filter(method => method !== 'Fingerprint');
            } else if (availableTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
                primaryType = 'Iris';
                fallbackTypes = enrolledMethods.filter(method => method !== 'Iris');
            } else if (enrolledMethods.length > 0) {
                primaryType = enrolledMethods[0];
                fallbackTypes = enrolledMethods.slice(1);
            }

            // Determine hardware security level
            const securityLevel = await LocalAuthentication.getEnrolledLevelAsync();
            let hardwareLevel: 'none' | 'weak' | 'strong' = 'weak';

            if (securityLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG) {
                hardwareLevel = 'strong';
            } else if (securityLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK) {
                hardwareLevel = 'weak';
            }

            setBiometricInfo({
                isAvailable: true,
                types: availableTypes,
                primaryType,
                fallbackTypes,
                hardwareLevel,
                enrolledMethods
            });

            console.log('Biometric info initialized:', {
                primaryType,
                fallbackTypes,
                hardwareLevel,
                enrolledMethods
            });

        } catch (error) {
            console.error('Biometric initialization error:', error);
            setBiometricInfo(prev => ({ ...prev, isAvailable: false }));
        }
    };

    const checkBiometricSupport = async () => {
        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            if (compatible) {
                const savedBiometrics = await LocalAuthentication.isEnrolledAsync();
                if (savedBiometrics) {
                    const biometricTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
                    if (biometricTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
                        setBiometricType('Face ID');
                    } else if (biometricTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
                        setBiometricType('Fingerprint');
                    } else {
                        setBiometricType('Biometric');
                    }
                }
            }
        } catch (error) {
            console.log('Biometric check error:', error);
        }
    };

    const loadUserSettings = () => {
        if (profileData?.data) {
            setUserSettings({
                biometricSignIn: profileData.data.biometricSignIn || false,
                biometricTransactions: profileData.data.biometricTransactions || false,
                hasTransactionPin: profileData.data.hasTransactionPin || false,
                biometricType: profileData.data.biometricType || biometricInfo.primaryType || 'none',
                fallbackBiometricTypes: profileData.data.fallbackBiometricTypes || biometricInfo.fallbackTypes || [],
                biometricHardwareLevel: profileData.data.biometricHardwareLevel || biometricInfo.hardwareLevel || 'none'
            });
            setProfileImage(profileData.data.imageUrl || null);
        }
    };

    // Enhanced biometric authentication with fallback
    const authenticateWithBiometric = async (purpose: string, allowFallback: boolean = true): Promise<boolean> => {
        try {
            if (!biometricInfo.isAvailable) {
                Alert.alert('Biometric Not Available', 'Biometric authentication is not available on this device.');
                return false;
            }

            // Primary authentication attempt
            console.log(`Attempting ${biometricInfo.primaryType} authentication for ${purpose}`);

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Use ${biometricInfo.primaryType} to ${purpose}`,
                subtitle: `Authenticate with your ${biometricInfo.primaryType}`,
                fallbackLabel: allowFallback && biometricInfo.fallbackTypes.length > 0 ? 'Try another method' : 'Use PIN',
                cancelLabel: 'Cancel',
                requireConfirmation: true,
                disableDeviceFallback: !allowFallback,
            });

            if (result.success) {
                console.log(`${biometricInfo.primaryType} authentication successful`);
                return true;
            }

            // Handle authentication failure
            if (result.error === 'SystemCancel' || result.error === 'UserCancel') {
                console.log('Biometric authentication cancelled');
                return false;
            }

            // Try fallback methods if available and enabled
            if (allowFallback && biometricInfo.fallbackTypes.length > 0) {
                console.log('Primary method failed, trying fallback methods');

                for (const fallbackType of biometricInfo.fallbackTypes) {
                    const fallbackResult = await LocalAuthentication.authenticateAsync({
                        promptMessage: `Use ${fallbackType} to ${purpose}`,
                        subtitle: `${biometricInfo.primaryType} failed. Try ${fallbackType}`,
                        fallbackLabel: 'Use PIN',
                        cancelLabel: 'Cancel',
                        requireConfirmation: true,
                    });

                    if (fallbackResult.success) {
                        console.log(`Fallback ${fallbackType} authentication successful`);
                        return true;
                    }
                }
            }

            // All biometric methods failed
            console.log('All biometric authentication methods failed');
            Alert.alert(
                'Authentication Failed',
                `${biometricInfo.primaryType} authentication failed. ${allowFallback ? 'Please use your PIN instead.' : 'Please try again.'}`
            );
            return false;

        } catch (error) {
            console.error('Biometric authentication error:', error);
            Alert.alert('Authentication Error', 'An error occurred during biometric authentication.');
            return false;
        }
    };


    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await refetchProfile();
        } finally {
            setRefreshing(false);
        }
    };

    const pickImage = async () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Take Photo', 'Choose from Library'],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        openCamera();
                    } else if (buttonIndex === 2) {
                        openImageLibrary();
                    }
                }
            );
        } else {
            Alert.alert(
                'Select Photo',
                'Choose how you want to select a photo',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Camera', onPress: openCamera },
                    { text: 'Gallery', onPress: openImageLibrary },
                ]
            );
        }
    };

    const openCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            uploadProfileImage(result.assets[0].uri);
        }
    };

    const openImageLibrary = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Media library permission is required to select photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            uploadProfileImage(result.assets[0].uri);
        }
    };

    const uploadProfileImage = async (imageUri: string) => {
        try {
            const formData = new FormData();
            formData.append('image', {
                uri: imageUri,
                type: 'image/jpeg',
                name: 'profile.jpg',
            } as any);

            const result = await uploadImage(formData).unwrap();

            const imageUrl = result.data?.imageUrl || result.imageUrl;
            if (imageUrl) {
                setProfileImage(imageUrl);
                Alert.alert('Success', 'Profile picture updated successfully!');
                refetchProfile();
            }
        } catch (error: any) {
            console.error('Image upload error:', error);
            const errorMessage = error.data?.message || error.data?.msg || 'Failed to upload image';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleUpdateProfile = async (values: any) => {
        try {
            const result = await updateProfile({
                id: user?.id || user?._id,
                payload: values
            }).unwrap();

            const updatedData = result.data || result;
            if (updatedData) {
                dispatch(updateUserProfile(updatedData));
                setShowEditModal(false);
                Alert.alert('Success', result.message || result.msg || 'Profile updated successfully!');
                refetchProfile();
            }
        } catch (error: any) {
            console.error('Profile update error:', error);
            const errorMessage = error.data?.message || error.data?.msg || 'Failed to update profile';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleSetPin = async (values: any) => {
        try {
            const result = await setTransactionPin({ pin: values.pin }).unwrap();
            setUserSettings(prev => ({ ...prev, hasTransactionPin: true }));
            setShowPinModal(false);
            Alert.alert('Success', result.message || result.msg || 'Transaction PIN set successfully!');
            refetchProfile();
        } catch (error: any) {
            console.error('Set PIN error:', error);
            const errorMessage = error.data?.message || error.data?.msg || 'Failed to set PIN';
            Alert.alert('Error', errorMessage);
        }
    };

    const handleChangePin = async (values: any) => {
        try {
            const result = await changeTransactionPin({
                currentPin: values.currentPin,
                newPin: values.newPin
            }).unwrap();
            setShowChangePinModal(false);
            Alert.alert('Success', result.message || result.msg || 'Transaction PIN changed successfully!');
        } catch (error: any) {
            console.error('Change PIN error:', error);
            const errorMessage = error.data?.message || error.data?.msg || 'Failed to change PIN';
            Alert.alert('Error', errorMessage);
        }
    };

    // Enhanced biometric toggle with type update
    const toggleBiometric = async (setting: 'biometricSignIn' | 'biometricTransactions', value: boolean) => {
        if (value) {
            // Test authentication before enabling
            const authSuccess = await authenticateWithBiometric(
                setting === 'biometricSignIn' ? 'enable biometric sign in' : 'enable biometric transactions',
                true
            );

            if (!authSuccess) {
                return;
            }
        }

        try {
            // Prepare the update payload with biometric info
            const updatePayload = {
                setting,
                enabled: value,
                biometricType: biometricInfo.primaryType,
                fallbackBiometricTypes: biometricInfo.fallbackTypes,
                biometricHardwareLevel: biometricInfo.hardwareLevel
            };

            console.log('Updating biometric setting:', updatePayload);

            const result = await toggleBiometricSetting(updatePayload).unwrap();

            setUserSettings(prev => ({
                ...prev,
                [setting]: value,
                biometricType: biometricInfo.primaryType,
                fallbackBiometricTypes: biometricInfo.fallbackTypes,
                biometricHardwareLevel: biometricInfo.hardwareLevel
            }));

            const settingName = setting === 'biometricSignIn' ? 'biometric sign in' : 'biometric transactions';
            const message = result.message || result.msg || `${settingName} ${value ? 'enabled' : 'disabled'} successfully`;

            Alert.alert('Success', `${message}\n\nPrimary method: ${biometricInfo.primaryType}${biometricInfo.fallbackTypes.length > 0 ? `\nFallback methods: ${biometricInfo.fallbackTypes.join(', ')}` : ''}`);

            // Refresh profile to get updated settings
            refetchProfile();

        } catch (error: any) {
            console.error('Toggle biometric error:', error);
            const errorMessage = error.data?.message || error.data?.msg || 'Failed to update biometric setting';
            Alert.alert('Error', errorMessage);
        }
    };

    // Biometric settings modal component
    const renderBiometricModal = () => (
        <Modal
            visible={showBiometricModal}
            animationType="slide"
            presentationStyle="pageSheet"
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowBiometricModal(false)}>
                        <Text style={styles.modalCancel}>Close</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>Biometric Settings</Text>
                    <View style={styles.modalPlaceholder} />
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.biometricInfo}>
                        <MaterialIcons
                            name={biometricInfo.primaryType === 'Face ID' ? 'face' : 'fingerprint'}
                            size={48}
                            color={COLORS.primary}
                        />
                        <Text style={styles.biometricTitle}>Biometric Authentication</Text>
                        <Text style={styles.biometricDescription}>
                            Your device supports {biometricInfo.primaryType} with {biometricInfo.hardwareLevel} security level.
                        </Text>

                        {biometricInfo.fallbackTypes.length > 0 && (
                            <View style={styles.fallbackInfo}>
                                <Text style={styles.fallbackTitle}>Available Fallback Methods:</Text>
                                {biometricInfo.fallbackTypes.map((type, index) => (
                                    <Text key={index} style={styles.fallbackType}>• {type}</Text>
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={styles.biometricOptions}>
                        <View style={styles.biometricOption}>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>Sign In with {biometricInfo.primaryType}</Text>
                                <Text style={styles.optionSubtitle}>
                                    Use {biometricInfo.primaryType.toLowerCase()} to sign into your account
                                </Text>
                            </View>
                            <Switch
                                value={userSettings.biometricSignIn}
                                onValueChange={(value) => toggleBiometric('biometricSignIn', value)}
                                trackColor={{ false: COLORS.border, true: COLORS.primaryBackground }}
                                thumbColor={userSettings.biometricSignIn ? COLORS.primary : COLORS.textTertiary}
                            />
                        </View>

                        <View style={styles.biometricOption}>
                            <View style={styles.optionContent}>
                                <Text style={styles.optionTitle}>Transaction {biometricInfo.primaryType}</Text>
                                <Text style={styles.optionSubtitle}>
                                    Use {biometricInfo.primaryType.toLowerCase()} for transaction verification
                                </Text>
                                {!userSettings.hasTransactionPin && (
                                    <Text style={styles.requirementText}>Requires transaction PIN</Text>
                                )}
                            </View>
                            <Switch
                                value={userSettings.biometricTransactions}
                                onValueChange={(value) => toggleBiometric('biometricTransactions', value)}
                                trackColor={{ false: COLORS.border, true: COLORS.primaryBackground }}
                                thumbColor={userSettings.biometricTransactions ? COLORS.primary : COLORS.textTertiary}
                                disabled={!userSettings.hasTransactionPin}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.testBiometricButton}
                        onPress={() => authenticateWithBiometric('test your biometric authentication', true)}
                    >
                        <MaterialIcons name="security" size={20} color={COLORS.primary} />
                        <Text style={styles.testBiometricText}>Test Biometric Authentication</Text>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );

    const renderBiometricMenuItem = () => {
        if (!biometricInfo.isAvailable) return null;

        return (
            <TouchableOpacity style={styles.menuItem} onPress={() => setShowBiometricModal(true)} activeOpacity={0.7}>
                <View style={styles.menuLeft}>
                    <View style={styles.menuIcon}>
                        <MaterialIcons
                            name={biometricInfo.primaryType === 'Face ID' ? 'face' : 'fingerprint'}
                            size={20}
                            color={COLORS.primary}
                        />
                    </View>
                    <View style={styles.menuContent}>
                        <Text style={styles.menuTitle}>{biometricInfo.primaryType} Authentication</Text>
                        <Text style={styles.menuSubtitle}>
                            {userSettings.biometricSignIn || userSettings.biometricTransactions
                                ? `Enabled • ${biometricInfo.fallbackTypes.length} fallback methods`
                                : 'Configure biometric settings'}
                        </Text>
                    </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
        );
    };

    const handleResendVerificationEmail = async () => {
        if (!user?.email) {
            Alert.alert('Error', 'Email address not found. Please try logging in again.');
            return;
        }

        if (emailResendCountdown > 0) {
            return; // Prevent spam clicking
        }

        try {
            const result = await resendVerificationEmail({ email: user.email }).unwrap();

            setEmailResendCountdown(60); // 60 seconds countdown

            Alert.alert(
                'Email Sent!',
                `A verification email has been sent to ${user.email}. Please check your inbox and spam folder.`,
                [{ text: 'OK', style: 'default' }]
            );
        } catch (error: any) {
            console.error('Resend email error:', error);
            const errorMessage = error.data?.message || 'Failed to send verification email. Please try again.';
            Alert.alert('Error', errorMessage);
        }
    };

    const formatCountdown = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getAccountCompletionPercentage = () => {
        if (!profileData?.data) return 0;

        const data = profileData.data;
        const fields = [
            data.firstName,
            data.lastName,
            data.email,
            data.phone,
            data.imageUrl,
            data.hasTransactionPin,
            data.verified
        ];

        const completedFields = fields.filter(field => field && field !== '').length;
        return Math.round((completedFields / fields.length) * 100);
    };

    const renderProfileHeader = () => (
        <View style={styles.profileHeader}>
            <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
                {profileImage || user?.imageUrl ? (
                    <Image
                        source={{ uri: profileImage || user?.imageUrl }}
                        style={styles.profileImage}
                    />
                ) : (
                    <View style={styles.placeholderImage}>
                        <MaterialIcons name="person" size={48} color={COLORS.textTertiary} />
                    </View>
                )}
                <View style={styles.cameraButton}>
                    <MaterialIcons name="camera-alt" size={16} color={COLORS.textInverse} />
                </View>
                {isUploadingImage && (
                    <View style={styles.uploadingOverlay}>
                        <MaterialIcons name="hourglass-empty" size={24} color={COLORS.primary} />
                    </View>
                )}
            </TouchableOpacity>

            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>
                {profileData?.data?.firstName || user?.firstName || user?.username || 'User'}
                {profileData?.data?.lastName && ` ${profileData.data.lastName}`}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>

            {/*{!user?.verified && (*/}
            {/*    <TouchableOpacity style={styles.verificationBadge}>*/}
            {/*        <MaterialIcons name="warning" size={16} color={COLORS.warning} />*/}
            {/*        <Text style={styles.verificationText}>Email not verified</Text>*/}
            {/*    </TouchableOpacity>*/}
            {/*)}*/}

            {/* Account Completion */}
            <View style={styles.completionContainer}>
                <View style={styles.completionHeader}>
                    <Text style={styles.completionTitle}>Profile Completion</Text>
                    <Text style={styles.completionPercentage}>{getAccountCompletionPercentage()}%</Text>
                </View>
                <View style={styles.progressBar}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: `${getAccountCompletionPercentage()}%` }
                        ]}
                    />
                </View>
            </View>
        </View>
    );

    const renderEmailVerificationBanner = () => {
        // Don't show banner if user is already verified
        if (user?.verified) return null;

        return (
            <View style={styles.emailBannerContainer}>
                <View style={styles.emailBannerContent}>
                    <MaterialIcons name="warning" size={20} color={COLORS.warning} />
                    <View style={styles.emailBannerText}>
                        <Text style={styles.emailBannerTitle}>Email Verification Required</Text>
                        <Text style={styles.emailBannerSubtitle}>
                            Verify your email to secure your account and unlock all features
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={[
                        styles.emailBannerButton,
                        (isResendingEmail || emailResendCountdown > 0) && styles.emailBannerButtonDisabled
                    ]}
                    onPress={handleResendVerificationEmail}
                    disabled={isResendingEmail || emailResendCountdown > 0}
                >
                    <Text style={[
                        styles.emailBannerButtonText,
                        (isResendingEmail || emailResendCountdown > 0) && styles.emailBannerButtonTextDisabled
                    ]}>
                        {isResendingEmail
                            ? 'Sending...'
                            : emailResendCountdown > 0
                                ? `${emailResendCountdown}s`
                                : 'Resend'
                        }
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderMenuItem = (
        icon: string,
        title: string,
        subtitle: string,
        onPress: () => void,
        rightComponent?: React.ReactNode
    ) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.menuLeft}>
                <View style={styles.menuIcon}>
                    <MaterialIcons name={icon as any} size={20} color={COLORS.primary} />
                </View>
                <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>{title}</Text>
                    <Text style={styles.menuSubtitle}>{subtitle}</Text>
                </View>
            </View>
            {rightComponent || <MaterialIcons name="chevron-right" size={20} color={COLORS.textTertiary} />}
        </TouchableOpacity>
    );

    const renderSwitchMenuItem = (
        icon: string,
        title: string,
        subtitle: string,
        value: boolean,
        onToggle: (value: boolean) => void,
        disabled?: boolean
    ) => (
        <View style={styles.menuItem}>
            <View style={styles.menuLeft}>
                <View style={styles.menuIcon}>
                    <MaterialIcons name={icon as any} size={20} color={COLORS.primary} />
                </View>
                <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>{title}</Text>
                    <Text style={styles.menuSubtitle}>{subtitle}</Text>
                    {disabled && (
                        <Text style={styles.disabledText}>Requires transaction PIN</Text>
                    )}
                </View>
            </View>
            <Switch
                value={value}
                onValueChange={onToggle}
                trackColor={{ false: COLORS.border, true: COLORS.primaryBackground }}
                thumbColor={value ? COLORS.primary : COLORS.textTertiary}
                disabled={disabled}
            />
        </View>
    );

    const renderQuickStats = () => (
        <View style={styles.quickStatsContainer}>
            <TouchableOpacity activeOpacity={1} style={{flex: 1}}>
            <View style={styles.statCard}>
                <MaterialIcons name="verified" size={24} color={COLORS.success} />
                <Text style={styles.statLabel}>KYC Level</Text>
                <Text style={styles.statValue}>Level {profileData?.data?.kycLevel || 0}</Text>
            </View>
            </TouchableOpacity>
            <View style={styles.statCard}>
                <MaterialIcons name="security" size={24} color={COLORS.warning} />
                <Text style={styles.statLabel}>Security</Text>
                <Text style={styles.statValue}>
                    {userSettings.hasTransactionPin && userSettings.biometricSignIn ? 'High' :
                        userSettings.hasTransactionPin ? 'Medium' : 'Low'}
                </Text>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
                <View style={styles.loadingContainer}>
                    <MaterialIcons name="hourglass-empty" size={48} color={COLORS.primary} />
                    <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            <ScrollView
                style={styles.scrollContainer}
                // contentContainerStyle={styles.scrollViewContent}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                overScrollMode="always"
                bounces={true}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
            {/* Header */}
            <LinearGradient
                colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={COLORS.textInverse} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
                        <MaterialIcons name="edit" size={24} color={COLORS.textInverse} />
                    </TouchableOpacity>
                </View>

                {renderProfileHeader()}
            </LinearGradient>

            {/* Content */}
                <View style={styles.contentContainer}>
                {/* Email Verification Banner */}
                {renderEmailVerificationBanner()}

                {/* Quick Stats */}
                {/*{renderQuickStats()}*/}

                {/* Personal Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    {renderMenuItem(
                        'person-outline',
                        'Basic Details',
                        'Name, email, phone number',
                        () => setShowEditModal(true)
                    )}
                    {renderMenuItem(
                        'email',
                        'Email Verification',
                        user?.verified ? 'Verified' : 'Not verified',
                        () => {
                            if (user?.verified) {
                                Alert.alert('Already Verified', 'Your email address is already verified!');
                            } else {
                                router.push('/profile/verify-email');
                            }
                        },
                        user?.verified ? (
                            <MaterialIcons name="verified" size={20} color={COLORS.success} />
                        ) : (
                            <TouchableOpacity
                                onPress={handleResendVerificationEmail}
                                disabled={isResendingEmail || emailResendCountdown > 0}
                                style={styles.quickResendButton}
                            >
                                <Text style={[
                                    styles.quickResendText,
                                    (isResendingEmail || emailResendCountdown > 0) && styles.quickResendTextDisabled
                                ]}>
                                    {isResendingEmail
                                        ? 'Sending...'
                                        : emailResendCountdown > 0
                                            ? `${emailResendCountdown}s`
                                            : 'Resend'
                                    }
                                </Text>
                            </TouchableOpacity>
                        )
                    )}
                </View>

                {/* Security Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Security Settings</Text>

                    {renderMenuItem(
                        'lock',
                        'Transaction PIN',
                        userSettings.hasTransactionPin ? 'PIN is set' : 'Set your PIN',
                        () => userSettings.hasTransactionPin ? setShowChangePinModal(true) : setShowPinModal(true),
                        userSettings.hasTransactionPin ? (
                            <MaterialIcons name="check-circle" size={20} color={COLORS.success} />
                        ) : (
                            <MaterialIcons name="warning" size={20} color={COLORS.warning} />
                        )
                    )}

                    {/*{biometricType && (*/}
                    {/*    <>*/}
                    {/*        {renderSwitchMenuItem(*/}
                    {/*            'fingerprint',*/}
                    {/*            `${biometricType} Sign In`,*/}
                    {/*            `Use ${biometricType.toLowerCase()} to sign in`,*/}
                    {/*            userSettings.biometricSignIn,*/}
                    {/*            (value) => toggleBiometric('biometricSignIn', value)*/}
                    {/*        )}*/}

                    {/*        {renderSwitchMenuItem(*/}
                    {/*            'security',*/}
                    {/*            `${biometricType} Transactions`,*/}
                    {/*            `Use ${biometricType.toLowerCase()} for transactions`,*/}
                    {/*            userSettings.biometricTransactions,*/}
                    {/*            (value) => toggleBiometric('biometricTransactions', value),*/}
                    {/*            !userSettings.hasTransactionPin*/}
                    {/*        )}*/}
                    {/*    </>*/}
                    {/*)}*/}

                    {renderBiometricMenuItem()}

                    {renderMenuItem(
                        'vpn-key',
                        'Change Password',
                        'Update your account password',
                        () => router.push('/profile/change-password')
                    )}
                </View>

                {/* Support & Legal */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support & Legal</Text>
                    {renderMenuItem(
                        'help',
                        'Help & Support',
                        'Get help with your account',
                        () => {
                            // You can implement a support screen or open email
                            Linking.openURL('mailto:support@hovapay.com');
                            // router.push("/chat")
                        }
                    )}
                    {renderMenuItem(
                        'feedback',
                        'Send Feedback',
                        'Tell us how we can improve',
                        () => {
                            // You can implement a feedback screen or open email
                            Linking.openURL('mailto:feedback@hovapay.com');
                        }
                    )}
                    {renderMenuItem(
                        'description',
                        'Terms & Conditions',
                        'Read our terms of service',
                        () => router.push('/legal/terms')
                    )}
                    {renderMenuItem(
                        'policy',
                        'Privacy Policy',
                        'How we protect your data',
                        () => router.push('/legal/privacy')
                    )}
                    {renderMenuItem(
                        'info',
                        'About Hovapay',
                        'App version and information',
                        () => router.push('/about')
                    )}
                </View>

                {/* Logout */}
                <View style={styles.section}>
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={() => {
                            Alert.alert(
                                'Logout',
                                'Are you sure you want to logout?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Logout', onPress: () => handleLogout('user_initiated'), style: 'destructive' }
                                ]
                            );
                        }}
                    >
                        <MaterialIcons name="logout" size={20} color={COLORS.error} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: SPACING['4xl'] }} />
                </View>
            </ScrollView>

            {/* Edit Profile Modal - Fixed with proper basic details form */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowEditModal(false)}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <View style={styles.modalPlaceholder} />
                    </View>

                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        <Formik
                            initialValues={{
                                firstName: profileData?.data?.firstName || user?.firstName || '',
                                lastName: profileData?.data?.lastName || user?.lastName || '',
                                phone: profileData?.data?.phone || user?.phone || '',
                                email: profileData?.data?.email || user?.email || '',
                            }}
                            validationSchema={ProfileUpdateSchema}
                            onSubmit={handleUpdateProfile}
                        >
                            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                                <>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>First Name</Text>
                                        <TextInput
                                            style={[styles.input, touched.firstName && errors.firstName && styles.inputError]}
                                            value={values.firstName}
                                            onChangeText={handleChange('firstName')}
                                            onBlur={handleBlur('firstName')}
                                            placeholder="Enter your first name"
                                            placeholderTextColor={COLORS.textTertiary}
                                        />
                                        {touched.firstName && errors.firstName && (
                                            <Text style={styles.errorText}>{errors.firstName}</Text>
                                        )}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Last Name</Text>
                                        <TextInput
                                            style={[styles.input, touched.lastName && errors.lastName && styles.inputError]}
                                            value={values.lastName}
                                            onChangeText={handleChange('lastName')}
                                            onBlur={handleBlur('lastName')}
                                            placeholder="Enter your last name"
                                            placeholderTextColor={COLORS.textTertiary}
                                        />
                                        {touched.lastName && errors.lastName && (
                                            <Text style={styles.errorText}>{errors.lastName}</Text>
                                        )}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Phone Number</Text>
                                        <TextInput
                                            style={[styles.input, touched.phone && errors.phone && styles.inputError]}
                                            value={values.phone}
                                            onChangeText={handleChange('phone')}
                                            onBlur={handleBlur('phone')}
                                            placeholder="Enter your phone number"
                                            placeholderTextColor={COLORS.textTertiary}
                                            keyboardType="phone-pad"
                                            maxLength={11}
                                        />
                                        {touched.phone && errors.phone && (
                                            <Text style={styles.errorText}>{errors.phone}</Text>
                                        )}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Email Address</Text>
                                        <TextInput
                                            style={[styles.input, touched.email && errors.email && styles.inputError]}
                                            value={values.email}
                                            onChangeText={handleChange('email')}
                                            onBlur={handleBlur('email')}
                                            placeholder="Enter your email address"
                                            placeholderTextColor={COLORS.textTertiary}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                        />
                                        {touched.email && errors.email && (
                                            <Text style={styles.errorText}>{errors.email}</Text>
                                        )}
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.saveButton, isUpdatingProfile && styles.saveButtonDisabled]}
                                        onPress={() => handleSubmit()}
                                        disabled={isUpdatingProfile}
                                    >
                                        {isUpdatingProfile ? (
                                            <View style={styles.loadingButtonContent}>
                                                <MaterialIcons name="hourglass-empty" size={20} color={COLORS.textInverse} />
                                                <Text style={styles.saveButtonText}>Updating...</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.saveButtonText}>Save Changes</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </Formik>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Set PIN Modal */}
            <Modal
                visible={showPinModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowPinModal(false)}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Set Transaction PIN</Text>
                        <View style={styles.modalPlaceholder} />
                    </View>

                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.pinInfo}>
                            <MaterialIcons name="lock" size={48} color={COLORS.primary} />
                            <Text style={styles.pinDescription}>
                                Create a 4-digit PIN to secure your transactions. Make sure to remember this PIN.
                            </Text>
                        </View>

                        <Formik
                            initialValues={{ pin: '', confirmPin: '' }}
                            validationSchema={PinSchema}
                            onSubmit={handleSetPin}
                        >
                            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                                <>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>PIN</Text>
                                        <TextInput
                                            style={[styles.input, styles.pinInput, touched.pin && errors.pin && styles.inputError]}
                                            value={values.pin}
                                            onChangeText={handleChange('pin')}
                                            onBlur={handleBlur('pin')}
                                            placeholder="••••"
                                            placeholderTextColor={COLORS.textTertiary}
                                            keyboardType="numeric"
                                            secureTextEntry
                                            maxLength={4}
                                        />
                                        {touched.pin && errors.pin && (
                                            <Text style={styles.errorText}>{errors.pin}</Text>
                                        )}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Confirm PIN</Text>
                                        <TextInput
                                            style={[styles.input, styles.pinInput, touched.confirmPin && errors.confirmPin && styles.inputError]}
                                            value={values.confirmPin}
                                            onChangeText={handleChange('confirmPin')}
                                            onBlur={handleBlur('confirmPin')}
                                            placeholder="••••"
                                            placeholderTextColor={COLORS.textTertiary}
                                            keyboardType="numeric"
                                            secureTextEntry
                                            maxLength={4}
                                        />
                                        {touched.confirmPin && errors.confirmPin && (
                                            <Text style={styles.errorText}>{errors.confirmPin}</Text>
                                        )}
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.saveButton, isSettingPin && styles.saveButtonDisabled]}
                                        onPress={() => handleSubmit()}
                                        disabled={isSettingPin}
                                    >
                                        {isSettingPin ? (
                                            <View style={styles.loadingButtonContent}>
                                                <MaterialIcons name="hourglass-empty" size={20} color={COLORS.textInverse} />
                                                <Text style={styles.saveButtonText}>Setting PIN...</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.saveButtonText}>Set PIN</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </Formik>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Change PIN Modal */}
            <Modal
                visible={showChangePinModal}
                animationType="slide"
                presentationStyle="pageSheet"
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowChangePinModal(false)}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Change PIN</Text>
                        <View style={styles.modalPlaceholder} />
                    </View>

                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.pinInfo}>
                            <MaterialIcons name="lock" size={48} color={COLORS.primary} />
                            <Text style={styles.pinDescription}>
                                Enter your current PIN and create a new one. Make sure to remember your new PIN.
                            </Text>
                        </View>

                        <Formik
                            initialValues={{ currentPin: '', newPin: '', confirmPin: '' }}
                            validationSchema={ChangePinSchema}
                            onSubmit={handleChangePin}
                        >
                            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                                <>
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Current PIN</Text>
                                        <TextInput
                                            style={[styles.input, styles.pinInput, touched.currentPin && errors.currentPin && styles.inputError]}
                                            value={values.currentPin}
                                            onChangeText={handleChange('currentPin')}
                                            onBlur={handleBlur('currentPin')}
                                            placeholder="••••"
                                            placeholderTextColor={COLORS.textTertiary}
                                            keyboardType="numeric"
                                            secureTextEntry
                                            maxLength={4}
                                        />
                                        {touched.currentPin && errors.currentPin && (
                                            <Text style={styles.errorText}>{errors.currentPin}</Text>
                                        )}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>New PIN</Text>
                                        <TextInput
                                            style={[styles.input, styles.pinInput, touched.newPin && errors.newPin && styles.inputError]}
                                            value={values.newPin}
                                            onChangeText={handleChange('newPin')}
                                            onBlur={handleBlur('newPin')}
                                            placeholder="••••"
                                            placeholderTextColor={COLORS.textTertiary}
                                            keyboardType="numeric"
                                            secureTextEntry
                                            maxLength={4}
                                        />
                                        {touched.newPin && errors.newPin && (
                                            <Text style={styles.errorText}>{errors.newPin}</Text>
                                        )}
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>Confirm New PIN</Text>
                                        <TextInput
                                            style={[styles.input, styles.pinInput, touched.confirmPin && errors.confirmPin && styles.inputError]}
                                            value={values.confirmPin}
                                            onChangeText={handleChange('confirmPin')}
                                            onBlur={handleBlur('confirmPin')}
                                            placeholder="••••"
                                            placeholderTextColor={COLORS.textTertiary}
                                            keyboardType="numeric"
                                            secureTextEntry
                                            maxLength={4}
                                        />
                                        {touched.confirmPin && errors.confirmPin && (
                                            <Text style={styles.errorText}>{errors.confirmPin}</Text>
                                        )}
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.saveButton, isChangingPinLoading && styles.saveButtonDisabled]}
                                        onPress={() => handleSubmit()}
                                        disabled={isChangingPinLoading}
                                    >
                                        {isChangingPinLoading ? (
                                            <View style={styles.loadingButtonContent}>
                                                <MaterialIcons name="hourglass-empty" size={20} color={COLORS.textInverse} />
                                                <Text style={styles.saveButtonText}>Changing PIN...</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.saveButtonText}>Change PIN</Text>
                                        )}
                                    </TouchableOpacity>
                                </>
                            )}
                        </Formik>
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {renderBiometricModal()}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.primary,
        paddingTop: SPACING.md,
    },
    scrollView: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['2xl'],
        borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
        // Add these:
        width: '100%',
        zIndex: 2,
    },
    scrollViewContent: {
        // paddingTop: SPACING.xl,
        paddingBottom: SPACING['4xl'],
        // paddingHorizontal: SPACING.xl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        marginTop: SPACING.base,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
    },
    header: {
        paddingTop: SPACING.base,
        paddingBottom: SPACING.xl,
        paddingHorizontal: SPACING.xl,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    backButton: {
        padding: SPACING.xs,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: SPACING.base,
    },
    editButton: {
        padding: SPACING.xs,
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: SPACING.base,
    },
    imageContainer: {
        position: 'relative',
        marginBottom: SPACING.base,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: COLORS.textInverse,
    },
    placeholderImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.withOpacity(COLORS.white, 0.2),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.textInverse,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.textInverse,
    },
    uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: COLORS.withOpacity(COLORS.white, 0.8),
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    greeting: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.withOpacity(COLORS.textInverse, 0.8),
        marginBottom: SPACING.xs,
    },
    userName: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
        marginBottom: SPACING.xs,
        textTransform: 'capitalize',
    },
    userEmail: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.withOpacity(COLORS.textInverse, 0.8),
        marginBottom: SPACING.sm,
    },
    verificationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.withOpacity(COLORS.warning, 0.2),
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.base,
        marginBottom: SPACING.base,
    },
    verificationText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.warning,
        marginLeft: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    completionContainer: {
        backgroundColor: COLORS.withOpacity(COLORS.white, 0.15),
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        width: '100%',
        marginTop: SPACING.sm,
    },
    completionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    completionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textInverse,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    completionPercentage: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textInverse,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
    },
    progressBar: {
        height: 6,
        backgroundColor: COLORS.withOpacity(COLORS.white, 0.3),
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.textInverse,
        borderRadius: 3,
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['2xl'],
        borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
        paddingTop: SPACING.xl,
    },
    quickStatsContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.xl,
        gap: SPACING.lg,
        // Add these:
        pointerEvents: 'box-none', // Allows touches to pass through
        zIndex: 1, // Ensure it stays above the background but below scrollable content
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        ...SHADOWS.sm,
        // Add these:
        pointerEvents: 'none', // Allows touches to pass through to ScrollView
    },
    statLabel: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginTop: SPACING.xs,
        textAlign: 'center',
    },
    statValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginTop: 2,
        textAlign: 'center',
    },
    section: {
        marginBottom: SPACING.xl,
        paddingHorizontal: SPACING.lg,
        marginHorizontal: SPACING.xs,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.sm,
        ...SHADOWS.sm,
    },
    menuLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
    },
    disabledText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.warning,
        fontStyle: 'italic',
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.error + '30',
        ...SHADOWS.sm,
    },
    logoutText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.error,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        marginLeft: SPACING.sm,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.base,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalCancel: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.primary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    modalPlaceholder: {
        width: 60,
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xl,
    },
    pinInfo: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        paddingVertical: SPACING.base,
    },
    pinDescription: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.base,
        lineHeight: 24,
        paddingHorizontal: SPACING.base,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    inputLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    input: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.md,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        minHeight: 48,
    },
    inputError: {
        borderColor: COLORS.error,
        backgroundColor: COLORS.withOpacity(COLORS.error, 0.05),
    },
    pinInput: {
        textAlign: 'center',
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        letterSpacing: 8,
    },
    errorText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.error,
        marginTop: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        minHeight: 48,
        ...SHADOWS.colored(COLORS.primary),
    },
    saveButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    saveButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
    loadingButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    // Email verification banner styles
    emailBannerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.withOpacity(COLORS.warning, 0.1),
        borderWidth: 1,
        borderColor: COLORS.withOpacity(COLORS.warning, 0.3),
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginHorizontal: SPACING.xl,
        marginVertical: SPACING.lg,
        // ...SHADOWS.sm,
    },
    emailBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    emailBannerText: {
        marginLeft: SPACING.sm,
        flex: 1,
    },
    emailBannerTitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.warning,
        marginBottom: 2,
    },
    emailBannerSubtitle: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.withOpacity(COLORS.warning, 0.8),
        lineHeight: 16,
    },
    emailBannerButton: {
        backgroundColor: COLORS.warning,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        minWidth: 60,
        alignItems: 'center',
    },
    emailBannerButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    emailBannerButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textInverse,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
    emailBannerButtonTextDisabled: {
        color: COLORS.textTertiary,
    },
    // Quick resend button in menu item
    quickResendButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.sm,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        minWidth: 50,
        alignItems: 'center',
    },
    quickResendText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textInverse,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    quickResendTextDisabled: {
        color: COLORS.textTertiary,
    },
    biometricInfo: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        paddingVertical: SPACING.base,
    },
    biometricTitle: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
        marginTop: SPACING.base,
        marginBottom: SPACING.sm,
    },
    biometricDescription: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: SPACING.base,
    },
    fallbackInfo: {
        marginTop: SPACING.base,
        paddingHorizontal: SPACING.base,
        alignItems: 'center',
    },
    fallbackTitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    fallbackType: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
        lineHeight: 20,
    },
    biometricOptions: {
        marginBottom: SPACING.xl,
    },
    biometricOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.base,
        ...SHADOWS.sm,
    },
    optionContent: {
        flex: 1,
        marginRight: SPACING.base,
    },
    optionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    optionSubtitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
        lineHeight: 18,
    },
    requirementText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.warning,
        fontStyle: 'italic',
        marginTop: 2,
    },
    testBiometricButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primaryBackground,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    testBiometricText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.primary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        marginLeft: SPACING.sm,
    },
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        backgroundColor: COLORS.background,
        // borderTopLeftRadius: RADIUS['3xl'],
        // borderTopRightRadius: RADIUS['3xl'],
        marginTop: -SPACING.xl,
        paddingTop: SPACING.xl,
        flex: 1,
    },
});