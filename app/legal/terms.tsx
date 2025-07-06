// app/legal/terms.tsx - Terms & Conditions Page
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

export default function TermsConditionsScreen() {
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
                    <Text style={styles.headerTitle}>Terms & Conditions</Text>
                    <View style={styles.placeholder} />
                </View>

                <View style={styles.headerInfo}>
                    <MaterialIcons name="description" size={48} color={COLORS.textInverse} />
                    <Text style={styles.headerDescription}>
                        Legal terms governing your use of Hovapay services
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
                {renderSection("1. Introduction and Acceptance",
                    <Text style={styles.bodyText}>
                        Welcome to Hovapay! These Terms and Conditions constitute a legally binding agreement between you and Hovapay Limited, a financial technology company incorporated under the laws of the Federal Republic of Nigeria.
                        {'\n\n'}
                        By accessing, downloading, installing, or using the Hovapay mobile application or any of our services, you acknowledge that you have read, understood, and agree to be bound by these Terms.
                        {'\n\n'}
                        You must be at least 18 years old and a legal resident of Nigeria to use our services.
                    </Text>
                )}

                {/* Service Description */}
                {renderSection("2. Service Description",
                    <View>
                        <Text style={styles.bodyText}>
                            Hovapay is a digital financial platform that provides:
                        </Text>
                        {renderBulletPoint("Digital wallet services for storing and managing electronic funds")}
                        {renderBulletPoint("Bill payment services (airtime, data, electricity, cable TV)")}
                        {renderBulletPoint("Money transfer services between Hovapay users")}
                        {renderBulletPoint("Virtual account services for funding your wallet")}
                        {renderBulletPoint("Transaction history and financial reporting")}
                        {renderBulletPoint("Customer support and account management")}
                    </View>
                )}

                {/* Account Registration */}
                {renderSection("3. Account Registration and Verification",
                    <View>
                        {renderSubSection("3.1 Account Creation",
                            "To use Hovapay services, you must create an account by providing accurate, complete, and current information including your full name, phone number, email address, and other required details."
                        )}
                        {renderSubSection("3.2 Identity Verification",
                            "In compliance with Nigerian financial regulations, we may require identity verification including government-issued identification, proof of address, and other documentation."
                        )}
                        {renderSubSection("3.3 Account Security",
                            "You are responsible for maintaining the confidentiality of your account credentials and must immediately notify us of any unauthorized access or suspicious activity."
                        )}
                    </View>
                )}

                {/* Digital Wallet Services */}
                {renderSection("4. Digital Wallet Services",
                    <View>
                        {renderSubSection("4.1 Wallet Functionality",
                            "Your Hovapay digital wallet allows you to store Nigerian Naira electronically, receive funds, send money, pay bills, and view transaction history."
                        )}
                        {renderSubSection("4.2 Funding Methods",
                            "You may add funds through bank transfers, debit card payments, virtual account deposits, or transfers from other users. All funding sources must be in your name."
                        )}
                        {renderSubSection("4.3 Transaction Limits",
                            "Transaction limits apply based on your verification tier: Tier 1 (₦50,000 daily), Tier 2 (₦200,000 daily), and Tier 3 (₦1,000,000 daily)."
                        )}
                    </View>
                )}

                {/* Acceptable Use */}
                {renderSection("5. Acceptable Use Policy",
                    <View>
                        <Text style={styles.bodyText}>You agree not to use Hovapay services for:</Text>
                        {renderBulletPoint("Illegal activities or transactions prohibited by Nigerian law")}
                        {renderBulletPoint("Money laundering, terrorist financing, or other financial crimes")}
                        {renderBulletPoint("Fraudulent, deceptive, or misleading practices")}
                        {renderBulletPoint("Transactions involving prohibited goods or services")}
                        {renderBulletPoint("Circumventing security measures or accessing unauthorized systems")}
                        {renderBulletPoint("Creating multiple accounts to evade limits or restrictions")}
                    </View>
                )}

                {/* Fees and Charges */}
                {renderSection("6. Fees and Charges",
                    <View>
                        {renderSubSection("6.1 Service Fees",
                            "Hovapay may charge fees for certain services including transactions, transfers, and bill payments. All applicable fees are displayed before transaction completion."
                        )}
                        {renderSubSection("6.2 Fee Changes",
                            "We reserve the right to modify fees with 30 days advance notice through email or in-app notifications."
                        )}
                        {renderSubSection("6.3 Third-Party Charges",
                            "You may incur charges from third parties such as mobile network operators or banks. These charges are separate from Hovapay fees."
                        )}
                        {renderSubSection("6.4 Refunds",
                            "Failed transactions are typically reversed automatically. Successful transactions are generally final, but refunds may be processed at our discretion."
                        )}
                    </View>
                )}

                {/* Security and Fraud Prevention */}
                {renderSection("7. Security and Fraud Prevention",
                    <View>
                        {renderSubSection("7.1 Account Security",
                            "You must protect your account credentials, transaction PIN, and device access. Enable security features including two-factor authentication where available."
                        )}
                        {renderSubSection("7.2 Fraud Monitoring",
                            "We employ automated systems to detect and prevent fraudulent transactions. We may suspend accounts or transactions pending investigation."
                        )}
                        {renderSubSection("7.3 Unauthorized Transactions",
                            "Report unauthorized access within 24 hours to limit liability. You are liable for unauthorized transactions resulting from your negligence."
                        )}
                    </View>
                )}

                {/* Privacy and Data Protection */}
                {renderSection("8. Privacy and Data Protection",
                    <View>
                        <Text style={styles.bodyText}>
                            Your privacy is important to us. Our Privacy Policy explains how we collect, use, protect, and share your information.
                        </Text>
                        <TouchableOpacity
                            style={styles.linkButton}
                            onPress={() => router.push('/legal/privacy')}
                        >
                            <Text style={styles.linkText}>View Privacy Policy</Text>
                            <MaterialIcons name="arrow-forward" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Service Availability */}
                {renderSection("9. Service Availability",
                    <Text style={styles.bodyText}>
                        We strive to maintain high service availability but cannot guarantee uninterrupted access. Services may be temporarily unavailable for maintenance, updates, or due to circumstances beyond our control. We are not liable for delays or service interruptions.
                    </Text>
                )}

                {/* Limitation of Liability */}
                {renderSection("10. Limitation of Liability",
                    <Text style={styles.bodyText}>
                        TO THE MAXIMUM EXTENT PERMITTED BY NIGERIAN LAW:
                        {'\n\n'}
                        • Hovapay's total liability for all claims shall not exceed the fees paid by you in the twelve months preceding the claim
                        {'\n\n'}
                        • We are not liable for indirect, incidental, special, consequential, or punitive damages
                        {'\n\n'}
                        • We do not guarantee the accuracy of third-party services integrated with our platform
                        {'\n\n'}
                        • Our liability is limited to direct damages actually incurred and proven by you
                    </Text>
                )}

                {/* Intellectual Property */}
                {renderSection("11. Intellectual Property Rights",
                    <Text style={styles.bodyText}>
                        All content, features, and functionality of Hovapay services are the exclusive property of Hovapay or our licensors and are protected by Nigerian and international intellectual property laws.
                        {'\n\n'}
                        You are granted a limited, non-exclusive license to use our services for personal purposes only. You may not copy, modify, distribute, or create derivative works without our written consent.
                    </Text>
                )}

                {/* Account Suspension and Termination */}
                {renderSection("12. Account Suspension and Termination",
                    <View>
                        {renderSubSection("12.1 Suspension by Hovapay",
                            "We may suspend your account immediately if you violate these Terms, engage in suspicious activity, or for regulatory compliance reasons."
                        )}
                        {renderSubSection("12.2 Termination by Hovapay",
                            "We may terminate your account with 30 days notice for business reasons or immediately for material breaches of these Terms."
                        )}
                        {renderSubSection("12.3 Termination by You",
                            "You may close your account at any time by contacting customer support. You remain liable for all charges incurred before termination."
                        )}
                        {renderSubSection("12.4 Effect of Termination",
                            "Upon termination, we will cooperate to return any remaining account balance to you, subject to applicable laws and pending investigations."
                        )}
                    </View>
                )}

                {/* Dispute Resolution */}
                {renderSection("13. Dispute Resolution",
                    <View>
                        {renderSubSection("13.1 Customer Support",
                            "For service-related issues, first contact our customer support team. We strive to resolve most issues quickly through our support process."
                        )}
                        {renderSubSection("13.2 Formal Complaints",
                            "If customer support cannot resolve your issue, you may file a formal complaint. We will investigate and respond within 30 days."
                        )}
                        {renderSubSection("13.3 Legal Proceedings",
                            "Any legal disputes shall be resolved through the Nigerian court system. This agreement is governed by Nigerian law."
                        )}
                    </View>
                )}

                {/* Regulatory Compliance */}
                {renderSection("14. Regulatory Compliance",
                    <Text style={styles.bodyText}>
                        Hovapay operates under Nigerian financial regulatory authorities. We comply with applicable laws including Central Bank of Nigeria guidelines, Nigeria Data Protection Regulation, Anti-Money Laundering laws, and consumer protection regulations.
                        {'\n\n'}
                        You agree to comply with all applicable laws and cooperate with regulatory requirements.
                    </Text>
                )}

                {/* Changes to Terms */}
                {renderSection("15. Changes to These Terms",
                    <Text style={styles.bodyText}>
                        We reserve the right to modify these Terms at any time. We will notify you of material changes by email notification and in-app notices.
                        {'\n\n'}
                        Your continued use of our services after notification constitutes acceptance of the modified Terms. If you do not agree to changes, you must stop using our services.
                    </Text>
                )}

                {/* Miscellaneous */}
                {renderSection("16. Miscellaneous Provisions",
                    <View>
                        {renderSubSection("16.1 Entire Agreement",
                            "These Terms, together with our Privacy Policy, constitute the entire agreement between you and Hovapay regarding our services."
                        )}
                        {renderSubSection("16.2 Severability",
                            "If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect."
                        )}
                        {renderSubSection("16.3 Assignment",
                            "You may not assign your rights under these Terms without our written consent. We may assign our rights to any affiliate or successor entity."
                        )}
                    </View>
                )}

                {/* Contact Information */}
                {renderSection("17. Contact Information",
                    <View>
                        <Text style={styles.bodyText}>
                            For questions about these Terms or legal matters, please contact us:
                        </Text>
                        <View style={styles.contactInfo}>
                            <TouchableOpacity
                                style={styles.contactItem}
                                onPress={() => Linking.openURL('mailto:legal@hovapay.com')}
                            >
                                <MaterialIcons name="email" size={20} color={COLORS.primary} />
                                <Text style={styles.contactText}>legal@hovapay.com</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.contactItem}
                                onPress={() => Linking.openURL('mailto:compliance@hovapay.com')}
                            >
                                <MaterialIcons name="email" size={20} color={COLORS.primary} />
                                <Text style={styles.contactText}>compliance@hovapay.com</Text>
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
                                    Legal Department{'\n'}
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
                        Licensed financial service provider regulated by the Central Bank of Nigeria
                    </Text>
                    <Text style={styles.footerSubtext}>
                        Making digital payments simple, secure, and accessible for all Nigerians
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
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: COLORS.primaryBackground,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        marginTop: SPACING.base,
    },
    linkText: {
        fontSize: TYPOGRAPHY.fontSizes.sm,
        color: COLORS.primary,
        fontWeight: TYPOGRAPHY.fontWeights.medium,
        marginRight: SPACING.xs,
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