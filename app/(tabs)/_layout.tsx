// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { COLORS, TYPOGRAPHY } from '@/assets/colors/theme';

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
                        borderTopColor: COLORS.border,
                        borderTopWidth: 1,
                        height: 85,
                        paddingBottom: 25,
                        paddingTop: 8,
                    },
                    default: {
                        backgroundColor: COLORS.background,
                        borderTopColor: COLORS.border,
                        borderTopWidth: 1,
                        height: 65,
                        paddingBottom: 8,
                        paddingTop: 8,
                    },
                }),
                tabBarLabelStyle: {
                    fontSize: TYPOGRAPHY.fontSizes.xs,
                    fontWeight: TYPOGRAPHY.fontWeights.medium,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, focused }) => (
                        <MaterialIcons
                            name="dashboard"
                            size={24}
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
                        <MaterialIcons
                            name="receipt"
                            size={24}
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
                        <MaterialIcons
                            name={focused ? "account-balance-wallet" : "account-balance-wallet"}
                            size={24}
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
                        <MaterialIcons
                            name={focused ? "account-balance-wallet" : "account-balance-wallet"}
                            size={24}
                            color={color}
                        />
                    ),
                }}
            />
            {/*<Tabs.Screen*/}
            {/*    name="transactions"*/}
            {/*    options={{*/}
            {/*        title: 'History',*/}
            {/*        tabBarIcon: ({ color, focused }) => (*/}
            {/*            <MaterialIcons*/}
            {/*                name="history"*/}
            {/*                size={24}*/}
            {/*                color={color}*/}
            {/*            />*/}
            {/*        ),*/}
            {/*    }}*/}
            {/*/>*/}
            {/*<Tabs.Screen*/}
            {/*    name="profile"*/}
            {/*    options={{*/}
            {/*        title: 'Profile',*/}
            {/*        tabBarIcon: ({ color, focused }) => (*/}
            {/*            <MaterialIcons*/}
            {/*                name={focused ? "person" : "person-outline"}*/}
            {/*                size={24}*/}
            {/*                color={color}*/}
            {/*            />*/}
            {/*        ),*/}
            {/*    }}*/}
            {/*/>*/}
        </Tabs>
    );
}