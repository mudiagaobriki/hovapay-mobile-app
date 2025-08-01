// app/bills/sports-betting.tsx - Sports Betting Screen
import React, { useState, useEffect } from 'react';
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
    TextInput,
    Modal,
    FlatList,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import {
    useGetSportsQuery,
    useGetLeaguesQuery,
    useGetMatchesQuery,
    usePlaceBetMutation,
    useGetWalletBalanceQuery,
} from '@/store/api/enhancedBillsApi';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

interface BetSelection {
    matchId: string;
    homeTeam: string;
    awayTeam: string;
    market: string;
    selection: string;
    odds: number;
    kickoffTime?: string;
}

interface BetSlip {
    selections: BetSelection[];
    betType: 'single' | 'accumulator';
    stake: number;
    potentialWinnings: number;
    totalOdds: number;
}

const BetSchema = Yup.object().shape({
    stake: Yup.number()
        .min(50, 'Minimum stake is ₦50')
        .max(1000000, 'Maximum stake is ₦1,000,000')
        .required('Stake is required'),
});

const quickStakes = [100, 500, 1000, 2000, 5000, 10000];

export default function SportsBettingScreen() {
    const router = useRouter();
    const [selectedSport, setSelectedSport] = useState<string>('');
    const [selectedLeague, setSelectedLeague] = useState<string>('');
    const [betSlip, setBetSlip] = useState<BetSlip>({
        selections: [],
        betType: 'single',
        stake: 0,
        potentialWinnings: 0,
        totalOdds: 1,
    });
    const [showBetSlip, setShowBetSlip] = useState(false);
    const [selectedBookmaker, setSelectedBookmaker] = useState<string>('bet9ja');

    // API queries
    const { data: sportsData, isLoading: sportsLoading } = useGetSportsQuery();
    const { data: leaguesData, isLoading: leaguesLoading } = useGetLeaguesQuery(selectedSport, {
        skip: !selectedSport,
    });
    const { data: matchesData, isLoading: matchesLoading } = useGetMatchesQuery(
        { sportId: selectedSport, leagueId: selectedLeague },
        { skip: !selectedSport }
    );
    const { data: walletData } = useGetWalletBalanceQuery();
    const [placeBet, { isLoading: placingBet }] = usePlaceBetMutation();

    const sports = sportsData?.data || [];
    const leagues = leaguesData?.data || [];
    const matches = matchesData?.data || [];

    const bookmakers = [
        { id: 'bet9ja', name: 'Bet9ja', logo: '🥇' },
        { id: 'sportybet', name: 'SportyBet', logo: '⚽' },
        { id: 'nairabet', name: 'NairaBet', logo: '🎯' },
        { id: 'betway', name: 'Betway', logo: '🏆' },
    ];

    useEffect(() => {
        calculatePotentialWinnings();
    }, [betSlip.selections, betSlip.stake, betSlip.betType]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-NG', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const addToBetSlip = (match: any, market: any, selection: any) => {
        const newSelection: BetSelection = {
            matchId: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            market: market.name,
            selection: selection.name,
            odds: selection.odds,
            kickoffTime: match.kickoffTime,
        };

        // Check if selection already exists
        const existingIndex = betSlip.selections.findIndex(
            (s) => s.matchId === newSelection.matchId && s.market === newSelection.market
        );

        let updatedSelections = [...betSlip.selections];
        if (existingIndex >= 0) {
            // Replace existing selection
            updatedSelections[existingIndex] = newSelection;
        } else {
            // Add new selection
            updatedSelections.push(newSelection);
        }

        // If more than one selection, switch to accumulator
        const newBetType = updatedSelections.length > 1 ? 'accumulator' : 'single';

        setBetSlip({
            ...betSlip,
            selections: updatedSelections,
            betType: newBetType,
        });

        Alert.alert('Added to Bet Slip', `${selection.name} added successfully`);
    };

    const removeFromBetSlip = (matchId: string, market: string) => {
        const updatedSelections = betSlip.selections.filter(
            (s) => !(s.matchId === matchId && s.market === market)
        );

        const newBetType = updatedSelections.length > 1 ? 'accumulator' : 'single';

        setBetSlip({
            ...betSlip,
            selections: updatedSelections,
            betType: newBetType,
        });
    };

    const calculatePotentialWinnings = () => {
        if (betSlip.selections.length === 0 || betSlip.stake === 0) {
            setBetSlip(prev => ({ ...prev, potentialWinnings: 0, totalOdds: 1 }));
            return;
        }

        let totalOdds = 1;
        betSlip.selections.forEach(selection => {
            totalOdds *= selection.odds;
        });

        const potentialWinnings = betSlip.stake * totalOdds;

        setBetSlip(prev => ({
            ...prev,
            potentialWinnings,
            totalOdds,
        }));
    };

    const handlePlaceBet = async () => {
        if (betSlip.selections.length === 0) {
            Alert.alert('Error', 'Please add at least one selection to your bet slip');
            return;
        }

        if (betSlip.stake < 50) {
            Alert.alert('Error', 'Minimum stake is ₦50');
            return;
        }

        if (walletData && betSlip.stake > walletData.data.balance) {
            const shortfall = betSlip.stake - walletData.data.balance;
            Alert.alert(
                'Insufficient Balance',
                `You need ${formatCurrency(shortfall)} more to place this bet.`,
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
            const betData = {
                betType: betSlip.betType,
                sport: selectedSport,
                league: selectedLeague,
                matches: betSlip.selections,
                stake: betSlip.stake,
                potentialWinnings: betSlip.potentialWinnings,
                totalOdds: betSlip.totalOdds,
                bookmaker: selectedBookmaker as any,
                paymentMethod: 'wallet' as const,
            };

            const result = await placeBet(betData).unwrap();

            Alert.alert(
                'Bet Placed Successfully!',
                `Your bet has been placed with ${selectedBookmaker}. Bet slip: ${result.data.betSlip}`,
                [
                    {
                        text: 'View Receipt',
                        onPress: () => {
                            router.push({
                                pathname: '/bills/receipt',
                                params: {
                                    transactionRef: result.data.transactionRef,
                                    type: 'sports_betting',
                                    amount: betSlip.stake.toString(),
                                    status: 'successful',
                                }
                            });
                        }
                    },
                    {
                        text: 'Place Another Bet',
                        onPress: () => {
                            setBetSlip({
                                selections: [],
                                betType: 'single',
                                stake: 0,
                                potentialWinnings: 0,
                                totalOdds: 1,
                            });
                            setShowBetSlip(false);
                        }
                    }
                ]
            );
        } catch (error: any) {
            console.error('Error placing bet:', error);
            Alert.alert('Bet Failed', error.data?.message || 'Something went wrong. Please try again.');
        }
    };

    const renderSport = (sport: any) => (
        <TouchableOpacity
            key={sport.id}
            style={[
                styles.sportCard,
                selectedSport === sport.id && styles.sportCardSelected
            ]}
            onPress={() => {
                setSelectedSport(sport.id);
                setSelectedLeague('');
            }}
        >
            <Text style={styles.sportIcon}>{sport.icon || '⚽'}</Text>
            <Text style={[
                styles.sportName,
                selectedSport === sport.id && styles.sportNameSelected
            ]}>
                {sport.name}
            </Text>
        </TouchableOpacity>
    );

    const renderLeague = (league: any) => (
        <TouchableOpacity
            key={league.id}
            style={[
                styles.leagueCard,
                selectedLeague === league.id && styles.leagueCardSelected
            ]}
            onPress={() => setSelectedLeague(league.id)}
        >
            <Text style={styles.leagueName}>{league.name}</Text>
            <Text style={styles.leagueCountry}>{league.country}</Text>
        </TouchableOpacity>
    );

    const renderMatch = (match: any) => (
        <View key={match.id} style={styles.matchCard}>
            <View style={styles.matchHeader}>
                <Text style={styles.matchTeams}>
                    {match.homeTeam} vs {match.awayTeam}
                </Text>
                <Text style={styles.matchTime}>
                    {formatDate(match.kickoffTime)}
                </Text>
            </View>

            {match.markets?.slice(0, 3).map((market: any) => (
                <View key={market.id} style={styles.marketContainer}>
                    <Text style={styles.marketName}>{market.name}</Text>
                    <View style={styles.selectionsContainer}>
                        {market.selections?.map((selection: any) => (
                            <TouchableOpacity
                                key={selection.id}
                                style={[
                                    styles.selectionButton,
                                    betSlip.selections.some(s =>
                                        s.matchId === match.id &&
                                        s.market === market.name &&
                                        s.selection === selection.name
                                    ) && styles.selectionButtonSelected
                                ]}
                                onPress={() => addToBetSlip(match, market, selection)}
                            >
                                <Text style={[
                                    styles.selectionName,
                                    betSlip.selections.some(s =>
                                        s.matchId === match.id &&
                                        s.market === market.name &&
                                        s.selection === selection.name
                                    ) && styles.selectionNameSelected
                                ]}>
                                    {selection.name}
                                </Text>
                                <Text style={[
                                    styles.selectionOdds,
                                    betSlip.selections.some(s =>
                                        s.matchId === match.id &&
                                        s.market === market.name &&
                                        s.selection === selection.name
                                    ) && styles.selectionOddsSelected
                                ]}>
                                    {selection.odds.toFixed(2)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            ))}
        </View>
    );

    const BetSlipModal = () => (
        <Modal
            visible={showBetSlip}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowBetSlip(false)}
        >
            <SafeAreaView style={styles.betSlipContainer}>
                <View style={styles.betSlipHeader}>
                    <Text style={styles.betSlipTitle}>Bet Slip</Text>
                    <TouchableOpacity
                        onPress={() => setShowBetSlip(false)}
                        style={styles.closeButton}
                    >
                        <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.betSlipContent}>
                    {/* Bookmaker Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Select Bookmaker</Text>
                        <View style={styles.bookmakersGrid}>
                            {bookmakers.map(bookmaker => (
                                <TouchableOpacity
                                    key={bookmaker.id}
                                    style={[
                                        styles.bookmakerCard,
                                        selectedBookmaker === bookmaker.id && styles.bookmakerCardSelected
                                    ]}
                                    onPress={() => setSelectedBookmaker(bookmaker.id)}
                                >
                                    <Text style={styles.bookmakerLogo}>{bookmaker.logo}</Text>
                                    <Text style={styles.bookmakerName}>{bookmaker.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Selections */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            Your Selections ({betSlip.selections.length})
                        </Text>
                        {betSlip.selections.map((selection, index) => (
                            <View key={`${selection.matchId}-${selection.market}`} style={styles.selectionCard}>
                                <View style={styles.selectionInfo}>
                                    <Text style={styles.selectionTeams}>
                                        {selection.homeTeam} vs {selection.awayTeam}
                                    </Text>
                                    <Text style={styles.selectionMarket}>
                                        {selection.market}: {selection.selection}
                                    </Text>
                                    <Text style={styles.selectionOddsDisplay}>
                                        Odds: {selection.odds.toFixed(2)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.removeSelectionButton}
                                    onPress={() => removeFromBetSlip(selection.matchId, selection.market)}
                                >
                                    <MaterialIcons name="close" size={20} color={COLORS.error} />
                                </TouchableOpacity>
                            </View>
                        ))}

                        {betSlip.selections.length === 0 && (
                            <View style={styles.emptySelections}>
                                <MaterialIcons name="sports-soccer" size={48} color={COLORS.textTertiary} />
                                <Text style={styles.emptySelectionsText}>No selections yet</Text>
                                <Text style={styles.emptySelectionsSubtext}>
                                    Add selections from matches to build your bet slip
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Bet Type */}
                    {betSlip.selections.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Bet Type</Text>
                            <View style={styles.betTypeButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.betTypeButton,
                                        betSlip.betType === 'single' && styles.betTypeButtonSelected
                                    ]}
                                    onPress={() => setBetSlip(prev => ({ ...prev, betType: 'single' }))}
                                    disabled={betSlip.selections.length > 1}
                                >
                                    <Text style={[
                                        styles.betTypeButtonText,
                                        betSlip.betType === 'single' && styles.betTypeButtonTextSelected
                                    ]}>
                                        Single
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.betTypeButton,
                                        betSlip.betType === 'accumulator' && styles.betTypeButtonSelected
                                    ]}
                                    onPress={() => setBetSlip(prev => ({ ...prev, betType: 'accumulator' }))}
                                    disabled={betSlip.selections.length < 2}
                                >
                                    <Text style={[
                                        styles.betTypeButtonText,
                                        betSlip.betType === 'accumulator' && styles.betTypeButtonTextSelected
                                    ]}>
                                        Accumulator
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Stake Input */}
                    {betSlip.selections.length > 0 && (
                        <Formik
                            initialValues={{ stake: betSlip.stake }}
                            validationSchema={BetSchema}
                            onSubmit={(values) => {
                                setBetSlip(prev => ({ ...prev, stake: values.stake }));
                            }}
                        >
                            {({ values, errors, touched, handleChange, handleBlur, setFieldValue }) => (
                                <View style={styles.section}>
                                    <Text style={styles.sectionTitle}>Stake Amount</Text>

                                    {/* Quick Stakes */}
                                    <View style={styles.quickStakes}>
                                        {quickStakes.map(amount => (
                                            <TouchableOpacity
                                                key={amount}
                                                style={[
                                                    styles.quickStakeButton,
                                                    values.stake === amount && styles.quickStakeButtonSelected
                                                ]}
                                                onPress={() => {
                                                    setFieldValue('stake', amount);
                                                    setBetSlip(prev => ({ ...prev, stake: amount }));
                                                }}
                                            >
                                                <Text style={[
                                                    styles.quickStakeText,
                                                    values.stake === amount && styles.quickStakeTextSelected
                                                ]}>
                                                    ₦{amount.toLocaleString()}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {/* Custom Stake Input */}
                                    <TextInput
                                        style={styles.stakeInput}
                                        placeholder="Enter stake amount"
                                        value={values.stake ? values.stake.toString() : ''}
                                        onChangeText={(text) => {
                                            const numericValue = parseInt(text.replace(/[^0-9]/g, '')) || 0;
                                            setFieldValue('stake', numericValue);
                                            setBetSlip(prev => ({ ...prev, stake: numericValue }));
                                        }}
                                        onBlur={handleBlur('stake')}
                                        keyboardType="numeric"
                                    />
                                    {touched.stake && errors.stake && (
                                        <Text style={styles.errorText}>{errors.stake}</Text>
                                    )}

                                    {/* Betting Summary */}
                                    <View style={styles.bettingSummary}>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Total Odds:</Text>
                                            <Text style={styles.summaryValue}>{betSlip.totalOdds.toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.summaryRow}>
                                            <Text style={styles.summaryLabel}>Stake:</Text>
                                            <Text style={styles.summaryValue}>{formatCurrency(betSlip.stake)}</Text>
                                        </View>
                                        <View style={[styles.summaryRow, styles.summaryRowFinal]}>
                                            <Text style={styles.summaryLabelFinal}>Potential Winnings:</Text>
                                            <Text style={styles.summaryValueFinal}>
                                                {formatCurrency(betSlip.potentialWinnings)}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Place Bet Button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.placeBetButton,
                                            (placingBet || betSlip.stake < 50) && styles.placeBetButtonDisabled
                                        ]}
                                        onPress={handlePlaceBet}
                                        disabled={placingBet || betSlip.stake < 50}
                                    >
                                        <MaterialIcons name="sports-esports" size={24} color={COLORS.textInverse} />
                                        <Text style={styles.placeBetButtonText}>
                                            {placingBet ? 'Placing Bet...' : `Place Bet - ${formatCurrency(betSlip.stake)}`}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </Formik>
                    )}
                </ScrollView>
            </SafeAreaView>
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
                    <Text style={styles.headerTitle}>Sports Betting</Text>
                    <TouchableOpacity
                        style={styles.betSlipIcon}
                        onPress={() => setShowBetSlip(true)}
                    >
                        <MaterialIcons name="receipt" size={24} color={COLORS.textInverse} />
                        {betSlip.selections.length > 0 && (
                            <View style={styles.betSlipBadge}>
                                <Text style={styles.betSlipBadgeText}>{betSlip.selections.length}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
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
                <ScrollView style={styles.scrollContainer}>
                    {/* Sports Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Select Sport</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportsContainer}>
                            {sports.map(renderSport)}
                        </ScrollView>
                    </View>

                    {/* Leagues Selection */}
                    {selectedSport && leagues.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Select League</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leaguesContainer}>
                                {leagues.map(renderLeague)}
                            </ScrollView>
                        </View>
                    )}

                    {/* Matches */}
                    {selectedSport && matches.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                {selectedLeague ? `${leagues.find(l => l.id === selectedLeague)?.name} Matches` : 'All Matches'}
                            </Text>
                            {matches.map(renderMatch)}
                        </View>
                    )}

                    {/* Loading States */}
                    {sportsLoading && (
                        <View style={styles.loadingContainer}>
                            <Text>Loading sports...</Text>
                        </View>
                    )}

                    {selectedSport && leaguesLoading && (
                        <View style={styles.loadingContainer}>
                            <Text>Loading leagues...</Text>
                        </View>
                    )}

                    {selectedSport && matchesLoading && (
                        <View style={styles.loadingContainer}>
                            <Text>Loading matches...</Text>
                        </View>
                    )}

                    {/* Empty States */}
                    {!sportsLoading && sports.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="sports-soccer" size={64} color={COLORS.textTertiary} />
                            <Text style={styles.emptyStateText}>No sports available</Text>
                        </View>
                    )}

                    {selectedSport && !leaguesLoading && leagues.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="emoji-events" size={64} color={COLORS.textTertiary} />
                            <Text style={styles.emptyStateText}>No leagues available</Text>
                        </View>
                    )}

                    {selectedSport && !matchesLoading && matches.length === 0 && (
                        <View style={styles.emptyState}>
                            <MaterialIcons name="event" size={64} color={COLORS.textTertiary} />
                            <Text style={styles.emptyStateText}>No matches available</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            <BetSlipModal />
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
    betSlipIcon: {
        padding: SPACING.xs,
        position: 'relative',
    },
    betSlipBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: COLORS.error,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    betSlipBadgeText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.xs,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
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
    scrollContainer: {
        flex: 1,
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
    sportsContainer: {
        paddingVertical: SPACING.sm,
    },
    sportCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginRight: SPACING.base,
        alignItems: 'center',
        minWidth: 80,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    sportCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    sportIcon: {
        fontSize: 24,
        marginBottom: SPACING.xs,
    },
    sportName: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    sportNameSelected: {
        color: COLORS.primary,
    },
    leaguesContainer: {
        paddingVertical: SPACING.sm,
    },
    leagueCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginRight: SPACING.base,
        minWidth: 120,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    leagueCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    leagueName: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    leagueCountry: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
    },
    matchCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.base,
        ...SHADOWS.sm,
    },
    matchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.base,
    },
    matchTeams: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    matchTime: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
    },
    marketContainer: {
        marginBottom: SPACING.base,
    },
    marketName: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    selectionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
    selectionButton: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.base,
        padding: SPACING.sm,
        minWidth: 80,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectionButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    selectionName: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    selectionNameSelected: {
        color: COLORS.textInverse,
    },
    selectionOdds: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
    },
    selectionOddsSelected: {
        color: COLORS.textInverse,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    emptyStateText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        marginTop: SPACING.base,
        textAlign: 'center',
    },

    // Bet Slip Modal Styles
    betSlipContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    betSlipHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: SPACING.xl,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    betSlipTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
    },
    closeButton: {
        padding: SPACING.xs,
    },
    betSlipContent: {
        flex: 1,
    },
    bookmakersGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.base,
    },
    bookmakerCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        minWidth: (width - SPACING.xl * 3) / 2,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    bookmakerCardSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    bookmakerLogo: {
        fontSize: 24,
        marginBottom: SPACING.xs,
    },
    bookmakerName: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    selectionCard: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectionInfo: {
        flex: 1,
    },
    selectionTeams: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    selectionMarket: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    selectionOddsDisplay: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.primary,
    },
    removeSelectionButton: {
        padding: SPACING.xs,
    },
    emptySelections: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    emptySelectionsText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textSecondary,
        marginTop: SPACING.base,
    },
    emptySelectionsSubtext: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
        textAlign: 'center',
        marginTop: SPACING.xs,
    },
    betTypeButtons: {
        flexDirection: 'row',
        gap: SPACING.base,
    },
    betTypeButton: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    betTypeButtonSelected: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryBackground,
    },
    betTypeButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    betTypeButtonTextSelected: {
        color: COLORS.primary,
    },
    quickStakes: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
        marginBottom: SPACING.base,
    },
    quickStakeButton: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.base,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    quickStakeButtonSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    quickStakeText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textPrimary,
    },
    quickStakeTextSelected: {
        color: COLORS.textInverse,
    },
    stakeInput: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.base,
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    errorText: {
        color: COLORS.error,
        fontSize: TYPOGRAPHY.fontSizes.sm,
        marginTop: SPACING.xs,
    },
    bettingSummary: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginTop: SPACING.base,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    summaryRowFinal: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.sm,
        marginBottom: 0,
    },
    summaryLabel: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
    },
    summaryValue: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        color: COLORS.textPrimary,
    },
    summaryLabelFinal: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
    },
    summaryValueFinal: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.primary,
    },
    placeBetButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        ...SHADOWS.colored(COLORS.primary),
    },
    placeBetButtonDisabled: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.6,
    },
    placeBetButtonText: {
        color: COLORS.textInverse,
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        marginLeft: SPACING.sm,
    },
});