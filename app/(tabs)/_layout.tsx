// app/(tabs)/_layout.tsx - Enhanced with Beautiful Professional Icons
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

interface TabIconProps {
    name: keyof typeof MaterialIcons.glyphMap;
    focused: boolean;
    color: string;
    size?: number;
}

function EnhancedTabIcon({ name, focused, color, size = 24 }: TabIconProps) {
    if (focused) {
        return (
            <View style={styles.focusedIconContainer}>
                <LinearGradient
                    colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                    style={styles.iconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialIcons
                        name={name}
                        size={size}
                        color={COLORS.textInverse}
                    />
                </LinearGradient>
                <View style={styles.focusedIndicator} />
            </View>
        );
    }

    return (
        <View style={styles.unfocusedIconContainer}>
            <MaterialIcons
                name={name}
                size={size}
                color={color}
            />
        </View>
    );
}

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textTertiary,
                headerShown: false,
                tabBarButton: HapticTab,
                tabBarBackground: TabBarBackground,
                tabBarStyle: Platform.select({
                    ios: {
                        // Use a transparent background on iOS to show the blur effect
                        position: 'absolute',
                        backgroundColor: COLORS.background,
                        borderTopColor: COLORS.withOpacity(COLORS.border, 0.1),
                        borderTopWidth: 1,
                        height: 90,
                        paddingBottom: 28,
                        paddingTop: 12,
                        borderTopLeftRadius: RADIUS.xl,
                        borderTopRightRadius: RADIUS.xl,
                        ...SHADOWS.lg,
                    },
                    default: {
                        backgroundColor: COLORS.background,
                        borderTopColor: COLORS.withOpacity(COLORS.border, 0.1),
                        borderTopWidth: 1,
                        height: 70,
                        paddingBottom: 10,
                        paddingTop: 10,
                        borderTopLeftRadius: RADIUS.xl,
                        borderTopRightRadius: RADIUS.xl,
                        elevation: 12,
                    },
                }),
                tabBarLabelStyle: {
                    fontSize: TYPOGRAPHY.fontSizes.xs,
                    fontWeight: TYPOGRAPHY.fontWeights.semibold,
                    marginTop: SPACING.xs,
                },
                tabBarItemStyle: {
                    paddingVertical: SPACING.xs,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, focused }) => (
                        <EnhancedTabIcon
                            name="dashboard"
                            focused={focused}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="bills"
                options={{
                    title: 'Bills',
                    tabBarIcon: ({ color, focused }) => (
                        <EnhancedTabIcon
                            name="receipt-long"
                            focused={focused}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="wallet"
                options={{
                    title: 'Wallet',
                    tabBarIcon: ({ color, focused }) => (
                        <EnhancedTabIcon
                            name="account-balance-wallet"
                            focused={focused}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="transactions"
                options={{
                    title: 'Transactions',
                    tabBarIcon: ({ color, focused }) => (
                        <EnhancedTabIcon
                            name="history"
                            focused={focused}
                            color={color}
                        />
                    ),
                }}
            />
            {/*<Tabs.Screen*/}
            {/*    name="profile"*/}
            {/*    options={{*/}
            {/*        title: 'Profile',*/}
            {/*        tabBarIcon: ({ color, focused }) => (*/}
            {/*            <EnhancedTabIcon*/}
            {/*                name={focused ? "person" : "person-outline"}*/}
            {/*                focused={focused}*/}
            {/*                color={color}*/}
            {/*            />*/}
            {/*        ),*/}
            {/*    }}*/}
            {/*/>*/}
        </Tabs>
    );
}

const styles = StyleSheet.create({
    focusedIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    unfocusedIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 32,
    },
    iconGradient: {
        width: 48,
        height: 32,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.sm,
    },
    focusedIndicator: {
        position: 'absolute',
        bottom: -6,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.primary,
        opacity: 0.8,
    },
});