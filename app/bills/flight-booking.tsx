// app/bills/flight-booking.tsx - Flight Booking Screen
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Alert,
    TextInput,
    Modal,
    FlatList,
    Platform,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    useSearchFlightsQuery,
    useSearchAirportsQuery,
    useBookFlightMutation,
    useGetWalletBalanceQuery,
} from '@/store/api/enhancedBillsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

interface FlightSearchParams {
    origin: string;
    destination: string;
    departureDate: Date;
    returnDate?: Date;
    adults: number;
    children: number;
    infants: number;
    travelClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
}

interface Passenger {
    type: 'adult' | 'child' | 'infant';
    title: 'Mr' | 'Mrs' | 'Ms' | 'Dr' | 'Prof';
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: 'male' | 'female';
    passportNumber?: string;
    nationality: string;
}

const FlightSearchSchema = Yup.object().shape({
    origin: Yup.string().length(3, 'Please select departure airport').required('Departure airport is required'),
    destination: Yup.string().length(3, 'Please select destination airport').required('Destination airport is required'),
    departureDate: Yup.date().min(new Date(), 'Departure date must be in the future').required('Departure date is required'),
    adults: Yup.number().min(1, 'At least 1 adult required').max(9, 'Maximum 9 adults').required(),
});

export default function FlightBookingScreen() {
    const router = useRouter();
    const [searchStep, setSearchStep] = useState<'search' | 'results' | 'passengers' | 'booking'>('search');
    const [searchParams, setSearchParams] = useState<FlightSearchParams>({
        origin: '',
        destination: '',
        departureDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        returnDate: undefined,
        adults: 1,
        children: 0,
        infants: 0,
        travelClass: 'ECONOMY',
    });
    const [selectedFlight, setSelectedFlight] = useState<any>(null);
    const [passengers, setPassengers] = useState<Passenger[]>([]);
    const [contactInfo, setContactInfo] = useState({
        email: '',
        phone: '',
    });

    // Modal states
    const [showDatePicker, setShowDatePicker] = useState<'departure' | 'return' | null>(null);
    const [showAirportSearch, setShowAirportSearch] = useState<'origin' | 'destination' | null>(null);
    const [showPassengerCount, setShowPassengerCount] = useState(false);
    const [showTravelClass, setShowTravelClass] = useState(false);
    const [airportSearchKeyword, setAirportSearchKeyword] = useState('');

    // API queries
    const { data: walletData } = useGetWalletBalanceQuery();
    const { data: flightsData, isLoading: flightsLoading } = useSearchFlightsQuery(
        {
            origin: searchParams.origin,
            destination: searchParams.destination,
            departureDate: searchParams.departureDate.toISOString().split('T')[0],
            returnDate: searchParams.returnDate?.toISOString().split('T')[0],
            adults: searchParams.adults,
            children: searchParams.children,
            infants: searchParams.infants,
            travelClass: searchParams.travelClass,
        },
        {
            skip: searchStep !== 'results' || !searchParams.origin || !searchParams.destination,
        }
    );
    const { data: airportsData, isLoading: airportsLoading } = useSearchAirportsQuery(
        airportSearchKeyword,
        { skip: !showAirportSearch || airportSearchKeyword.length < 2 }
    );
    const [bookFlight, { isLoading: bookingLoading }] = useBookFlightMutation();

    const travelClasses = [
        { id: 'ECONOMY', name: 'Economy', icon: '💺' },
        { id: 'PREMIUM_ECONOMY', name: 'Premium Economy', icon: '🛋️' },
        { id: 'BUSINESS', name: 'Business', icon: '✈️' },
        { id: 'FIRST', name: 'First Class', icon: '👑' },
    ];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-NG', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    };

    const swapAirports = () => {
        setSearchParams(prev => ({
            ...prev,
            origin: prev.destination,
            destination: prev.origin,
        }));
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(null);
        }

        if (selectedDate) {
            if (showDatePicker === 'departure') {
                setSearchParams(prev => ({ ...prev, departureDate: selectedDate }));
            } else if (showDatePicker === 'return') {
                setSearchParams(prev => ({ ...prev, returnDate: selectedDate }));
            }
        }
    };

    const selectAirport = (airport: any) => {
        if (showAirportSearch === 'origin') {
            setSearchParams(prev => ({ ...prev, origin: airport.iataCode }));
        } else if (showAirportSearch === 'destination') {
            setSearchParams(prev => ({ ...prev, destination: airport.iataCode }));
        }
        setShowAirportSearch(null);
        setAirportSearchKeyword('');
    };

    const updatePassengerCount = (type: 'adults' | 'children' | 'infants', change: number) => {
        setSearchParams(prev => ({
            ...prev,
            [type]: Math.max(0, Math.min(9, prev[type] + change)),
        }));
    };

    const searchFlights = () => {
        if (!searchParams.origin || !searchParams.destination) {
            Alert.alert('Error', 'Please select both departure and destination airports');
            return;
        }
        setSearchStep('results');
    };

    const selectFlight = (flight: any) => {
        setSelectedFlight(flight);

        // Initialize passengers based on search params
        const initialPassengers: Passenger[] = [];
        for (let i = 0; i < searchParams.adults; i++) {
            initialPassengers.push({
                type: 'adult',
                title: 'Mr',
                firstName: '',
                lastName: '',
                dateOfBirth: new Date(1990, 0, 1),
                gender: 'male',
                nationality: 'NG',
            });
        }
        for (let i = 0; i < searchParams.children; i++) {
            initialPassengers.push({
                type: 'child',
                title: 'Master',
                firstName: '',
                lastName: '',
                dateOfBirth: new Date(2015, 0, 1),
                gender: 'male',
                nationality: 'NG',
            });
        }
        for (let i = 0; i < searchParams.infants; i++) {
            initialPassengers.push({
                type: 'infant',
                title: 'Master',
                firstName: '',
                lastName: '',
                dateOfBirth: new Date(2023, 0, 1),
                gender: 'male',
                nationality: 'NG',
            });
        }

        setPassengers(initialPassengers);
        setSearchStep('passengers');
    };

    const handleBookFlight = async () => {
        if (!selectedFlight) return;

        // Validate passenger info
        const incompletePassenger = passengers.find(p => !p.firstName || !p.lastName);
        if (incompletePassenger) {
            Alert.alert('Error', 'Please fill in all passenger details');
            return;
        }

        if (!contactInfo.email || !contactInfo.phone) {
            Alert.alert('Error', 'Please provide contact information');
            return;
        }

        const totalAmount = selectedFlight.price.total;
        if (walletData && totalAmount > walletData.data.balance) {
            const shortfall = totalAmount - walletData.data.balance;
            Alert.alert(
                'Insufficient Balance',
                `You need ${formatCurrency(shortfall)} more to book this flight.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Fund Wallet',
                        onPress: () => router.push('/(tabs)/wallet'),
                    }
                ]
            );
            return;
        }

        try {
            const bookingData = {
                flightOffer: selectedFlight,
                passengers,
                contactInfo,
                paymentMethod: 'wallet' as const,
            };

            const result = await bookFlight(bookingData).unwrap();

            Alert.alert(
                'Flight Booked Successfully!',
                `Your flight has been booked. Booking reference: ${result.data.bookingReference}`,
                [
                    {
                        text: 'View Receipt',
                        onPress: () => {
                            router.push({
                                pathname: '/bills/receipt',
                                params: {
                                    transactionRef: result.data.transactionRef,
                                    type: 'flight_booking',
                                    amount: totalAmount.toString(),
                                    status: 'successful',
                                }
                            });
                        }
                    }
                ]
            );
        } catch (error: any) {
            console.error('Error booking flight:', error);
            Alert.alert('Booking Failed', error.data?.message || 'Something went wrong. Please try again.');
        }
    };

    const renderSearchForm = () => (
        <Formik
            initialValues={searchParams}
            validationSchema={FlightSearchSchema}
            onSubmit={searchFlights}
        >
            {({ values, errors, touched, handleSubmit }) => (
                <View style={styles.formContainer}>
                    {/* Airport Selection */}
                    <View style={styles.airportsRow}>
                        <TouchableOpacity
                            style={[styles.airportInput, !values.origin && styles.airportInputEmpty]}
                            onPress={() => setShowAirportSearch('origin')}
                        >
                            <MaterialIcons name="flight-takeoff" size={20} color={COLORS.textTertiary} />
                            <View style={styles.airportDetails}>
                                <Text style={styles.airportLabel}>From</Text>
                                <Text style={styles.airportCode}>
                                    {values.origin || 'Select departure'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.swapButton} onPress={swapAirports}>
                            <MaterialIcons name="swap-horiz" size={24} color={COLORS.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.airportInput, !values.destination && styles.airportInputEmpty]}
                            onPress={() => setShowAirportSearch('destination')}
                        >
                            <MaterialIcons name="flight-land" size={20} color={COLORS.textTertiary} />
                            <View style={styles.airportDetails}>
                                <Text style={styles.airportLabel}>To</Text>
                                <Text style={styles.airportCode}>
                                    {values.destination || 'Select destination'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {touched.origin && errors.origin && (
                        <Text style={styles.errorText}>{errors.origin}</Text>
                    )}
                    {touched.destination && errors.destination && (
                        <Text style={styles.errorText}>{errors.destination}</Text>
                    )}

                    {/* Date Selection */}
                    <View style={styles.datesRow}>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowDatePicker('departure')}
                        >
                            <MaterialIcons name="date-range" size={20} color={COLORS.textTertiary} />
                            <View style={styles.dateDetails}>
                                <Text style={styles.dateLabel}>Departure</Text>
                                <Text style={styles.dateValue}>{formatDate(values.departureDate)}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowDatePicker('return')}
                        >
                            <MaterialIcons name="date-range" size={20} color={COLORS.textTertiary} />
                            <View style={styles.dateDetails}>
                                <Text style={styles.dateLabel}>Return</Text>
                                <Text style={styles.dateValue}>
                                    {values.returnDate ? formatDate(values.returnDate) : 'Optional'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Passengers and Class */}
                    <View style={styles.passengersClassRow}>
                        <TouchableOpacity
                            style={styles.passengersInput}
                            onPress={() => setShowPassengerCount(true)}
                        >
                            <MaterialIcons name="person" size={20} color={COLORS.textTertiary} />
                            <View style={styles.passengersDetails}>
                                <Text style={styles.passengersLabel}>Passengers</Text>
                                <Text style={styles.passengersValue}>
                                    {values.adults + values.children + values.infants} passenger{values.adults + values.children + values.infants !== 1 ? 's' : ''}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.classInput}
                            onPress={() => setShowTravelClass(true)}
                        >
                            <MaterialIcons name="airline-seat-recline-normal" size={20} color={COLORS.textTertiary} />
                            <View style={styles.classDetails}>
                                <Text style={styles.classLabel}>Class</Text>
                                <Text style={styles.classValue}>
                                    {travelClasses.find(c => c.id === values.travelClass)?.name}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Search Button */}
                    <TouchableOpacity style={styles.searchButton} onPress={() => handleSubmit()}>
                        <MaterialIcons name="search" size={24} color={COLORS.textInverse} />
                        <Text style={styles.searchButtonText}>Search Flights</Text>
                    </TouchableOpacity>
                </View>
            )}
        </Formik>
    );

    const renderFlightResults = () => (
        <ScrollView style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setSearchStep('search')}
                >
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.resultsTitle}>
                    {searchParams.origin} → {searchParams.destination}
                </Text>
                <View style={styles.placeholder} />
            </View>

            {flightsLoading ? (
                <View style={styles.loadingContainer}>
                    <Text>Searching flights...</Text>
                </View>
            ) : (
                flightsData?.data.map((flight: any, index: number) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.flightCard}
                        onPress={() => selectFlight(flight)}
                    >
                        <View style={styles.flightHeader}>
                            <Text style={styles.airline}>{flight.validatingAirlineCodes[0]}</Text>
                            <Text style={styles.flightPrice}>{formatCurrency(flight.price.total)}</Text>
                        </View>

                        <View style={styles.flightDetails}>
                            <View style={styles.flightTime}>
                                <Text style={styles.timeText}>{flight.itineraries[0].segments[0].departure.at.slice(11, 16)}</Text>
                                <Text style={styles.airportText}>{flight.itineraries[0].segments[0].departure.iataCode}</Text>
                            </View>

                            <View style={styles.flightPath}>
                                <Text style={styles.durationText}>
                                    {formatDuration(flight.itineraries[0].duration)}
                                </Text>
                                <View style={styles.pathLine} />
                                <Text style={styles.stopsText}>
                                    {flight.itineraries[0].segments.length - 1} stop{flight.itineraries[0].segments.length - 1 !== 1 ? 's' : ''}
                                </Text>
                            </View>

                            <View style={styles.flightTime}>
                                <Text style={styles.timeText}>
                                    {flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.at.slice(11, 16)}
                                </Text>
                                <Text style={styles.airportText}>
                                    {flight.itineraries[0].segments[flight.itineraries[0].segments.length - 1].arrival.iataCode}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </ScrollView>
    );

    const renderPassengerForm = () => (
        <ScrollView style={styles.passengerFormContainer}>
            <View style={styles.passengerFormHeader}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setSearchStep('results')}
                >
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.passengerFormTitle}>Passenger Details</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Contact Information */}
            <View style={styles.contactSection}>
                <Text style={styles.contactTitle}>Contact Information</Text>
                <View style={styles.contactInputs}>
                    <TextInput
                        style={styles.contactInput}
                        placeholder="Email address"
                        value={contactInfo.email}
                        onChangeText={(text) => setContactInfo(prev => ({ ...prev, email: text }))}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <TextInput
                        style={styles.contactInput}
                        placeholder="Phone number"
                        value={contactInfo.phone}
                        onChangeText={(text) => setContactInfo(prev => ({ ...prev, phone: text }))}
                        keyboardType="phone-pad"
                    />
                </View>
            </View>

            {/* Passengers */}
            <View style={styles.passengersSection}>
                {passengers.map((passenger, index) => (
                    <View key={index} style={styles.passengerCard}>
                        <Text style={styles.passengerCardTitle}>
                            {passenger.type.charAt(0).toUpperCase() + passenger.type.slice(1)} {index + 1}
                        </Text>

                        <View style={styles.passengerInputs}>
                            {/* Title and Gender */}
                            <View style={styles.titleGenderRow}>
                                <View style={styles.titleContainer}>
                                    <Text style={styles.inputLabel}>Title</Text>
                                    <View style={styles.titleButtons}>
                                        {['Mr', 'Mrs', 'Ms', 'Dr'].map(title => (
                                            <TouchableOpacity
                                                key={title}
                                                style={[
                                                    styles.titleButton,
                                                    passenger.title === title && styles.titleButtonSelected
                                                ]}
                                                onPress={() => {
                                                    const updatedPassengers = [...passengers];
                                                    updatedPassengers[index].title = title as any;
                                                    setPassengers(updatedPassengers);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.titleButtonText,
                                                    passenger.title === title && styles.titleButtonTextSelected
                                                ]}>
                                                    {title}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.genderContainer}>
                                    <Text style={styles.inputLabel}>Gender</Text>
                                    <View style={styles.genderButtons}>
                                        {['male', 'female'].map(gender => (
                                            <TouchableOpacity
                                                key={gender}
                                                style={[
                                                    styles.genderButton,
                                                    passenger.gender === gender && styles.genderButtonSelected
                                                ]}
                                                onPress={() => {
                                                    const updatedPassengers = [...passengers];
                                                    updatedPassengers[index].gender = gender as any;
                                                    setPassengers(updatedPassengers);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.genderButtonText,
                                                    passenger.gender === gender && styles.genderButtonTextSelected
                                                ]}>
                                                    {gender.charAt(0).toUpperCase() + gender.slice(1)}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            {/* Name */}
                            <View style={styles.nameRow}>
                                <TextInput
                                    style={[styles.nameInput, styles.firstNameInput]}
                                    placeholder="First name"
                                    value={passenger.firstName}
                                    onChangeText={(text) => {
                                        const updatedPassengers = [...passengers];
                                        updatedPassengers[index].firstName = text;
                                        setPassengers(updatedPassengers);
                                    }}
                                />
                                <TextInput
                                    style={[styles.nameInput, styles.lastNameInput]}
                                    placeholder="Last name"
                                    value={passenger.lastName}
                                    onChangeText={(text) => {
                                        const updatedPassengers = [...passengers];
                                        updatedPassengers[index].lastName = text;
                                        setPassengers(updatedPassengers);
                                    }}
                                />
                            </View>

                            {/* Date of Birth */}
                            <TouchableOpacity style={styles.dateOfBirthInput}>
                                <MaterialIcons name="cake" size={20} color={COLORS.textTertiary} />
                                <Text style={styles.dateOfBirthText}>
                                    {passenger.dateOfBirth.toLocaleDateString()}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>

            {/* Book Flight Button */}
            <TouchableOpacity
                style={[
                    styles.bookFlightButton,
                    bookingLoading && styles.bookFlightButtonDisabled
                ]}
                onPress={handleBookFlight}
                disabled={bookingLoading}
            >
                <MaterialIcons name="flight" size={24} color={COLORS.textInverse} />
                <Text style={styles.bookFlightButtonText}>
                    {bookingLoading ? 'Booking...' : `Book Flight - ${selectedFlight ? formatCurrency(selectedFlight.price.total) : ''}`}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );

    // Modals
    const AirportSearchModal = () => (
        <Modal
            visible={showAirportSearch !== null}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowAirportSearch(null)}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                        Select {showAirportSearch === 'origin' ? 'Departure' : 'Destination'} Airport
                    </Text>
                    <TouchableOpacity
                        onPress={() => setShowAirportSearch(null)}
                        style={styles.modalCloseButton}
                    >
                        <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchInputContainer}>
                    <MaterialIcons name="search" size={20} color={COLORS.textTertiary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search airports..."
                        value={airportSearchKeyword}
                        onChangeText={setAirportSearchKeyword}
                        autoFocus
                    />
                </View>

                <FlatList
                    data={airportsData?.data || []}
                    keyExtractor={(item) => item.iataCode}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.airportItem}
                            onPress={() => selectAirport(item)}
                        >
                            <View style={styles.airportItemDetails}>
                                <Text style={styles.airportItemCode}>{item.iataCode}</Text>
                                <Text style={styles.airportItemName}>{item.name}</Text>
                                <Text style={styles.airportItemCity}>{item.city}, {item.country}</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </SafeAreaView>
        </Modal>
    );

    const PassengerCountModal = () => (
        <Modal
            visible={showPassengerCount}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={() => setShowPassengerCount(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.passengerCountModal}>
                    <View style={styles.passengerCountContainer}>
                        <Text style={styles.modalTitle}>Passengers</Text>

                        {[
                            { key: 'adults', label: 'Adults', sublabel: '12+ years' },
                            { key: 'children', label: 'Children', sublabel: '2-11 years' },
                            { key: 'infants', label: 'Infants', sublabel: 'Under 2 years' },
                        ].map(({ key, label, sublabel }) => (
                            <View key={key} style={styles.passengerCountRow}>
                                <View style={styles.passengerCountInfo}>
                                    <Text style={styles.passengerCountLabel}>{label}</Text>
                                    <Text style={styles.passengerCountSubLabel}>{sublabel}</Text>
                                </View>
                                <View style={styles.passengerCountControls}>
                                    <TouchableOpacity
                                        style={styles.countButton}
                                        onPress={() => updatePassengerCount(key as any, -1)}
                                    >
                                        <MaterialIcons name="remove" size={16} color={COLORS.textPrimary} />
                                    </TouchableOpacity>
                                    <Text style={styles.countText}>
                                        {searchParams[key as keyof typeof searchParams] as number}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.countButton}
                                        onPress={() => updatePassengerCount(key as any, 1)}
                                    >
                                        <MaterialIcons name="add" size={16} color={COLORS.textPrimary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity
                            style={styles.doneButton}
                            onPress={() => setShowPassengerCount(false)}
                        >
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const TravelClassModal = () => (
        <Modal
            visible={showTravelClass}
            animationType="slide"
            presentationStyle="formSheet"
            onRequestClose={() => setShowTravelClass(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.travelClassModal}>
                    <View style={styles.travelClassContainer}>
                        <Text style={styles.modalTitle}>Travel Class</Text>

                        {travelClasses.map(travelClass => (
                            <TouchableOpacity
                                key={travelClass.id}
                                style={[
                                    styles.travelClassOption,
                                    searchParams.travelClass === travelClass.id && styles.travelClassOptionSelected
                                ]}
                                onPress={() => {
                                    setSearchParams(prev => ({ ...prev, travelClass: travelClass.id as any }));
                                    setShowTravelClass(false);
                                }}
                            >
                                <Text style={styles.travelClassIcon}>{travelClass.icon}</Text>
                                <Text style={styles.travelClassName}>{travelClass.name}</Text>
                                {searchParams.travelClass === travelClass.id && (
                                    <MaterialIcons name="check" size={20} color={COLORS.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <MaterialIcons name="arrow-back" size={24} color={COLORS.textInverse} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Book Flight</Text>
                    <View style={styles.placeholder} />
                </View>

                {walletData && (
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>Wallet Balance</Text>
                        <Text style={styles.balanceAmount}>
                            {formatCurrency(walletData.data.balance)}
                        </Text>
                    </View>
                )}
            </LinearGradient>

            <View style={styles.contentContainer}>
                {searchStep === 'search' && renderSearchForm()}
                {searchStep === 'results' && renderFlightResults()}
                {searchStep === 'passengers' && renderPassengerForm()}
            </View>

            {/* Date Picker */}
            {showDatePicker && Platform.OS === 'ios' && (
                <Modal
                    visible={true}
                    animationType="slide"
                    presentationStyle="formSheet"
                    onRequestClose={() => setShowDatePicker(null)}
                >
                    <View style={styles.datePickerModal}>
                        <View style={styles.datePickerHeader}>
                            <TouchableOpacity onPress={() => setShowDatePicker(null)}>
                                <Text style={styles.datePickerCancel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowDatePicker(null)}>
                                <Text style={styles.datePickerDone}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={showDatePicker === 'departure' ? searchParams.departureDate : (searchParams.returnDate || new Date())}
                            mode="date"
                            display="spinner"
                            onChange={onDateChange}
                            minimumDate={new Date()}
                        />
                    </View>
                </Modal>
            )}

            {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                    value={showDatePicker === 'departure' ? searchParams.departureDate : (searchParams.returnDate || new Date())}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                />
            )}

            {/* Modals */}
            <AirportSearchModal />
            <PassengerCountModal />
            <TravelClassModal />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingTop: SPACING.xl,
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
    contentContainer: {
        backgroundColor: COLORS.background,
        marginTop: -SPACING.base,
        paddingTop: SPACING.sm,
        flex: 1,
    },
    formContainer: {
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.xl,
    },
    airportsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.base,
    },
    airportInput: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
    },
    airportInputEmpty: {
        borderColor: COLORS.error,
    },
    airportDetails: {
        marginLeft: SPACING.sm,
        flex: 1,
    },
    airportLabel: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginBottom: 2,
    },
    airportCode: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    swapButton: {
        marginHorizontal: SPACING.sm,
        padding: SPACING.sm,
    },
    datesRow: {
        flexDirection: 'row',
        gap: SPACING.base,
        marginBottom: SPACING.base,
    },
    dateInput: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateDetails: {
        marginLeft: SPACING.sm,
        flex: 1,
    },
    dateLabel: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginBottom: 2,
    },
    dateValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    passengersClassRow: {
        flexDirection: 'row',
        gap: SPACING.base,
        marginBottom: SPACING.xl,
    },
    passengersInput: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
    },
    passengersDetails: {
        marginLeft: SPACING.sm,
        flex: 1,
    },
    passengersLabel: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginBottom: 2,
    },
    passengersValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    classInput: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
    },
    classDetails: {
        marginLeft: SPACING.sm,
        flex: 1,
    },
    classLabel: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginBottom: 2,
    },
    classValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    searchButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.colored(COLORS.primary),
    },
    searchButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
    },
    errorText: {
        color: COLORS.error,
        fontSize: TYPOGRAPHY.fontSizes.sm,
        marginTop: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    resultsContainer: {
        flex: 1,
    },
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.base,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    resultsTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    flightCard: {
        backgroundColor: COLORS.backgroundSecondary,
        marginHorizontal: SPACING.xl,
        marginVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        ...SHADOWS.sm,
    },
    flightHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.base,
    },
    airline: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
    },
    flightPrice: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
    },
    flightDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    flightTime: {
        alignItems: 'center',
    },
    timeText: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    airportText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    flightPath: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: SPACING.base,
    },
    durationText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    pathLine: {
        height: 1,
        backgroundColor: COLORS.border,
        width: '100%',
        marginVertical: 4,
    },
    stopsText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        marginTop: 4,
    },
    passengerFormContainer: {
        flex: 1,
    },
    passengerFormHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.base,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    passengerFormTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    contactSection: {
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.xl,
    },
    contactTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    contactInputs: {
        gap: SPACING.base,
    },
    contactInput: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
    },
    passengersSection: {
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    passengerCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.base,
    },
    passengerCardTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    passengerInputs: {
        gap: SPACING.base,
    },
    titleGenderRow: {
        flexDirection: 'row',
        gap: SPACING.base,
    },
    titleContainer: {
        flex: 1,
    },
    inputLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    titleButtons: {
        flexDirection: 'row',
        gap: SPACING.xs,
    },
    titleButton: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.base,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    titleButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    titleButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
    },
    titleButtonTextSelected: {
        color: COLORS.textInverse,
    },
    genderContainer: {
        flex: 1,
    },
    genderButtons: {
        flexDirection: 'row',
        gap: SPACING.xs,
    },
    genderButton: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.base,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    genderButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    genderButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
    },
    genderButtonTextSelected: {
        color: COLORS.textInverse,
    },
    nameRow: {
        flexDirection: 'row',
        gap: SPACING.base,
    },
    nameInput: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
    },
    firstNameInput: {
        flex: 1,
    },
    lastNameInput: {
        flex: 1,
    },
    dateOfBirthInput: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateOfBirthText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        marginLeft: SPACING.sm,
    },
    bookFlightButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: SPACING.xl,
        marginVertical: SPACING.xl,
        minHeight: 56,
        flexDirection: 'row',
        ...SHADOWS.colored(COLORS.primary),
    },
    bookFlightButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    bookFlightButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.xl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    modalTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
    },
    modalCloseButton: {
        padding: SPACING.xs,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        margin: SPACING.xl,
        paddingHorizontal: SPACING.base,
    },
    searchInput: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        paddingVertical: SPACING.base,
        marginLeft: SPACING.sm,
    },
    airportItem: {
        padding: SPACING.base,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    airportItemDetails: {
        paddingHorizontal: SPACING.base,
    },
    airportItemCode: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
    },
    airportItemName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        marginTop: SPACING.xs,
    },
    airportItemCity: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    passengerCountModal: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        paddingBottom: SPACING.xl,
    },
    passengerCountContainer: {
        padding: SPACING.xl,
    },
    passengerCountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.base,
    },
    passengerCountInfo: {
        flex: 1,
    },
    passengerCountLabel: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    passengerCountSubLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
    },
    passengerCountControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.base,
    },
    countButton: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.base,
        backgroundColor: COLORS.backgroundSecondary,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    countText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
        minWidth: 30,
        textAlign: 'center',
    },
    doneButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        marginHorizontal: SPACING.xl,
    },
    doneButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
    travelClassModal: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        paddingBottom: SPACING.xl,
    },
    travelClassContainer: {
        padding: SPACING.xl,
    },
    travelClassOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.base,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.sm,
        backgroundColor: COLORS.backgroundSecondary,
    },
    travelClassOptionSelected: {
        backgroundColor: COLORS.primaryBackground,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    travelClassIcon: {
        fontSize: 24,
        marginRight: SPACING.base,
    },
    travelClassName: {
        flex: 1,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    datePickerModal: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: SPACING.xl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    datePickerCancel: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
    },
    datePickerDone: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.primary,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
    },
});