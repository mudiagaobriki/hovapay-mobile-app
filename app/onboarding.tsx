import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    Image,
    FlatList,
    Platform,
    SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';
import { markOnboardingCompleted } from '@/utils/onboarding';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    image: any;
    backgroundColor: string;
    gradientColors: string[];
}

const slides: OnboardingSlide[] = [
    {
        id: '1',
        title: 'Fast. Reliable.',
        subtitle: 'Everywhere',
        description: 'Experience the convenience of paying bills anytime, anywhere with instant value on every transaction with our app',
        image: require('@/assets/images/intro-convenience.jpg'),
        backgroundColor: '#0b3d6f',
        gradientColors: ['#0b3d6f', '#1e5a8a'],
    },
    {
        id: '2',
        title: 'Secure',
        subtitle: 'Transactions',
        description: 'We use industry-leading security measures to protect your financial data',
        image: require('@/assets/images/intro-security.jpg'),
        backgroundColor: '#0b3d6f',
        gradientColors: ['#0b3d6f', '#1a4971'],
    },
];

export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const router = useRouter();

    const goToNext = async () => {
        if (currentIndex < slides.length - 1) {
            const nextIndex = currentIndex + 1;
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
            setCurrentIndex(nextIndex);
        } else {
            // Mark onboarding as completed and navigate to login/signup screen
            try {
                await markOnboardingCompleted();
                router.replace('/login');
            } catch (error) {
                console.error('Failed to complete onboarding:', error);
                router.replace('/login'); // Navigate anyway
            }
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
            setCurrentIndex(prevIndex);
        }
    };

    const skipToEnd = async () => {
        try {
            await markOnboardingCompleted();
            router.replace('/login');
        } catch (error) {
            console.error('Failed to complete onboarding:', error);
            router.replace('/login'); // Navigate anyway
        }
    };

    const onViewableItemsChanged = ({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    };

    const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
        <View style={[styles.slide, { width }]}>
            <LinearGradient
                colors={item.gradientColors}
                style={styles.slideGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <SafeAreaView style={styles.slideContent}>
                    {/* Header with Skip Button */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft} />
                        <TouchableOpacity
                            style={styles.skipButton}
                            onPress={skipToEnd}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.skipText}>Skip</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Main Content */}
                    <View style={styles.mainContent}>
                        {/* Image Container */}
                        <View style={styles.imageContainer}>
                            <View style={styles.imagePlaceholder}>
                                <Image
                                    source={item.image}
                                    style={styles.image}
                                    resizeMode="cover"
                                />
                            </View>
                        </View>

                        {/* Text Content */}
                        <View style={styles.textContainer}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.subtitle}>{item.subtitle}</Text>
                            </View>
                            <Text style={styles.description}>{item.description}</Text>
                        </View>
                    </View>

                    {/* Bottom Navigation */}
                    <View style={styles.bottomContainer}>
                        {/* Pagination Dots */}
                        <View style={styles.pagination}>
                            {slides.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        i === currentIndex ? styles.activeDot : styles.inactiveDot,
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Navigation Buttons */}
                        <View style={styles.navigationContainer}>
                            {currentIndex > 0 ? (
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={goToPrevious}
                                    activeOpacity={0.7}
                                >
                                    <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.backButton} />
                            )}

                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={goToNext}
                                activeOpacity={0.8}
                            >
                                {currentIndex === slides.length - 1 ? (
                                    <Text style={styles.nextButtonText}>Get Started</Text>
                                ) : (
                                    <>
                                        <Text style={styles.nextButtonText}>Next</Text>
                                        <MaterialIcons
                                            name="arrow-forward"
                                            size={20}
                                            color={item.backgroundColor}
                                            style={{ marginLeft: 8 }}
                                        />
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </LinearGradient>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0b3d6f" />
            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                keyExtractor={(item) => item.id}
                scrollEnabled={true}
                bounces={false}
                overScrollMode="never"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b3d6f',
    },
    slide: {
        flex: 1,
        height,
    },
    slideGradient: {
        flex: 1,
    },
    slideContent: {
        flex: 1,
        paddingHorizontal: SPACING.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? SPACING.md : SPACING.xl,
        paddingBottom: SPACING.lg,
    },
    headerLeft: {
        width: 60, // Balance the skip button
    },
    skipButton: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.base,
        borderRadius: RADIUS.md,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    skipText: {
        color: COLORS.white,
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        flex: 0.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING['2xl'],
    },
    imagePlaceholder: {
        width: width * 0.75,
        height: height * 0.35,
        borderRadius: RADIUS['2xl'],
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...SHADOWS.lg,
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: RADIUS.xl,
    },
    textContainer: {
        flex: 0.4,
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: TYPOGRAPHY.fontSizes['3xl'],
        fontWeight: TYPOGRAPHY.fontWeights.light,
        color: COLORS.white,
        textAlign: 'center',
        marginBottom: SPACING.xs,
        opacity: 0.9,
    },
    subtitle: {
        fontSize: TYPOGRAPHY.fontSizes['4xl'],
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.white,
        textAlign: 'center',
        lineHeight: TYPOGRAPHY.fontSizes['4xl'] * 1.1,
    },
    description: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.white,
        textAlign: 'center',
        lineHeight: TYPOGRAPHY.fontSizes.base * 1.5,
        opacity: 0.85,
        maxWidth: width * 0.85,
    },
    bottomContainer: {
        paddingBottom: Platform.OS === 'ios' ? SPACING['2xl'] : SPACING.xl,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING['2xl'],
    },
    dot: {
        borderRadius: RADIUS.full,
        marginHorizontal: SPACING.xs,
    },
    activeDot: {
        width: 32,
        height: 8,
        backgroundColor: COLORS.white,
    },
    inactiveDot: {
        width: 8,
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    navigationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    backButton: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.full,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingVertical: SPACING.base,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.full,
        minWidth: 120,
        justifyContent: 'center',
        ...SHADOWS.lg,
    },
    nextButtonText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: '#0b3d6f',
    },
});