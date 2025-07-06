// app/legal/privacy.tsx - Privacy Policy Page
import React from 'react';
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Linking,
} from 'react-native';
import { Text } from 'native-base';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/assets/colors/theme';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    const renderSection = (title: string, content: React.ReactNode) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionContent}>
                {content}
            </View>
        </View>
    );

    const renderSubSection = (title: string, content: string) => (
        <View style={styles.subSection}>
            <Text style={styles.subSectionTitle}>{title}</Text>
            <Text style={styles.bodyText}>{content}</Text>
        </View>
    );

    const renderBulletPoint = (text: string) => (
        <View style={styles.bulletPoint}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>{text}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>

            {/* Header */}
            <LinearGradient
                colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <MaterialIcons name="arrow-back" size={24} color={COLORS.textInverse} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Privacy Policy</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.headerInfo}>
                    <MaterialIcons name="privacy-tip" size={48} color={COLORS.textInverse} />
                    <Text style={styles.headerDescription}>
                        How we protect and handle your personal information
                    </Text>
                </View>
            </LinearGradient>

            {/* Content */}
                <View style={styles.contentContainer}>
                {/* Last Updated */}
                <View style={styles.lastUpdated}>
                    <MaterialIcons name="update" size={16} color={COLORS.textTertiary} />
                    <Text style={styles.lastUpdatedText}>Last updated: January 15, 2025</Text>
                </View>

                {/* Introduction */}
                {renderSection("1. Introduction",
                    <Text style={styles.bodyText}>
                        At Hovapay, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
                        {'\n\n'}
                        We respect your privacy rights and provide you with control over your personal information. Please read this policy carefully to understand our practices regarding your personal data.
                    </Text>
                )}

                {/* Information We Collect */}
                {renderSection("2. Information We Collect",
                    <View>
                        {renderSubSection("2.1 Personal Information",
                            "We collect personal information that you provide directly to us, including:"
                        )}
                        {renderBulletPoint("Full name and contact information (email, phone number, address)")}
                        {renderBulletPoint("Government-issued identification for verification purposes")}
                        {renderBulletPoint("Banking and financial information for transactions")}
                        {renderBulletPoint("Biometric data (if you enable biometric authentication)")}
                        {renderBulletPoint("Profile photos and other uploaded content")}

                        {renderSubSection("2.2 Transaction Information",
                            "We collect information about your transactions and financial activities:"
                        )}
                        {renderBulletPoint("Transaction history and payment details")}
                        {renderBulletPoint("Wallet balance and funding sources")}
                        {renderBulletPoint("Bill payment information and recipients")}
                        {renderBulletPoint("Transfer details and beneficiaries")}

                        {renderSubSection("2.3 Technical Information",
                            "We automatically collect certain technical information:"
                        )}
                        {renderBulletPoint("Device information (model, operating system, unique identifiers)")}
                        {renderBulletPoint("IP address and location data")}
                        {renderBulletPoint("App usage patterns and preferences")}
                        {renderBulletPoint("Log files and error reports")}
                        {renderBulletPoint("Cookies and similar tracking technologies")}
                    </View>
                )}

                {/* How We Use Your Information */}
                {renderSection("3. How We Use Your Information",
                    <View>
                        <Text style={styles.bodyText}>We use your information for the following purposes:</Text>
                        {renderBulletPoint("Providing and maintaining our payment services")}
                        {renderBulletPoint("Processing transactions and managing your account")}
                        {renderBulletPoint("Verifying your identity and preventing fraud")}
                        {renderBulletPoint("Complying with legal and regulatory requirements")}
                        {renderBulletPoint("Improving our services and user experience")}
                        {renderBulletPoint("Sending important notifications and updates")}
                        {renderBulletPoint("Providing customer support and assistance")}
                        {renderBulletPoint("Marketing communications (with your consent)")}
                    </View>
                )}

                {/* Information Sharing */}
                {renderSection("4. Information Sharing and Disclosure",
                    <View>
                        {renderSubSection("4.1 Service Providers",
                            "We share information with trusted third-party service providers who help us deliver our services, including payment processors, banking partners, identity verification services, and cloud storage providers. These providers are contractually obligated to protect your information."
                        )}
                        {renderSubSection("4.2 Legal Requirements",
                            "We may disclose your information when required by law, such as in response to court orders, legal processes, or regulatory requests. We may also share information to prevent fraud, protect our rights, or ensure user safety."
                        )}
                        {renderSubSection("4.3 Business Transfers",
                            "In the event of a merger, acquisition, or sale of our business, your information may be transferred to the new entity, subject to the same privacy protections outlined in this policy."
                        )}
                        {renderSubSection("4.4 With Your Consent",
                            "We may share your information with third parties when you provide explicit consent for specific purposes."
                        )}
                    </View>
                )}

                {/* Data Security */}
                {renderSection("5. Data Security",
                    <View>
                        <Text style={styles.bodyText}>
                            We implement robust security measures to protect your information:
                        </Text>
                        {renderBulletPoint("256-bit SSL encryption for data transmission")}
                        {renderBulletPoint("Advanced encryption for data storage")}
                        {renderBulletPoint("Multi-factor authentication options")}
                        {renderBulletPoint("Regular security audits and updates")}
                        {renderBulletPoint("Access controls and employee training")}
                        {renderBulletPoint("Fraud detection and monitoring systems")}

                        <Text style={[styles.bodyText, { marginTop: SPACING.base }]}>
                            However, no system is 100% secure. We cannot guarantee absolute security but continuously work to maintain the highest security standards.
                        </Text>
                    </View>
                )}

                {/* Data Retention */}
                {renderSection("6. Data Retention",
                    <Text style={styles.bodyText}>
                        We retain your personal information for as long as necessary to provide our services and comply with legal obligations. Specific retention periods include:
                        {'\n\n'}
                        • Account information: Retained while your account is active and for 7 years after closure
                        {'\n'}
                        • Transaction records: Retained for 7 years for regulatory compliance
                        {'\n'}
                        • Marketing communications: Until you unsubscribe or object
                        {'\n'}
                        • Technical logs: Typically retained for 12 months
                        {'\n\n'}
                        You may request deletion of your personal information, subject to legal and regulatory requirements.
                    </Text>
                )}

                {/* Your Rights */}
                {renderSection("7. Your Privacy Rights",
                    <View>
                        <Text style={styles.bodyText}>You have the following rights regarding your personal information:</Text>
                        {renderBulletPoint("Access: Request copies of your personal information")}
                        {renderBulletPoint("Correction: Request correction of inaccurate information")}
                        {renderBulletPoint("Deletion: Request deletion of your personal information")}
                        {renderBulletPoint("Portability: Request transfer of your data to another service")}
                        {renderBulletPoint("Objection: Object to certain processing activities")}
                        {renderBulletPoint("Restriction: Request limitation of processing")}
                        {renderBulletPoint("Withdrawal: Withdraw consent for specific processing")}

                        <Text style={[styles.bodyText, { marginTop: SPACING.base }]}>
                            To exercise these rights, contact us at privacy@hovapay.com. We will respond within 30 days of receiving your request.
                        </Text>
                    </View>
                )}

                {/* Cookies and Tracking */}
                {renderSection("8. Cookies and Tracking Technologies",
                    <Text style={styles.bodyText}>
                        We use cookies and similar technologies to enhance your experience, analyze usage patterns, and improve our services. You can control cookie settings through your browser, but disabling certain cookies may affect app functionality.
                        {'\n\n'}
                        We use the following types of cookies:
                        {'\n'}
                        • Essential cookies for basic app functionality
                        {'\n'}
                        • Analytics cookies to understand user behavior
                        {'\n'}
                        • Preference cookies to remember your settings
                        {'\n'}
                        • Security cookies for fraud prevention
                    </Text>
                )}

                {/* International Transfers */}
                {renderSection("9. International Data Transfers",
                    <Text style={styles.bodyText}>
                        Your information may be transferred to and processed in countries other than Nigeria for service delivery and support. We ensure appropriate safeguards are in place to protect your information during international transfers, including:
                        {'\n\n'}
                        • Adequacy decisions from relevant authorities
                        {'\n'}
                        • Standard contractual clauses
                        {'\n'}
                        • Binding corporate rules
                        {'\n'}
                        • Certification schemes and codes of conduct
                    </Text>
                )}

                {/* Children's Privacy */}
                {renderSection("10. Children's Privacy",
                    <Text style={styles.bodyText}>
                        Our services are not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware that we have collected personal information from a child under 18, we will take steps to delete such information promptly.
                        {'\n\n'}
                        If you are a parent or guardian and believe your child has provided personal information to us, please contact us immediately.
                    </Text>
                )}

                {/* Changes to Privacy Policy */}
                {renderSection("11. Changes to This Privacy Policy",
                    <Text style={styles.bodyText}>
                        We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. We will notify you of material changes by:
                        {'\n\n'}
                        • Sending an email notification
                        {'\n'}
                        • Displaying a prominent notice in the app
                        {'\n'}
                        • Updating the "Last updated" date at the top of this policy
                        {'\n\n'}
                        Your continued use of our services after such notification constitutes acceptance of the updated policy.
                    </Text>
                )}

                {/* Contact Information */}
                {renderSection("12. Contact Us",
                    <View>
                        <Text style={styles.bodyText}>
                            If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                        </Text>
                        <View style={styles.contactInfo}>
                            <TouchableOpacity
                                style={styles.contactItem}
                                onPress={() => Linking.openURL('mailto:privacy@hovapay.com')}
                            >
                                <MaterialIcons name="email" size={20} color={COLORS.primary} />
                                <Text style={styles.contactText}>privacy@hovapay.com</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.contactItem}
                                onPress={() => Linking.openURL('tel:+2348000000000')}
                            >
                                <MaterialIcons name="phone" size={20} color={COLORS.primary} />
                                <Text style={styles.contactText}>+234 800 000 0000</Text>
                            </TouchableOpacity>
                            <View style={styles.contactItem}>
                                <MaterialIcons name="location-on" size={20} color={COLORS.primary} />
                                <Text style={styles.contactText}>
                                    Data Protection Officer{'\n'}
                                    Hovapay Limited{'\n'}
                                    Port Harcourt, Nigeria
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        © 2025 Hovapay Limited. All rights reserved.
                    </Text>
                    <Text style={styles.footerSubtext}>
                        Your privacy is our priority. We are committed to protecting your personal information.
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
    headerDescription: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.withOpacity(COLORS.textInverse, 0.9),
        textAlign: 'center',
        marginTop: SPACING.base,
        lineHeight: 24,
    },
    content: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: RADIUS['2xl'],
        borderTopRightRadius: RADIUS['2xl'],
        marginTop: -SPACING.base,
        paddingTop: SPACING.xl,
    },
    lastUpdated: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
        paddingHorizontal: SPACING.xl,
    },
    lastUpdatedText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.textTertiary,
        marginLeft: SPACING.xs,
        fontStyle: 'italic',
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
    subSection: {
        marginBottom: SPACING.base,
    },
    subSectionTitle: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        fontWeight: TYPOGRAPHY.fontWeights.semibold,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    bodyText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        lineHeight: 24,
    },
    bulletPoint: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
        paddingLeft: SPACING.base,
    },
    bulletDot: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.primary,
        marginRight: SPACING.sm,
        marginTop: 2,
    },
    bulletText: {
        fontSize: TYPOGRAPHY.fontSizes.base,
        color: COLORS.textSecondary,
        lineHeight: 24,
        flex: 1,
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
    },
    footerSubtext: {
        fontSize: TYPOGRAPHY.fontSizes.xs,
        color: COLORS.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
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