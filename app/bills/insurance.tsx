// app/bills/insurance.tsx - Updated for VTPass Third-Party Motor Insurance API
import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Image,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik, FormikProps } from 'formik';
import * as Yup from 'yup';
import {
    useGetServicesByCategoryQuery,
    useGetServiceVariationsQuery,
    usePayBillMutation,
    useGetWalletBalanceQuery,
    // Import the new insurance hooks
    useGetStatesQuery,
    useGetLGAsQuery,
    useGetVehicleMakesQuery,
    useGetVehicleModelsQuery,
    useGetVehicleColorsQuery,
    useGetEngineCapacitiesQuery,
} from '@/store/api/billsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';
import * as LocalAuthentication from 'expo-local-authentication';
import {
    useGetUserProfileQuery,
    useVerifyTransactionPinMutation
} from '@/store/api/profileApi';
import { Modal } from 'react-native';

const { width } = Dimensions.get('window');

// Updated schema for third-party motor insurance
const ThirdPartyInsuranceSchema = Yup.object().shape({
    plateNumber: Yup.string()
        .min(5, 'Plate number must be at least 5 characters')
        .max(15, 'Plate number must not exceed 15 characters')
        .required('Vehicle plate number is required'),
    insuredName: Yup.string()
        .min(2, 'Insured name must be at least 2 characters')
        .required('Vehicle owner name is required'),
    chassisNumber: Yup.string()
        .min(10, 'Chassis number must be at least 10 characters')
        .required('Vehicle chassis number is required'),
    yearOfMake: Yup.number()
        .min(1980, 'Year must be 1980 or later')
        .max(new Date().getFullYear(), `Year cannot be future`)
        .required('Year of manufacture is required'),
    phone: Yup.string()
        .matches(/^[0-9]{11}$/, 'Phone number must be 11 digits')
        .required('Phone number is required'),
    email: Yup.string()
        .email('Invalid email address')
        .required('Email address is required'),
});

// Insurance plan types (from VTPass variations)
const insurancePlans = [
    { code: '1', name: 'Private Vehicle', amount: 3000 },
    { code: '2', name: 'Commercial Vehicle', amount: 5000 },
    { code: '3', name: 'Tricycles', amount: 1500 },
    { code: '4', name: 'Motorcycle', amount: 3000 },
];

interface FormValues {
    plateNumber: string;
    insuredName: string;
    chassisNumber: string;
    yearOfMake: string;
    phone: string;
    email: string;
}

interface InsuranceOption {
    code: string;
    name: string;
    amount?: number;
}

interface VehicleData {
    selectedPlan: InsuranceOption | null;
    selectedState: InsuranceOption | null;
    selectedLGA: InsuranceOption | null;
    selectedMake: InsuranceOption | null;
    selectedModel: InsuranceOption | null;
    selectedColor: InsuranceOption | null;
    selectedEngineCapacity: InsuranceOption | null;
}

