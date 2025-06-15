// app/bills/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function BillsLayout() {
    return (
        <>
            <Stack
                screenOptions={{
                    headerShown: false, // We'll handle headers in individual screens
                    animation: 'slide_from_right', // Smooth navigation animation
                    gestureEnabled: true, // Enable swipe to go back
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{
                        title: 'Bills & Payments',
                    }}
                />
                <Stack.Screen
                    name="airtime"
                    options={{
                        title: 'Buy Airtime',
                    }}
                />
                <Stack.Screen
                    name="data"
                    options={{
                        title: 'Buy Data',
                    }}
                />
                <Stack.Screen
                    name="electricity"
                    options={{
                        title: 'Pay Electricity',
                    }}
                />
                <Stack.Screen
                    name="bulk-sms"
                    options={{
                        title: 'Bulk SMS',
                    }}
                />
                <Stack.Screen
                    name="tv-subscription"
                    options={{
                        title: 'TV Subscription',
                    }}
                />
                <Stack.Screen
                    name="education"
                    options={{
                        title: 'Education',
                    }}
                />
                <Stack.Screen
                    name="insurance"
                    options={{
                        title: 'Insurance',
                    }}
                />
                <Stack.Screen
                    name="other-services"
                    options={{
                        title: 'Other Services',
                    }}
                />
                <Stack.Screen
                    name="receipt"
                    options={{
                        title: 'Transaction Receipt',
                        animation: 'slide_from_bottom', // Different animation for receipt
                    }}
                />
            </Stack>
            <StatusBar style="light" />
        </>
    );
}