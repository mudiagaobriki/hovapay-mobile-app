// app/about.tsx - About Hovapay Page
import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Linking,
    Image,
    Dimensions,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

const { width } = Dimensions.get('window');

export default function AboutHovapayScreen() {
    const router = useRouter();
    const [appInfo] = useState({
        version: '1.0.0',
        buildNumber: '100',
        releaseDate: 'January 2025',
    });

    const renderSection = (title: string, content: React.ReactNode) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionContent}>
                {content}
            </View>
        </View>
    );

    const renderFeatureCard = (icon: string, title: string, description: string) => (
        <View style={styles.featureCard}>
            <View style={styles.featureIcon}>
                <MaterialIcons name={icon as any} size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
        </View>
    );

    const renderStatCard = (number: string, label: string, icon: string) => (
        <View style={styles.statCard}>
            <MaterialIcons name={icon as any} size={24} color={COLORS.primary} />
            <Text style={styles.statNumber}>{number}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    const renderTeamMember = (name: string, role: string, image?: string) => (
        <View style={styles.teamMember}>
            <View style={styles.teamAvatar}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.avatarImage} />
                ) : (
                    <MaterialIcons name="person" size={32} color={COLORS.textTertiary} />
                )}
            </View>
            <Text style={styles.teamName}>{name}</Text>
            <Text style={styles.teamRole}>{role}</Text>
        </View>
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
                    <Text style={styles.headerTitle}>About Hovapay</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.headerInfo}>
                    <View style={styles.logoContainer}>
                        <MaterialIcons name="account-balance-wallet" size={64} color={COLORS.textInverse} />
                    </View>
                    <Text style={styles.headerDescription}>
                        Making digital payments simple, secure, and accessible for everyone
                    </Text>
                    <Text style={styles.versionText}>Version {appInfo.version}</Text>
                </View>
            </LinearGradient>

            {/* Content */}
                <View style={styles.contentContainer}>
                {/* Our Mission */}
                {renderSection("Our Mission",
                    <Text style={styles.bodyText}>
                        Hovapay is dedicated to revolutionizing digital payments in Nigeria by providing a secure, user-friendly platform that empowers individuals and businesses to transact seamlessly. We believe that everyone deserves access to modern financial services that are reliable, affordable, and easy to use.
                        {'\n\n'}
                        Our mission is to bridge the gap between traditional banking and digital innovation, creating financial inclusion opportunities for all Nigerians.
                    </Text>
                )}

                {/* Company Stats */}
                <View style={styles.statsContainer}>
                    {renderStatCard("50K+", "Active Users", "people")}
                    {renderStatCard("₦2B+", "Transactions", "trending-up")}
                    {renderStatCard("99.9%", "Uptime", "security")}
                </View>

                {/* Key Features */}
                {renderSection("What We Offer",
                    <View style={styles.featuresGrid}>
                        {renderFeatureCard("account-balance-wallet", "Digital Wallet", "Secure storage and management of your funds with real-time balance tracking")}
                        {renderFeatureCard("phone-android", "Bill Payments", "Pay for airtime, data, electricity, cable TV, and other utilities instantly")}
                        {renderFeatureCard("send", "Money Transfers", "Send money to friends, family, and businesses across Nigeria")}
                        {renderFeatureCard("receipt", "Transaction History", "Detailed records of all your transactions with downloadable receipts")}
                        {renderFeatureCard("security", "Bank-Level Security", "Advanced encryption and fraud protection to keep your money safe")}
                        {renderFeatureCard("support", "24/7 Support", "Round-the-clock customer support to assist you whenever you need help")}
                    </View>
                )}

                {/* Our Story */}
                {renderSection("Our Story",
                    <Text style={styles.bodyText}>
                        Founded in 2024, Hovapay emerged from a simple vision: to make digital payments accessible to every Nigerian. Our founders recognized the challenges faced by millions who struggled with traditional banking limitations and saw an opportunity to create a solution.
                        {'\n\n'}
                        Starting as a small team of passionate developers and financial experts, we've grown into a trusted platform serving thousands of users across Nigeria. Our journey has been driven by continuous innovation, user feedback, and an unwavering commitment to financial inclusion.
                        {'\n\n'}
                        Today, Hovapay stands as a testament to what's possible when technology meets purpose, providing essential financial services to both urban and rural communities.
                    </Text>
                )}

                {/* Leadership Team */}
                {/*{renderSection("Leadership Team",*/}
                {/*    <View style={styles.teamGrid}>*/}
                {/*        {renderTeamMember("Adebayo Johnson", "Chief Executive Officer")}*/}
                {/*        {renderTeamMember("Kemi Adeleke", "Chief Technology Officer")}*/}
                {/*        {renderTeamMember("Emeka Okafor", "Chief Financial Officer")}*/}
                {/*        {renderTeamMember("Fatima Hassan", "Head of Operations")}*/}
                {/*    </View>*/}
                {/*)}*/}

                {/* Values */}
                {renderSection("Our Values",
                    <View>
                        <View style={styles.valueItem}>
                            <MaterialIcons name="security" size={24} color={COLORS.primary} />
                            <View style={styles.valueContent}>
                                <Text style={styles.valueTitle}>Security First</Text>
                                <Text style={styles.valueDescription}>
                                    We implement the highest security standards to protect your funds and personal information.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.valueItem}>
                            <MaterialIcons name="accessibility" size={24} color={COLORS.primary} />
                            <View style={styles.valueContent}>
                                <Text style={styles.valueTitle}>Accessibility</Text>
                                <Text style={styles.valueDescription}>
                                    Our services are designed to be inclusive and accessible to users of all backgrounds and technical abilities.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.valueItem}>
                            <MaterialIcons name="transparency" size={24} color={COLORS.primary} />
                            <View style={styles.valueContent}>
                                <Text style={styles.valueTitle}>Transparency</Text>
                                <Text style={styles.valueDescription}>
                                    We believe in clear, honest communication about our fees, policies, and practices.
                                </Text>
                            </View>
                        </View>

                        <View style={styles.valueItem}>
                            <MaterialIcons name="speed" size={24} color={COLORS.primary} />
                            <View style={styles.valueContent}>
                                <Text style={styles.valueTitle}>Innovation</Text>
                                <Text style={styles.valueDescription}>
                                    We continuously evolve our platform to meet changing user needs and technological advances.
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Technology & Security */}
                {renderSection("Technology & Security",
                    <View>
                        <Text style={styles.bodyText}>
                            Hovapay is built on cutting-edge technology infrastructure that ensures reliability, scalability, and security:
                        </Text>
                        <View style={styles.techList}>
                            <View style={styles.techItem}>
                                <MaterialIcons name="lock" size={20} color={COLORS.success} />
                                <Text style={styles.techText}>256-bit SSL encryption for all data transmission</Text>
                            </View>
                            <View style={styles.techItem}>
                                <MaterialIcons name="cloud-done" size={20} color={COLORS.success} />
                                <Text style={styles.techText}>Cloud-based infrastructure with 99.9% uptime</Text>
                            </View>
                            <View style={styles.techItem}>
                                <MaterialIcons name="verified-user" size={20} color={COLORS.success} />
                                <Text style={styles.techText}>PCI DSS compliance for payment security</Text>
                            </View>
                            <View style={styles.techItem}>
                                <MaterialIcons name="backup" size={20} color={COLORS.success} />
                                <Text style={styles.techText}>Real-time backup and disaster recovery</Text>
                            </View>
                            <View style={styles.techItem}>
                                <MaterialIcons name="bug-report" size={20} color={COLORS.success} />
                                <Text style={styles.techText}>Continuous monitoring and fraud detection</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Partnerships */}
                {renderSection("Our Partners",
                    <Text style={styles.bodyText}>
                        Hovapay works with trusted partners to deliver reliable services:
                        {'\n\n'}
                        • Licensed banks and financial institutions for secure fund management
                        {'\n'}
                        • Payment processors for seamless transactions
                        {'\n'}
                        • Utility companies for direct bill payment integration
                        {'\n'}
                        • Regulatory bodies to ensure compliance and consumer protection
                        {'\n'}
                        • Technology partners for infrastructure and security
                    </Text>
                )}

                {/* App Information */}
                {renderSection("App Information",
                    <View style={styles.appInfoContainer}>
                        <View style={styles.appInfoRow}>
                            <Text style={styles.appInfoLabel}>Version:</Text>
                            <Text style={styles.appInfoValue}>{appInfo.version}</Text>
                        </View>
                        <View style={styles.appInfoRow}>
                            <Text style={styles.appInfoLabel}>Build Number:</Text>
                            <Text style={styles.appInfoValue}>{appInfo.buildNumber}</Text>
                        </View>
                        <View style={styles.appInfoRow}>
                            <Text style={styles.appInfoLabel}>Release Date:</Text>
                            <Text style={styles.appInfoValue}>{appInfo.releaseDate}</Text>
                        </View>
                        <View style={styles.appInfoRow}>
                            <Text style={styles.appInfoLabel}>Platform:</Text>
                            <Text style={styles.appInfoValue}>iOS & Android</Text>
                        </View>
                    </View>
                )}

                {/* Contact & Support */}
                {renderSection("Get In Touch",
                    <View>
                        <Text style={styles.bodyText}>
                            We value your feedback and are always here to help. Reach out to us through any of these channels:
                        </Text>
                        <View style={styles.contactInfo}>
                            <TouchableOpacity
                                style={styles.contactItem}
                                onPress={() => Linking.openURL('mailto:support@hovapay.com')}
                            >
                                <MaterialIcons name="email" size={20} color={COLORS.primary} />
                                <Text style={styles.contactText}>support@hovapay.com</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.contactItem}
                                onPress={() => Linking.openURL('tel:+2348000000000')}
                            >
                                <MaterialIcons name="phone" size={20} color={COLORS.primary} />
                                <Text style={styles.contactText}>+234 800 000 0000</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.contactItem}
                                onPress={() => Linking.openURL('https://twitter.com/hovapay')}
                            >
                                <MaterialIcons name="public" size={20} color={COLORS.primary} />
                                <Text style={styles.contactText}>@hovapay on social media</Text>
                            </TouchableOpacity>
                            <View style={styles.contactItem}>
                                <MaterialIcons name="location-on" size={20} color={COLORS.primary} />
                                <Text style={styles.contactText}>
                                    Hovapay Limited{'\n'}
                                    Port Harcourt, Nigeria
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Legal Links */}
                <View style={styles.legalSection}>
                    <Text style={styles.legalTitle}>Legal & Compliance</Text>
                    <TouchableOpacity
                        style={styles.legalLink}
                        onPress={() => router.push('/legal/terms')}
                    >
                        <MaterialIcons name="description" size={20} color={COLORS.primary} />
                        <Text style={styles.legalLinkText}>Terms & Conditions</Text>
                        <MaterialIcons name="arrow-forward" size={16} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.legalLink}
                        onPress={() => router.push('/legal/privacy')}
                    >
                        <MaterialIcons name="privacy-tip" size={20} color={COLORS.primary} />
                        <Text style={styles.legalLinkText}>Privacy Policy</Text>
                        <MaterialIcons name="arrow-forward" size={16} color={COLORS.textTertiary} />
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        © 2025 Hovapay Limited. All rights reserved.
                    </Text>
                    <Text style={styles.footerSubtext}>
                        Licensed and regulated financial service provider
                    </Text>
                    <Text style={styles.footerSubtext}>
                        Made with ❤️ in Nigeria
                    </Text>
                </View>

                <View style={{ height: SPACING['4xl'] }} />
                </View>
            </ScrollView>
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
        paddingBottom: SPACING['2.5xl'],
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
    placeholder: {
        width: 40,
    },
    headerInfo: {
        alignItems: 'center',
        paddingVertical: SPACING.base,
    },
    logoContainer: {
        marginBottom: SPACING.base,
    },
    headerDescription: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.withOpacity(COLORS.textInverse, 0.9),
        textAlign: 'center',
        marginBottom: SPACING.sm,
        lineHeight: 24,
    },
    versionText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.withOpacity(COLORS.textInverse, 0.7),
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['2xl'],
        borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
        paddingTop: SPACING.xl,
    },
    section: {
        marginBottom: SPACING.xl,
        paddingHorizontal: SPACING.xl,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.lg,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    sectionContent: {
        paddingLeft: SPACING.sm,
    },
    bodyText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        lineHeight: 24,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        marginBottom: SPACING.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        marginHorizontal: SPACING.xs,
        ...SHADOWS.sm,
    },
    statNumber: {
        fontSize: TYPOGRAPHY.fontSizes.xl,
        fontWeight: TYPOGRAPHY.fontWeights.bold,
        color: COLORS.textPrimary,
        marginTop: SPACING.xs,
    },
    statLabel: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        textAlign: 'center',
        marginTop: SPACING.xs,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    featureCard: {
        width: (width - SPACING.xl * 3) / 2,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        alignItems: 'center',
        marginBottom: SPACING.base,
        ...SHADOWS.sm,
    },
    featureIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: COLORS.primaryBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    featureTitle: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    featureDescription: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        textAlign: 'center',
        lineHeight: 16,
    },
    teamGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    teamMember: {
        width: (width - SPACING.xl * 3) / 2,
        alignItems: 'center',
        marginBottom: SPACING.lg,
    },
    teamAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.backgroundSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    avatarImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    teamName: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.xs,
    },
    teamRole: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
        textAlign: 'center',
    },
    valueItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SPACING.base,
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        ...SHADOWS.sm,
    },
    valueContent: {
        flex: 1,
        marginLeft: SPACING.sm,
    },
    valueTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    valueDescription: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    techList: {
        marginTop: SPACING.base,
    },
    techItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        paddingLeft: SPACING.base,
    },
    techText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        marginLeft: SPACING.sm,
        lineHeight: 22,
    },
    appInfoContainer: {
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
    },
    appInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
    },
    appInfoLabel: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
    },
    appInfoValue: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
    },
    contactInfo: {
        marginTop: SPACING.base,
        backgroundColor: COLORS.backgroundSecondary,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    contactText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        marginLeft: SPACING.sm,
        lineHeight: 22,
    },
    legalSection: {
        backgroundColor: COLORS.backgroundSecondary,
        marginHorizontal: SPACING.xl,
        borderRadius: RADIUS.lg,
        padding: SPACING.base,
        marginBottom: SPACING.xl,
    },
    legalTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.base,
    },
    legalLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    legalLinkText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textPrimary,
        marginLeft: SPACING.sm,
        flex: 1,
    },
    footer: {
        alignItems: 'center',
        marginTop: SPACING.xl,
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        backgroundColor: COLORS.backgroundSecondary,
        marginHorizontal: SPACING.xl,
        borderRadius: RADIUS.lg,
    },
    footerText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textSecondary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    footerSubtext: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: SPACING.xs,
    },
    scrollContainer: {
        flex: 1,
    },
    contentContainer: {
        backgroundColor: COLORS.background,
        // borderTopLeftRadius: RADIUS['2xl'],
        // borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
        paddingTop: SPACING['2xl'],
        flex: 1,
    },
});