// app/chat/index.tsx (Final Corrected Version)
import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    TextInput,
    TouchableOpacity,
    FlatList,
    Text,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import { useSelector } from 'react-redux';

import { selectCurrentUser, selectCurrentToken } from '@/store/slices/authSlice';
import { useGetChatHistoryQuery } from '@/store/api/chatApi';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '@/assets/colors/theme';

interface Message {
    _id: string;
    text: string;
    createdAt: string;
    sender: { // Changed from senderId to sender for clarity
        _id: string;
        name: string;
    };
}

// A helper function to format messages consistently
const formatMessage = (msg: any, currentUserId: string): Message => {
    return {
        _id: msg._id,
        text: msg.message,
        createdAt: msg.createdAt,
        sender: {
            _id: msg.senderId._id,
            name: msg.senderId._id === currentUserId ? 'Me' : 'Support',
        },
    };
};

const ChatScreen = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [socket, setSocket] = useState<Socket | null>(null);
    const router = useRouter();

    const user = useSelector(selectCurrentUser);
    const token = useSelector(selectCurrentToken);

    const SUPPORT_AGENT_ID = '688facb0d1b1f9003c38c7de';

    const { data: historyData, isLoading } = useGetChatHistoryQuery({
        conversationId: user?._id || '',
        page: 1,
    }, { skip: !user });

    // Effect for Socket.IO connection
    useEffect(() => {
        if (!token || !user) return;

        const newSocket = io('https://hovapay-api.onrender.com', {
            auth: { token },
            transports: ['websocket'],
        });
        setSocket(newSocket);

        return () => { newSocket.disconnect(); };
    }, [token, user]);

    // Effect for handling incoming messages
    useEffect(() => {
        if (!socket || !user) return;

        const handleReceiveMessage = (newMessageData: any) => {
            // FIX #1: Logic for preventing self-duplication
            // Optimistic update handles my own messages, so we only add a message if the ID is new to the list
            if (messages.some(m => m._id === newMessageData._id)) {
                return;
            }
            setMessages(previousMessages => [formatMessage(newMessageData, user._id), ...previousMessages]);
        };

        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
        };
    }, [socket, user, messages]); // `messages` is a dependency to prevent stale closures

    // Effect to load chat history
    useEffect(() => {
        if (user && historyData?.data?.docs) {
            const loadedMessages = historyData.data.docs.map(msg => formatMessage(msg, user._id));
            setMessages(loadedMessages);
        }
    }, [historyData, user]);

    const handleSend = () => {
        if (inputText.trim().length === 0 || !socket || !user) return;

        socket.emit('send_message', {
            receiverId: SUPPORT_AGENT_ID,
            message: inputText,
        });

        // Optimistic update
        const optimisticMessage: Message = {
            _id: `temp_${Date.now()}`,
            text: inputText,
            createdAt: new Date().toISOString(),
            sender: { _id: user._id, name: 'Me' },
        };
        setMessages(previousMessages => [optimisticMessage, ...previousMessages]);
        setInputText('');
    };

    const renderMessageItem = ({ item }: { item: Message }) => {
        const isMyMessage = item.sender._id === user?._id;

        return (
            <View style={[ styles.messageRow, { justifyContent: isMyMessage ? 'flex-end' : 'flex-start' } ]}>
                <View style={[ styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble ]}>
                    <Text style={isMyMessage ? styles.myMessageText : styles.theirMessageText}>
                        {item.text}
                    </Text>
                    <Text style={[ styles.messageTimestamp, { color: isMyMessage ? COLORS.withOpacity(COLORS.white, 0.7) : COLORS.textTertiary } ]}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    // ... a loading state and the rest of your JSX remains the same

    if (isLoading && !messages.length) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]} style={styles.header}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}><MaterialIcons name="arrow-back" size={24} color={COLORS.textInverse} /></TouchableOpacity>
                        <Text style={styles.headerTitle}>Customer Support</Text>
                        <View style={styles.headerButton} />
                    </View>
                </LinearGradient>
                <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}><MaterialIcons name="arrow-back" size={24} color={COLORS.textInverse} /></TouchableOpacity>
                    <Text style={styles.headerTitle}>Customer Support</Text>
                    <View style={styles.headerButton} />
                </View>
            </LinearGradient>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingContainer}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                <FlatList
                    data={messages}
                    renderItem={renderMessageItem}
                    keyExtractor={(item) => item._id}
                    style={styles.messageList}
                    inverted
                    contentContainerStyle={{ paddingHorizontal: SPACING.base, paddingTop: SPACING.sm }}
                />

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.textInput}
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        placeholderTextColor={COLORS.textTertiary}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSend}><MaterialIcons name="send" size={24} color={COLORS.white} /></TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.primary,
    },
    keyboardAvoidingContainer: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
    },
    header: {
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.base,
        paddingHorizontal: SPACING.lg,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textInverse,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.backgroundSecondary,
    },
    messageList: {
        flex: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.base,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    textInput: {
        flex: 1,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: SPACING.base,
        paddingVertical: Platform.OS === 'ios' ? SPACING.sm : SPACING.xs,
        fontSize: TYPOGRAPHY.fontSizes.base,
        maxHeight: 120,
        marginRight: SPACING.base,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.full,
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageRow: {
        marginVertical: SPACING.sm,
        width: '100%',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
    },
    myMessageBubble: {
        alignSelf: 'flex-end',
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: RADIUS.xs,
    },
    theirMessageBubble: {
        alignSelf: 'flex-start',
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderBottomLeftRadius: RADIUS.xs,
    },
    myMessageText: {
        color: COLORS.white,
        fontSize: TYPOGRAPHY.fontSizes.base,
    },
    theirMessageText: {
        color: COLORS.textPrimary,
        fontSize: TYPOGRAPHY.fontSizes.base,
    },
    messageTimestamp: {
        fontSize: TYPOGRAPHY.fontSizes.xs - 1,
        alignSelf: 'flex-end',
        marginTop: SPACING.xs,
        opacity: 0.8,
    },
});

export default ChatScreen;