export default function InsuranceScreen() {
    const router = useRouter();

    // Form state
    const [vehicleData, setVehicleData] = useState<VehicleData>({
        selectedPlan: null,
        selectedState: null,
        selectedLGA: null,
        selectedMake: null,
        selectedModel: null,
        selectedColor: null,
        selectedEngineCapacity: null,
    });

    // Options state - now using API hooks
    const { data: statesData, isLoading: loadingStates } = useGetStatesQuery();
    const { data: lgasData, isLoading: loadingLGAs, refetch: refetchLGAs } = useGetLGAsQuery(
        vehicleData.selectedState?.code || '',
        { skip: !vehicleData.selectedState?.code }
    );
    const { data: vehicleMakesData, isLoading: loadingMakes } = useGetVehicleMakesQuery();
    const { data: vehicleModelsData, isLoading: loadingModels, refetch: refetchModels } = useGetVehicleModelsQuery(
        vehicleData.selectedMake?.code || '',
        { skip: !vehicleData.selectedMake?.code }
    );
    const { data: vehicleColorsData, isLoading: loadingColors } = useGetVehicleColorsQuery();
    const { data: engineCapacitiesData, isLoading: loadingEngineCapacities } = useGetEngineCapacitiesQuery();

    // Transform API data to our format with proper fallbacks
    const states = React.useMemo(() => {
        if (statesData?.content && Array.isArray(statesData.content)) {
            return statesData.content.map((item: any) => ({
                code: item.StateCode || item.code,
                name: item.StateName || item.name
            }));
        }
        // Fallback states
        return [
            { code: '1', name: 'Abia' },
            { code: '2', name: 'Adamawa' },
            { code: '3', name: 'Akwa Ibom' },
            { code: '4', name: 'Anambra' },
            { code: '5', name: 'Bauchi' },
            { code: '6', name: 'Bayelsa' },
            { code: '7', name: 'FCT' },
            { code: '8', name: 'Benue' },
            { code: '9', name: 'Borno' },
            { code: '10', name: 'Cross River' },
            { code: '11', name: 'Delta' },
            { code: '12', name: 'Ebonyi' },
            { code: '13', name: 'Edo' },
            { code: '14', name: 'Ekiti' },
            { code: '15', name: 'Enugu' },
            { code: '16', name: 'Gombe' },
            { code: '17', name: 'Imo' },
            { code: '18', name: 'Jigawa' },
            { code: '19', name: 'Kaduna' },
            { code: '20', name: 'Kano' },
            { code: '21', name: 'Katsina' },
            { code: '22', name: 'Kebbi' },
            { code: '23', name: 'Kogi' },
            { code: '24', name: 'Kwara' },
            { code: '25', name: 'Lagos' },
            { code: '26', name: 'Nasarawa' },
            { code: '27', name: 'Niger' },
            { code: '28', name: 'Ogun' },
            { code: '29', name: 'Ondo' },
            { code: '30', name: 'Osun' },
            { code: '31', name: 'Oyo' },
            { code: '32', name: 'Plateau' },
            { code: '33', name: 'Rivers' },
            { code: '34', name: 'Sokoto' },
            { code: '35', name: 'Taraba' },
            { code: '36', name: 'Yobe' },
            { code: '37', name: 'Zamfara' }
        ];
    }, [statesData]);

    const lgas = React.useMemo(() => {
        // If we have API data, use it
        if (lgasData?.content && Array.isArray(lgasData.content) && lgasData.content.length > 0) {
            console.log('Using API LGA data:', lgasData.content);
            return lgasData.content.map((item: any) => ({
                code: item.LGACode || item.code,
                name: item.LGAName || item.name
            }));
        }

        // If a state is selected but no API data, use fallback
        if (vehicleData.selectedState) {
            console.log('Using fallback LGA data for state:', vehicleData.selectedState.name);
            const fallbackLGAs: { [key: string]: InsuranceOption[] } = {
                '1': [ // Abia
                    { code: '770', name: 'Aba' },
                    { code: '1', name: 'Aba North' },
                    { code: '2', name: 'Aba South' },
                    { code: '3', name: 'Arochukwu' },
                    { code: '4', name: 'Bende' },
                    { code: '5', name: 'Ikwuano' },
                    { code: '6', name: 'Isiala Ngwa North' },
                    { code: '7', name: 'Isiala Ngwa South' },
                    { code: '8', name: 'Isuikwuato' },
                    { code: '9', name: 'Obi Ngwa' },
                    { code: '10', name: 'Ohafia' },
                    { code: '11', name: 'Osisioma' },
                    { code: '12', name: 'Ugwunagbo' },
                    { code: '13', name: 'Ukwa East' },
                    { code: '14', name: 'Ukwa West' },
                    { code: '15', name: 'Umuahia North' },
                    { code: '16', name: 'Umuahia South' },
                    { code: '17', name: 'Umu Nneochi' }
                ],
                '25': [ // Lagos
                    { code: '450', name: 'Agege' },
                    { code: '451', name: 'Ajeromi-Ifelodun' },
                    { code: '452', name: 'Alimosho' },
                    { code: '453', name: 'Amuwo-Odofin' },
                    { code: '454', name: 'Apapa' },
                    { code: '455', name: 'Badagry' },
                    { code: '456', name: 'Epe' },
                    { code: '457', name: 'Eti Osa' },
                    { code: '458', name: 'Ibeju-Lekki' },
                    { code: '459', name: 'Ifako-Ijaiye' },
                    { code: '460', name: 'Ikeja' },
                    { code: '461', name: 'Ikorodu' },
                    { code: '462', name: 'Kosofe' },
                    { code: '463', name: 'Lagos Island' },
                    { code: '464', name: 'Lagos Mainland' },
                    { code: '465', name: 'Mushin' },
                    { code: '466', name: 'Ojo' },
                    { code: '467', name: 'Oshodi-Isolo' },
                    { code: '468', name: 'Shomolu' },
                    { code: '469', name: 'Surulere' }
                ],
                '7': [ // FCT
                    { code: '780', name: 'Abaji' },
                    { code: '781', name: 'Abuja Municipal' },
                    { code: '782', name: 'Bwari' },
                    { code: '783', name: 'Gwagwalada' },
                    { code: '784', name: 'Kuje' },
                    { code: '785', name: 'Kwali' }
                ],
                '4': [ // Anambra
                    { code: '100', name: 'Aguata' },
                    { code: '101', name: 'Anambra East' },
                    { code: '102', name: 'Anambra West' },
                    { code: '103', name: 'Anaocha' },
                    { code: '104', name: 'Awka North' },
                    { code: '105', name: 'Awka South' },
                    { code: '106', name: 'Ayamelum' },
                    { code: '107', name: 'Dunukofia' },
                    { code: '108', name: 'Ekwusigo' },
                    { code: '109', name: 'Idemili North' },
                    { code: '110', name: 'Idemili South' },
                    { code: '111', name: 'Ihiala' },
                    { code: '112', name: 'Njikoka' },
                    { code: '113', name: 'Nnewi North' },
                    { code: '114', name: 'Nnewi South' },
                    { code: '115', name: 'Ogbaru' },
                    { code: '116', name: 'Onitsha North' },
                    { code: '117', name: 'Onitsha South' },
                    { code: '118', name: 'Orumba North' },
                    { code: '119', name: 'Orumba South' },
                    { code: '120', name: 'Oyi' }
                ],
                '33': [ // Rivers
                    { code: '600', name: 'Port Harcourt' },
                    { code: '601', name: 'Obio-Akpor' },
                    { code: '602', name: 'Okrika' },
                    { code: '603', name: 'Ogu–Bolo' },
                    { code: '604', name: 'Eleme' },
                    { code: '605', name: 'Tai' },
                    { code: '606', name: 'Gokana' },
                    { code: '607', name: 'Khana' },
                    { code: '608', name: 'Oyigbo' },
                    { code: '609', name: 'Opobo–Nkoro' },
                    { code: '610', name: 'Andoni' },
                    { code: '611', name: 'Bonny' },
                    { code: '612', name: 'Degema' },
                    { code: '613', name: 'Asari-Toru' },
                    { code: '614', name: 'Akuku-Toru' },
                    { code: '615', name: 'Abua–Odual' },
                    { code: '616', name: 'Ahoada West' },
                    { code: '617', name: 'Ahoada East' },
                    { code: '618', name: 'Ogba–Egbema–Ndoni' },
                    { code: '619', name: 'Emohua' },
                    { code: '620', name: 'Ikwerre' },
                    { code: '621', name: 'Etche' },
                    { code: '622', name: 'Omuma' }
                ]
            };

            const stateLGAs = fallbackLGAs[vehicleData.selectedState.code];
            if (stateLGAs) {
                return stateLGAs;
            }

            // Generic fallback for states without specific LGA data
            return [
                { code: `${vehicleData.selectedState.code}01`, name: `${vehicleData.selectedState.name} Central` },
                { code: `${vehicleData.selectedState.code}02`, name: `${vehicleData.selectedState.name} North` },
                { code: `${vehicleData.selectedState.code}03`, name: `${vehicleData.selectedState.name} South` },
                { code: `${vehicleData.selectedState.code}04`, name: `${vehicleData.selectedState.name} East` },
                { code: `${vehicleData.selectedState.code}05`, name: `${vehicleData.selectedState.name} West` }
            ];
        }

        // No state selected
        console.log('No state selected, returning empty LGA array');
        return [];
    }, [lgasData, vehicleData.selectedState]);

    const vehicleMakes = React.useMemo(() => {
        if (vehicleMakesData?.content && Array.isArray(vehicleMakesData.content)) {
            return vehicleMakesData.content.map((item: any) => ({
                code: item.VehicleMakeCode || item.code,
                name: item.VehicleMakeName || item.name
            }));
        }
        // Fallback vehicle makes
        return [
            { code: '335', name: 'Toyota' },
            { code: '1', name: 'Honda' },
            { code: '2', name: 'Nissan' },
            { code: '3', name: 'Hyundai' },
            { code: '4', name: 'Kia' },
            { code: '5', name: 'Mercedes-Benz' },
            { code: '6', name: 'BMW' },
            { code: '7', name: 'Volkswagen' },
            { code: '8', name: 'Ford' },
            { code: '9', name: 'Peugeot' },
            { code: '10', name: 'Mazda' },
            { code: '11', name: 'Lexus' },
            { code: '12', name: 'Infiniti' },
            { code: '13', name: 'Acura' },
            { code: '14', name: 'Mitsubishi' },
            { code: '15', name: 'Suzuki' },
            { code: '16', name: 'Isuzu' },
            { code: '17', name: 'Jeep' },
            { code: '18', name: 'Land Rover' },
            { code: '19', name: 'Volvo' },
            { code: '20', name: 'Audi' }
        ];
    }, [vehicleMakesData]);

    const vehicleModels = React.useMemo(() => {
        if (vehicleModelsData?.content && Array.isArray(vehicleModelsData.content)) {
            return vehicleModelsData.content.map((item: any) => ({
                code: item.VehicleModelCode || item.code,
                name: item.VehicleModelName || item.name
            }));
        }
        // Fallback models based on selected make
        if (vehicleData.selectedMake) {
            const fallbackModels: { [key: string]: InsuranceOption[] } = {
                '335': [ // Toyota
                    { code: '745', name: 'Camry' },
                    { code: '746', name: 'Corolla' },
                    { code: '747', name: 'Highlander' },
                    { code: '748', name: 'RAV4' },
                    { code: '749', name: 'Sienna' },
                    { code: '750', name: 'Prius' },
                    { code: '751', name: 'Avalon' },
                    { code: '752', name: 'Venza' }
                ],
                '1': [ // Honda
                    { code: '1', name: 'Accord' },
                    { code: '2', name: 'Civic' },
                    { code: '3', name: 'CR-V' },
                    { code: '4', name: 'Pilot' },
                    { code: '5', name: 'Odyssey' },
                    { code: '6', name: 'Fit' }
                ]
            };
            return fallbackModels[vehicleData.selectedMake.code] || [
                { code: '999', name: 'Other Model' }
            ];
        }
        return [];
    }, [vehicleModelsData, vehicleData.selectedMake]);

    const vehicleColors = React.useMemo(() => {
        if (vehicleColorsData?.content && Array.isArray(vehicleColorsData.content)) {
            return vehicleColorsData.content.map((item: any) => ({
                code: item.ColourCode || item.code,
                name: item.ColourName || item.name
            }));
        }
        // Fallback colors
        return [
            { code: '20', name: 'Ash' },
            { code: '1004', name: 'Black' },
            { code: '1001', name: 'White' },
            { code: '1002', name: 'Red' },
            { code: '1003', name: 'Blue' },
            { code: '1005', name: 'Silver' },
            { code: '1006', name: 'Gold' },
            { code: '1007', name: 'Green' },
            { code: '1008', name: 'Yellow' },
            { code: '1009', name: 'Orange' }
        ];
    }, [vehicleColorsData]);

    const engineCapacities = React.useMemo(() => {
        if (engineCapacitiesData?.content && Array.isArray(engineCapacitiesData.content)) {
            return engineCapacitiesData.content.map((item: any) => ({
                code: item.CapacityCode || item.code,
                name: item.CapacityName || item.name
            }));
        }
        // Fallback engine capacities
        return [
            { code: '1', name: '0.1 - 1.59L' },
            { code: '2', name: '1.6 - 2.0L' },
            { code: '3', name: '2.1 - 3.0L' },
            { code: '4', name: '3.1 - 4.0L' },
            { code: '5', name: '4.1 - 5.0L' },
            { code: '6', name: 'Above 5.0L' }
        ];
    }, [engineCapacitiesData]);

    // Modal state for dropdowns
    const [showDropdownModal, setShowDropdownModal] = useState(false);
    const [dropdownData, setDropdownData] = useState<{
        title: string;
        options: InsuranceOption[];
        onSelect: (option: InsuranceOption) => void;
        selectedValue: InsuranceOption | null;
    } | null>(null);
    const [dropdownSearchText, setDropdownSearchText] = useState('');

    // Security modal state
    const [showSecurityModal, setShowSecurityModal] = useState(false);
    const [securityType, setSecurityType] = useState<'pin' | 'biometric' | null>(null);
    const [enteredPin, setEnteredPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pendingTransaction, setPendingTransaction] = useState<any>(null);

    // API hooks
    const { data: walletData, refetch: refetchWallet } = useGetWalletBalanceQuery();
    const [payBill, { isLoading }] = usePayBillMutation();
    const { data: userProfile } = useGetUserProfileQuery();
    const [verifyPin] = useVerifyTransactionPinMutation();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Utility function to safely separate API data from display data
    const separateTransactionData = (combinedData: any) => {
        if (!combinedData) {
            console.error('separateTransactionData: combinedData is null or undefined');
            return { apiData: null, displayData: null };
        }

        // Define API fields (only these should be sent to the backend)
        const apiFields = [
            'request_id', 'serviceID', 'billersCode', 'variation_code', 'amount', 'phone',
            'Insured_Name', 'engine_capacity', 'Chasis_Number', 'Plate_Number',
            'vehicle_make', 'vehicle_color', 'vehicle_model', 'YearofMake',
            'state', 'lga', 'email'
        ];

        // Define display fields
        const displayFields = ['formValues', 'vehicleData', 'planName', 'providerName', 'insuranceType'];

        // Extract API data
        const apiData: any = {};
        apiFields.forEach(field => {
            if (combinedData[field] !== undefined) {
                apiData[field] = combinedData[field];
            }
        });

        // Extract display data
        const displayData: any = {};
        displayFields.forEach(field => {
            if (combinedData[field] !== undefined) {
                displayData[field] = combinedData[field];
            }
        });

        console.log('Data separation result:', {
            hasApiData: Object.keys(apiData).length > 0,
            hasDisplayData: Object.keys(displayData).length > 0,
            apiDataKeys: Object.keys(apiData),
            displayDataKeys: Object.keys(displayData)
        });

        return { apiData, displayData };
    };

    const openDropdownModal = (
        title: string,
        options: InsuranceOption[],
        onSelect: (option: InsuranceOption) => void,
        selectedValue: InsuranceOption | null
    ) => {
        setDropdownData({ title, options, onSelect, selectedValue });
        setDropdownSearchText('');
        setShowDropdownModal(true);
    };

    const closeDropdownModal = () => {
        setShowDropdownModal(false);
        setDropdownData(null);
        setDropdownSearchText('');
    };

    const filteredDropdownOptions = dropdownData?.options.filter(option =>
        option.name.toLowerCase().includes(dropdownSearchText.toLowerCase())
    ) || [];

    // Handle state selection
    const handleStateSelect = (state: InsuranceOption) => {
        console.log('State selected:', state.name, 'Code:', state.code);
        setVehicleData(prev => ({
            ...prev,
            selectedState: state,
            selectedLGA: null // Reset LGA when state changes
        }));
    };

    // Handle make selection
    const handleMakeSelect = (make: InsuranceOption) => {
        console.log('Vehicle make selected:', make.name, 'Code:', make.code);
        setVehicleData(prev => ({
            ...prev,
            selectedMake: make,
            selectedModel: null // Reset model when make changes
        }));
    };

    // Effect to log LGA data changes for debugging
    React.useEffect(() => {
        if (vehicleData.selectedState) {
            console.log('Selected state changed to:', vehicleData.selectedState.name);
            console.log('LGAs loading status:', loadingLGAs);
            console.log('LGAs data:', lgasData);
        }
    }, [vehicleData.selectedState, loadingLGAs, lgasData]);

    // Effect to log vehicle model data changes for debugging
    React.useEffect(() => {
        if (vehicleData.selectedMake) {
            console.log('Selected make changed to:', vehicleData.selectedMake.name);
            console.log('Models loading status:', loadingModels);
            console.log('Models data:', vehicleModelsData);
        }
    }, [vehicleData.selectedMake, loadingModels, vehicleModelsData]);

    const checkSecuritySetup = () => {
        const hasPin = userProfile?.data?.pin;
        const hasBiometric = userProfile?.data?.biometricTransactions;

        return {
            hasPin: !!hasPin,
            hasBiometric: !!hasBiometric,
            hasAnySecurity: !!hasPin || !!hasBiometric,
            canUseBiometric: !!hasBiometric && userProfile?.data?.biometricType !== 'none'
        };
    };

    const attemptBiometricAuth = async () => {
        try {
            const biometricAuth = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Confirm your insurance purchase',
                subtitle: 'Use your biometric to authorize this payment',
                cancelLabel: 'Cancel',
                fallbackLabel: 'Use PIN'
            });

            if (biometricAuth.success) {
                return true;
            } else if (biometricAuth.error === 'UserCancel') {
                return false;
            } else {
                const security = checkSecuritySetup();
                if (security.hasPin) {
                    setSecurityType('pin');
                    setShowSecurityModal(true);
                } else {
                    Alert.alert('Authentication Failed', 'Biometric authentication failed and no PIN is set up.');
                }
                return false;
            }
        } catch (error) {
            console.error('Biometric authentication error:', error);
            const security = checkSecuritySetup();
            if (security.hasPin) {
                setSecurityType('pin');
                setShowSecurityModal(true);
            } else {
                Alert.alert('Error', 'Biometric authentication is not available and no PIN is set up.');
            }
            return false;
        }
    };

    const verifyTransactionPin = async () => {
        if (!enteredPin || enteredPin.length !== 4) {
            setPinError('Please enter a 4-digit PIN');
            return false;
        }

        try {
            const result = await verifyPin({ pin: enteredPin }).unwrap();

            if (result.status === 'success') {
                setShowSecurityModal(false);
                setEnteredPin('');
                setPinError('');
                return true;
            } else {
                setPinError('Incorrect PIN. Please try again.');
                return false;
            }
        } catch (error: any) {
            setPinError(error.data?.message || 'PIN verification failed');
            return false;
        }
    };

    const handlePayment = async (values: FormValues) => {
        if (!vehicleData.selectedPlan) {
            Alert.alert('Error', 'Please select an insurance plan');
            return;
        }

        if (!vehicleData.selectedState) {
            Alert.alert('Error', 'Please select a state');
            return;
        }

        if (!vehicleData.selectedLGA) {
            Alert.alert('Error', 'Please select a local government area');
            return;
        }

        if (!vehicleData.selectedMake) {
            Alert.alert('Error', 'Please select vehicle make');
            return;
        }

        if (!vehicleData.selectedModel) {
            Alert.alert('Error', 'Please select vehicle model');
            return;
        }

        if (!vehicleData.selectedColor) {
            Alert.alert('Error', 'Please select vehicle color');
            return;
        }

        if (!vehicleData.selectedEngineCapacity) {
            Alert.alert('Error', 'Please select engine capacity');
            return;
        }

        const amount = vehicleData.selectedPlan.amount || 0;

        // Check wallet balance
        if (walletData && amount > walletData?.data?.balance) {
            const shortfall = amount - walletData.data.balance;
            Alert.alert(
                'Insufficient Balance',
                `You need ${formatCurrency(shortfall)} more to complete this transaction.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Fund Wallet',
                        onPress: () => router.push('/(tabs)/wallet'),
                        style: 'default'
                    }
                ]
            );
            return;
        }

        // Prepare transaction data for third-party motor insurance
        const transactionData = {
            request_id: `INS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            serviceID: 'ui-insure', // VTPass third-party insurance service ID
            billersCode: values.plateNumber.toUpperCase(),
            variation_code: vehicleData.selectedPlan.code.toString(), // Ensure it's a string
            amount: amount,
            phone: values.phone,

            // Additional required fields for third-party motor insurance
            Insured_Name: values.insuredName,
            engine_capacity: vehicleData.selectedEngineCapacity.code.toString(),
            Chasis_Number: values.chassisNumber.toUpperCase(),
            Plate_Number: values.plateNumber.toUpperCase(),
            vehicle_make: vehicleData.selectedMake.code.toString(),
            vehicle_color: vehicleData.selectedColor.code.toString(),
            vehicle_model: vehicleData.selectedModel.code.toString(),
            YearofMake: values.yearOfMake.toString(),
            state: vehicleData.selectedState.code.toString(),
            lga: vehicleData.selectedLGA.code.toString(),
            email: values.email,
        };

        console.log('Transaction data prepared:', {
            serviceID: transactionData.serviceID,
            variation_code: `"${transactionData.variation_code}" (${typeof transactionData.variation_code})`,
            amount: transactionData.amount,
            hasAllFields: !!(
                transactionData.serviceID &&
                transactionData.variation_code &&
                transactionData.amount &&
                transactionData.phone &&
                transactionData.Insured_Name &&
                transactionData.Plate_Number
            )
        });

        // Separate display data (not sent to API)
        const displayData = {
            formValues: values,
            vehicleData: vehicleData,
            planName: vehicleData.selectedPlan.name,
            providerName: 'Universal Insurance',
            insuranceType: 'Third-Party Motor Insurance'
        };

        // Check security setup and handle accordingly
        const security = checkSecuritySetup();

        if (!security.hasAnySecurity) {
            Alert.alert(
                'Security Setup Required',
                'To make transactions, you need to set up either a transaction PIN or enable biometric authentication.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Setup Security',
                        onPress: () => router.push('/(tabs)/profile'),
                    }
                ]
            );
            return;
        }

        // Store pending transaction
        setPendingTransaction(transactionData);

        // Try biometric first if available
        if (security.canUseBiometric) {
            const biometricSuccess = await attemptBiometricAuth();
            if (biometricSuccess) {
                await processPayment(transactionData);
            }
        } else if (security.hasPin) {
            setSecurityType('pin');
            setShowSecurityModal(true);
        }
    };

    const processPayment = async (transactionData: any) => {
        try {
            console.log('Sending third-party motor insurance payment request:', transactionData);

            const result = await payBill(transactionData).unwrap();
            console.log('Insurance payment result:', result);

            const isActuallySuccessful = result.success === true;

            // Refetch wallet balance to update UI
            refetchWallet();

            if (isActuallySuccessful) {
                // Success - third-party insurance includes certificate URL
                const certificateUrl = result.data?.vtpassResponse?.certUrl || result.data?.vtpassResponse?.purchased_code;

                Alert.alert(
                    'Insurance Purchase Successful!',
                    `Third-party motor insurance has been purchased for vehicle ${transactionData.Plate_Number}${certificateUrl ? '\n\nYour insurance certificate is ready for download.' : ''}`,
                    [
                        {
                            text: 'View Receipt',
                            onPress: () => {
                                router.push({
                                    pathname: '/bills/receipt',
                                    params: {
                                        transactionRef: result.data?.transactionRef || transactionData.request_id,
                                        type: 'insurance',
                                        network: 'Third-Party Motor Insurance',
                                        billersCode: transactionData.Plate_Number,
                                        amount: transactionData.amount.toString(),
                                        status: 'successful',
                                        serviceName: displayData?.planName || 'Motor Insurance',
                                        phone: transactionData.phone,
                                        certificateUrl: certificateUrl || '',
                                        insuredName: transactionData.Insured_Name,
                                        vehicleMake: transactionData?.vehicleData?.selectedMake?.name || 'Unknown',
                                        vehicleModel: transactionData?.vehicleData?.selectedModel?.name || 'Unknown',
                                        yearOfMake: transactionData.YearofMake,
                                    }
                                });
                            }
                        },
                        {
                            text: 'Done',
                            onPress: () => router.back(),
                            style: 'default'
                        }
                    ]
                );
            } else {
                const errorMessage = result.message || result.data?.vtpassResponse?.message || 'Transaction failed. Please try again.';

                Alert.alert(
                    'Insurance Purchase Failed',
                    errorMessage,
                    [
                        {
                            text: 'View Details',
                            onPress: () => {
                                router.push({
                                    pathname: '/bills/receipt',
                                    params: {
                                        transactionRef: result.data?.transactionRef || transactionData.request_id,
                                        type: 'insurance',
                                        network: 'Third-Party Motor Insurance',
                                        billersCode: transactionData.Plate_Number,
                                        amount: transactionData.amount.toString(),
                                        status: 'failed',
                                        errorMessage: errorMessage,
                                        serviceName: displayData?.planName || 'Motor Insurance',
                                        phone: transactionData.phone
                                    }
                                });
                            }
                        },
                        {
                            text: 'Try Again',
                            style: 'default'
                        }
                    ]
                );
            }
        } catch (error: any) {
            console.error('Insurance payment error:', error);

            let errorMessage = 'Something went wrong. Please try again.';

            if (error.data?.message) {
                errorMessage = error.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Payment Failed', errorMessage, [
                {
                    text: 'OK',
                    style: 'default'
                }
            ]);
        }
    };

    const renderPlanCard = (plan: typeof insurancePlans[0]) => (
        <TouchableOpacity
            key={plan.code}
            style={[
                styles.planCard,
                vehicleData.selectedPlan?.code === plan.code && styles.planCardSelected
            ]}
            onPress={() => setVehicleData(prev => ({ ...prev, selectedPlan: plan }))}
        >
            <View style={styles.planContent}>
                <View style={styles.planInfo}>
                    <Text style={[
                        styles.planName,
                        vehicleData.selectedPlan?.code === plan.code && styles.planNameSelected
                    ]}>
                        {plan.name}
                    </Text>
                    <Text style={styles.planPrice}>
                        {formatCurrency(plan.amount)}
                    </Text>
                </View>
                {vehicleData.selectedPlan?.code === plan.code && (
                    <MaterialIcons name="check-circle" size={24} color={COLORS.primary} />
                )}
            </View>
        </TouchableOpacity>
    );

    const renderDropdown = (
        title: string,
        value: InsuranceOption | null,
        options: InsuranceOption[],
        onSelect: (option: InsuranceOption) => void,
        loading: boolean = false,
        placeholder: string = 'Select...'
    ) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <TouchableOpacity
                style={[styles.inputContainer, !value && styles.inputContainerPlaceholder]}
                onPress={() => {
                    if (options.length === 0) {
                        Alert.alert('No Options', 'No options available for this selection.');
                        return;
                    }
                    openDropdownModal(title, options, onSelect, value);
                }}
                disabled={loading || options.length === 0}
            >
                <MaterialIcons
                    name="arrow-drop-down"
                    size={20}
                    color={COLORS.textTertiary}
                    style={styles.inputIcon}
                />
                <Text style={[
                    styles.dropdownText,
                    !value && styles.dropdownPlaceholder
                ]}>
                    {loading ? 'Loading...' : value?.name || placeholder}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const DropdownModal = () => (
        <Modal
            visible={showDropdownModal}
            transparent={true}
            animationType="slide"
            onRequestClose={closeDropdownModal}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.dropdownModalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{dropdownData?.title}</Text>
                        <TouchableOpacity
                            onPress={closeDropdownModal}
                            style={styles.modalCloseButton}
                        >
                            <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Search Input */}
                    {dropdownData && dropdownData.options.length > 10 && (
                        <View style={styles.searchContainer}>
                            <MaterialIcons name="search" size={20} color={COLORS.textTertiary} style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder={`Search ${dropdownData.title.toLowerCase()}...`}
                                placeholderTextColor={COLORS.textTertiary}
                                value={dropdownSearchText}
                                onChangeText={setDropdownSearchText}
                                autoCapitalize="none"
                            />
                        </View>
                    )}

                    <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
                        {filteredDropdownOptions.map((option) => (
                            <TouchableOpacity
                                key={option.code}
                                style={[
                                    styles.optionItem,
                                    dropdownData?.selectedValue?.code === option.code && styles.optionItemSelected
                                ]}
                                onPress={() => {
                                    dropdownData?.onSelect(option);
                                    closeDropdownModal();
                                }}
                            >
                                <Text style={[
                                    styles.optionText,
                                    dropdownData?.selectedValue?.code === option.code && styles.optionTextSelected
                                ]}>
                                    {option.name}
                                </Text>
                                {dropdownData?.selectedValue?.code === option.code && (
                                    <MaterialIcons name="check" size={20} color={COLORS.primary} />
                                )}
                            </TouchableOpacity>
                        ))}

                        {filteredDropdownOptions.length === 0 && dropdownSearchText && (
                            <View style={styles.noOptionsContainer}>
                                <Text style={styles.noOptionsText}>No options found</Text>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const SecurityModal = () => (
        <Modal
            visible={showSecurityModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowSecurityModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Confirm Insurance Purchase</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setShowSecurityModal(false);
                                setEnteredPin('');
                                setPinError('');
                            }}
                            style={styles.modalCloseButton}
                        >
                            <MaterialIcons name="close" size={24} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.transactionSummary}>
                        <Text style={styles.summaryText}>Third-Party Motor Insurance</Text>
                        <Text style={styles.summaryAmount}>
                            {pendingTransaction ? formatCurrency(pendingTransaction.amount) : ''}
                        </Text>
                        <Text style={styles.summaryPolicy}>
                            {pendingTransaction ? `Vehicle: ${pendingTransaction.Plate_Number || pendingTransaction.plateNumber}` : ''}
                        </Text>
                        <Text style={styles.summaryType}>
                            {pendingTransaction ? (pendingTransaction.planName || pendingTransaction.vehicleData?.selectedPlan?.name || 'Motor Insurance') : ''}
                        </Text>
                        <Text style={styles.summaryCustomer}>
                            {pendingTransaction ? (pendingTransaction.Insured_Name || pendingTransaction.formValues?.insuredName) : ''}
                        </Text>
                    </View>

                    <View style={styles.pinSection}>
                        <Text style={styles.pinLabel}>Enter Transaction PIN</Text>
                        <View style={styles.pinInputContainer}>
                            <TextInput
                                style={styles.pinInput}
                                value={enteredPin}
                                onChangeText={(text) => {
                                    setEnteredPin(text.replace(/[^0-9]/g, '').slice(0, 4));
                                    setPinError('');
                                }}
                                keyboardType="numeric"
                                maxLength={4}
                                secureTextEntry
                                placeholder="••••"
                                placeholderTextColor={COLORS.textTertiary}
                            />
                        </View>
                        {pinError ? (
                            <Text style={styles.pinError}>{pinError}</Text>
                        ) : null}
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setShowSecurityModal(false);
                                setEnteredPin('');
                                setPinError('');
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.confirmButton,
                                enteredPin.length !== 4 && styles.confirmButtonDisabled
                            ]}
                            onPress={async () => {
                                const verified = await verifyTransactionPin();
                                if (verified && pendingTransaction) {
                                    const { apiData, displayData } = separateTransactionData(pendingTransaction);
                                    if (apiData) {
                                        await processPayment(apiData, displayData);
                                    } else {
                                        Alert.alert('Error', 'Invalid transaction data. Please try again.');
                                    }
                                }
                            }}
                            disabled={enteredPin.length !== 4}
                        >
                            <Text style={styles.confirmButtonText}>Confirm</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <LinearGradient
                    colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                    style={styles.header}
                >
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <MaterialIcons name="arrow-back" size={24} color={COLORS.textInverse} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Third-Party Motor Insurance</Text>
                        <View style={styles.placeholder} />
                    </View>

                    {/* Balance Card */}
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>Wallet Balance</Text>
                        <Text style={styles.balanceAmount}>
                            {walletData ? formatCurrency(walletData?.data?.balance) : '₦0.00'}
                        </Text>
                    </View>
                </LinearGradient>

                {/* Main Content */}
                <Formik
                    initialValues={{
                        plateNumber: '',
                        insuredName: '',
                        chassisNumber: '',
                        yearOfMake: '',
                        phone: '',
                        email: ''
                    }}
                    validationSchema={ThirdPartyInsuranceSchema}
                    onSubmit={handlePayment}
                >
                    {(formik) => {
                        const { handleChange, handleBlur, handleSubmit, values, errors, touched } = formik;

                        return (
                            <>
                                {/* Insurance Plan Selection */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Select Insurance Plan</Text>
                                    <View style={styles.plansContainer}>
                                        {insurancePlans.map(renderPlanCard)}
                                    </View>
                                </View>

                                {/* Vehicle Owner Name */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Vehicle Owner Name</Text>
                                    <View style={[
                                        styles.inputContainer,
                                        touched.insuredName && errors.insuredName && styles.inputContainerError
                                    ]}>
                                        <MaterialIcons
                                            name="person"
                                            size={20}
                                            color={COLORS.textTertiary}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Enter vehicle owner's full name"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.insuredName}
                                            onChangeText={handleChange('insuredName')}
                                            onBlur={handleBlur('insuredName')}
                                            returnKeyType="next"
                                        />
                                    </View>
                                    {touched.insuredName && errors.insuredName && (
                                        <Text style={styles.errorText}>{errors.insuredName}</Text>
                                    )}
                                </View>

                                {/* Vehicle Plate Number */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Vehicle Plate Number</Text>
                                    <View style={[
                                        styles.inputContainer,
                                        touched.plateNumber && errors.plateNumber && styles.inputContainerError
                                    ]}>
                                        <MaterialIcons
                                            name="directions-car"
                                            size={20}
                                            color={COLORS.textTertiary}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="e.g., ABC123DE"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.plateNumber}
                                            onChangeText={(text) => handleChange('plateNumber')(text.toUpperCase())}
                                            onBlur={handleBlur('plateNumber')}
                                            returnKeyType="next"
                                            autoCapitalize="characters"
                                        />
                                    </View>
                                    {touched.plateNumber && errors.plateNumber && (
                                        <Text style={styles.errorText}>{errors.plateNumber}</Text>
                                    )}
                                </View>

                                {/* Vehicle Chassis Number */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Vehicle Chassis Number</Text>
                                    <View style={[
                                        styles.inputContainer,
                                        touched.chassisNumber && errors.chassisNumber && styles.inputContainerError
                                    ]}>
                                        <MaterialIcons
                                            name="settings"
                                            size={20}
                                            color={COLORS.textTertiary}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Enter vehicle chassis number"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.chassisNumber}
                                            onChangeText={(text) => handleChange('chassisNumber')(text.toUpperCase())}
                                            onBlur={handleBlur('chassisNumber')}
                                            returnKeyType="next"
                                            autoCapitalize="characters"
                                        />
                                    </View>
                                    {touched.chassisNumber && errors.chassisNumber && (
                                        <Text style={styles.errorText}>{errors.chassisNumber}</Text>
                                    )}
                                </View>

                                {/* Year of Manufacture */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Year of Manufacture</Text>
                                    <View style={[
                                        styles.inputContainer,
                                        touched.yearOfMake && errors.yearOfMake && styles.inputContainerError
                                    ]}>
                                        <MaterialIcons
                                            name="calendar-today"
                                            size={20}
                                            color={COLORS.textTertiary}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="e.g., 2020"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.yearOfMake}
                                            onChangeText={handleChange('yearOfMake')}
                                            onBlur={handleBlur('yearOfMake')}
                                            keyboardType="numeric"
                                            maxLength={4}
                                            returnKeyType="next"
                                        />
                                    </View>
                                    {touched.yearOfMake && errors.yearOfMake && (
                                        <Text style={styles.errorText}>{errors.yearOfMake}</Text>
                                    )}
                                </View>

                                {/* State Selection */}
                                {renderDropdown(
                                    'State',
                                    vehicleData.selectedState,
                                    states,
                                    handleStateSelect,
                                    loadingStates,
                                    'Select state'
                                )}

                                {/* LGA Selection */}
                                {vehicleData.selectedState && renderDropdown(
                                    'Local Government Area',
                                    vehicleData.selectedLGA,
                                    lgas,
                                    (lga) => setVehicleData(prev => ({ ...prev, selectedLGA: lga })),
                                    loadingLGAs,
                                    'Select LGA'
                                )}

                                {/* Vehicle Make Selection */}
                                {renderDropdown(
                                    'Vehicle Make',
                                    vehicleData.selectedMake,
                                    vehicleMakes,
                                    handleMakeSelect,
                                    loadingMakes,
                                    'Select vehicle make'
                                )}

                                {/* Vehicle Model Selection */}
                                {vehicleData.selectedMake && renderDropdown(
                                    'Vehicle Model',
                                    vehicleData.selectedModel,
                                    vehicleModels,
                                    (model) => setVehicleData(prev => ({ ...prev, selectedModel: model })),
                                    loadingModels,
                                    'Select vehicle model'
                                )}

                                {/* Vehicle Color Selection */}
                                {renderDropdown(
                                    'Vehicle Color',
                                    vehicleData.selectedColor,
                                    vehicleColors,
                                    (color) => setVehicleData(prev => ({ ...prev, selectedColor: color })),
                                    loadingColors,
                                    'Select vehicle color'
                                )}

                                {/* Engine Capacity Selection */}
                                {renderDropdown(
                                    'Engine Capacity',
                                    vehicleData.selectedEngineCapacity,
                                    engineCapacities,
                                    (capacity) => setVehicleData(prev => ({ ...prev, selectedEngineCapacity: capacity })),
                                    loadingEngineCapacities,
                                    'Select engine capacity'
                                )}

                                {/* Phone Number */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Phone Number</Text>
                                    <View style={[
                                        styles.inputContainer,
                                        touched.phone && errors.phone && styles.inputContainerError
                                    ]}>
                                        <MaterialIcons
                                            name="phone"
                                            size={20}
                                            color={COLORS.textTertiary}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="08012345678"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.phone}
                                            onChangeText={handleChange('phone')}
                                            onBlur={handleBlur('phone')}
                                            keyboardType="phone-pad"
                                            maxLength={11}
                                            returnKeyType="next"
                                        />
                                    </View>
                                    {touched.phone && errors.phone && (
                                        <Text style={styles.errorText}>{errors.phone}</Text>
                                    )}
                                </View>

                                {/* Email Address */}
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Email Address</Text>
                                    <View style={[
                                        styles.inputContainer,
                                        touched.email && errors.email && styles.inputContainerError
                                    ]}>
                                        <MaterialIcons
                                            name="email"
                                            size={20}
                                            color={COLORS.textTertiary}
                                            style={styles.inputIcon}
                                        />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="your.email@example.com"
                                            placeholderTextColor={COLORS.textTertiary}
                                            value={values.email}
                                            onChangeText={handleChange('email')}
                                            onBlur={handleBlur('email')}
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            returnKeyType="done"
                                        />
                                    </View>
                                    {touched.email && errors.email && (
                                        <Text style={styles.errorText}>{errors.email}</Text>
                                    )}
                                </View>

                                {/* Payment Summary */}
                                {vehicleData.selectedPlan && values.plateNumber && values.insuredName && (
                                    <View style={styles.summaryCard}>
                                        <Text style={styles.summaryTitle}>Insurance Summary</Text>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Plan Type:</Text>
                                            <Text style={styles.summaryValue}>{vehicleData.selectedPlan.name}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Vehicle Owner:</Text>
                                            <Text style={styles.summaryValue} numberOfLines={2}>{values.insuredName}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Plate Number:</Text>
                                            <Text style={styles.summaryValue}>{values.plateNumber}</Text>
                                        </View>
                                        {vehicleData.selectedMake && (
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Vehicle:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {vehicleData.selectedMake.name} {vehicleData.selectedModel?.name || ''}
                                                </Text>
                                            </View>
                                        )}
                                        {values.yearOfMake && (
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Year:</Text>
                                                <Text style={styles.summaryValue}>{values.yearOfMake}</Text>
                                            </View>
                                        )}
                                        {vehicleData.selectedState && (
                                            <View style={styles.summaryRow}>
                                                <Text style={styles.summaryLabel}>Location:</Text>
                                                <Text style={styles.summaryValue}>
                                                    {vehicleData.selectedLGA?.name || ''}, {vehicleData.selectedState.name}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={[styles.summaryRow, styles.summaryTotal]}>
                                            <Text style={styles.summaryTotalLabel}>Premium:</Text>
                                            <Text style={styles.summaryTotalValue}>
                                                {formatCurrency(vehicleData.selectedPlan.amount || 0)}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Info Card */}
                                <View style={styles.infoCard}>
                                    <MaterialIcons name="info" size={20} color={COLORS.info} />
                                    <View style={styles.infoContent}>
                                        <Text style={styles.infoTitle}>Third-Party Motor Insurance</Text>
                                        <Text style={styles.infoText}>
                                            This insurance covers damages to third parties in case of an accident.
                                            Your insurance certificate will be available for download after successful payment.
                                        </Text>
                                    </View>
                                </View>

                                {/* Sandbox Testing Info */}
                                <View style={styles.warningCard}>
                                    <MaterialIcons name="warning" size={20} color={COLORS.warning} />
                                    <View style={styles.infoContent}>
                                        <Text style={styles.warningTitle}>Sandbox Testing Notice</Text>
                                        <Text style={styles.warningText}>
                                            You're currently in sandbox mode. Vehicle verification may fail with test data.
                                            For successful testing, try using realistic vehicle information or contact VTPass support for test credentials.
                                        </Text>
                                    </View>
                                </View>

                                {/* Purchase Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.paymentButton,
                                        (!vehicleData.selectedPlan || !values.plateNumber || !values.insuredName ||
                                            !values.chassisNumber || !values.yearOfMake || !values.phone || !values.email ||
                                            !vehicleData.selectedState || !vehicleData.selectedLGA || !vehicleData.selectedMake ||
                                            !vehicleData.selectedModel || !vehicleData.selectedColor || !vehicleData.selectedEngineCapacity ||
                                            isLoading) && styles.paymentButtonDisabled
                                    ]}
                                    onPress={() => handleSubmit()}
                                    disabled={
                                        !vehicleData.selectedPlan || !values.plateNumber || !values.insuredName ||
                                        !values.chassisNumber || !values.yearOfMake || !values.phone || !values.email ||
                                        !vehicleData.selectedState || !vehicleData.selectedLGA || !vehicleData.selectedMake ||
                                        !vehicleData.selectedModel || !vehicleData.selectedColor || !vehicleData.selectedEngineCapacity ||
                                        isLoading
                                    }
                                >
                                    {isLoading ? (
                                        <View style={styles.loadingButtonContainer}>
                                            <ActivityIndicator size="small" color={COLORS.textInverse} />
                                            <Text style={styles.paymentButtonText}>Processing...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.paymentButtonText}>
                                            Purchase Insurance - {vehicleData.selectedPlan
                                            ? formatCurrency(vehicleData.selectedPlan.amount || 0)
                                            : '₦0'
                                        }
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            </>
                        );
                    }}
                </Formik>
            </ScrollView>
            <DropdownModal />
            <SecurityModal />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
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
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
        textAlign: 'center',
        flex: 1,
    },
    placeholder: {
        width: 32,
    },
    balanceCard: {
        backgroundColor: COLORS.withOpacity(COLORS.white, 0.15),
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.withOpacity(COLORS.textInverse, 0.8),
        marginBottom: SPACING.xs,
    },
    balanceAmount: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['2xl'],
        borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
        paddingTop: SPACING.sm,
    },
    section: {
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.xl,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    plansContainer: {
        gap: SPACING.base,
    },
    planCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    planCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    planContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    planInfo: {
        flex: 1,
    },
    planName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    planNameSelected: {
        color: COLORS.primary,
    },
    planPrice: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.xs,
        minHeight: 56,
    },
    inputContainerError: {
        borderColor: COLORS.error,
        backgroundColor: COLORS.withOpacity(COLORS.error, 0.05),
    },
    inputContainerPlaceholder: {
        backgroundColor: COLORS.backgroundSecondary,
    },
    inputIcon: {
        marginRight: SPACING.md,
    },
    textInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: 0,
        textAlignVertical: 'center',
    },
    dropdownText: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        paddingVertical: SPACING.sm,
    },
    dropdownPlaceholder: {
        color: COLORS.textTertiary,
    },
    errorText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.error,
        marginTop: SPACING.xs,
        marginLeft: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    summaryCard: {
        margin: SPACING.xl,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
    },
    summaryTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    summaryLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        flex: 1,
    },
    summaryValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        flex: 2,
        textAlign: 'right',
    },
    summaryTotal: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        marginTop: SPACING.sm,
    },
    summaryTotalLabel: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    summaryTotalValue: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
    },
    infoCard: {
        flexDirection: 'row',
        margin: SPACING.xl,
        backgroundColor: COLORS.info + '10',
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.info + '30',
    },
    infoContent: {
        flex: 1,
        marginLeft: SPACING.sm,
    },
    infoTitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.info,
        marginBottom: SPACING.xs,
    },
    infoText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.info,
        lineHeight: TYPOGRAPHY.fontSizes.xs * 1.4,
    },
    warningCard: {
        flexDirection: 'row',
        margin: SPACING.xl,
        backgroundColor: COLORS.warning + '10',
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        borderWidth: 1,
        borderColor: COLORS.warning + '30',
    },
    warningTitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.warning,
        marginBottom: SPACING.xs,
    },
    warningText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.warning,
        lineHeight: TYPOGRAPHY.fontSizes.xs * 1.4,
    },
    paymentButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: SPACING.xl,
        marginVertical: SPACING['2xl'],
        minHeight: 56,
        ...SHADOWS.colored(COLORS.primary),
    },
    paymentButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    paymentButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
    },
    loadingButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Dropdown Modal Styles
    dropdownModalContent: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.xl,
        padding: 0,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        ...SHADOWS.lg,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.xs,
        marginHorizontal: SPACING.xl,
        marginBottom: SPACING.base,
    },
    searchIcon: {
        marginRight: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: 0,
    },
    optionsContainer: {
        maxHeight: 400,
        paddingHorizontal: SPACING.xl,
        paddingBottom: SPACING.xl,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.base,
        paddingHorizontal: SPACING.base,
        borderRadius: RADIUS.base,
        marginBottom: SPACING.xs,
        backgroundColor: COLORS.backgroundSecondary,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    optionItemSelected: {
        backgroundColor: COLORS.primaryBackground,
        borderColor: COLORS.primary,
    },
    optionText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        flex: 1,
    },
    optionTextSelected: {
        color: COLORS.primary,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
    noOptionsContainer: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    noOptionsText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textTertiary,
        fontStyle: 'italic',
    },
    // Security Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.xl,
        padding: SPACING.xl,
        width: '100%',
        maxWidth: 400,
        ...SHADOWS.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
    },
    modalCloseButton: {
        padding: SPACING.xs,
    },
    transactionSummary: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.xl,
        alignItems: 'center',
    },
    summaryText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    summaryAmount: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
        marginBottom: SPACING.xs,
    },
    summaryPolicy: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    summaryType: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xs,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    summaryCustomer: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    pinSection: {
        marginBottom: SPACING.xl,
    },
    pinLabel: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
        textAlign: 'center',
    },
    pinInputContainer: {
        alignItems: 'center',
    },
    pinInput: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        borderColor: COLORS.border,
        paddingVertical: SPACING.base,
        paddingHorizontal: SPACING.xl,
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        textAlign: 'center',
        letterSpacing: 8,
        color: COLORS.textPrimary,
        width: 120,
    },
    pinError: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.error,
        textAlign: 'center',
        marginTop: SPACING.sm,
    },
    modalActions: {
        flexDirection: 'row',
        gap: SPACING.base,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
    },
    confirmButton: {
        flex: 1,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    confirmButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textInverse,
    },
});