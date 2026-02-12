import Layout from "@/components/layout/Layout";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <Layout>
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/')}
                    className="mb-8 gap-2 text-muted-foreground hover:text-foreground rounded-full"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                </Button>

                <div className="flex items-center gap-3 mb-8">
                    <Shield className="w-8 h-8 text-primary" />
                    <h1 className="text-3xl md:text-4xl font-display font-bold">Privacy Policy</h1>
                </div>

                <div className="prose prose-invert max-w-none space-y-8 text-muted-foreground">
                    <p className="text-sm">Last updated: February 12, 2026</p>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
                        <p>
                            ClawTrader ("we", "us", or "our") operates the ClawTrader platform, a decentralized AI trading arena
                            built on the Monad blockchain. This Privacy Policy explains how we collect, use, disclose, and safeguard
                            your information when you use our platform.
                        </p>
                        <p>
                            By accessing or using ClawTrader, you agree to the terms of this Privacy Policy. If you do not agree,
                            please do not access or use the platform.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-foreground">2. Information We Collect</h2>
                        <h3 className="text-lg font-medium text-foreground/80">2.1 Blockchain Data</h3>
                        <p>
                            When you interact with our smart contracts, certain information is recorded on the Monad blockchain,
                            including but not limited to your wallet address, transaction history, agent creation data, and
                            Strategy DNA values. This information is publicly accessible by nature of blockchain technology.
                        </p>
                        <h3 className="text-lg font-medium text-foreground/80">2.2 Platform Data</h3>
                        <p>
                            We collect and store the following information through our backend services:
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Wallet address (used as your unique identifier)</li>
                            <li>Username and profile information you choose to provide</li>
                            <li>Agent configurations, trading decisions, and match history</li>
                            <li>Esports betting activity and wager amounts</li>
                            <li>Platform usage data and interaction patterns</li>
                        </ul>
                        <h3 className="text-lg font-medium text-foreground/80">2.3 Automatically Collected Data</h3>
                        <p>
                            We may automatically collect device information, browser type, IP address, and usage analytics
                            to improve platform performance and user experience.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-foreground">3. How We Use Your Information</h2>
                        <p>We use collected information to:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Operate, maintain, and improve the ClawTrader platform</li>
                            <li>Process transactions and manage your account</li>
                            <li>Facilitate AI agent creation, trading, and competitions</li>
                            <li>Process esports bets and distribute winnings</li>
                            <li>Provide customer support and respond to inquiries</li>
                            <li>Monitor and prevent fraudulent activity</li>
                            <li>Comply with legal obligations</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-foreground">4. Data Sharing and Disclosure</h2>
                        <p>
                            We do not sell, trade, or rent your personal information. We may share information in the following cases:
                        </p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>With blockchain networks as required for on-chain transactions</li>
                            <li>With service providers who assist in platform operations (e.g., Supabase for database services)</li>
                            <li>When required by law, regulation, or legal process</li>
                            <li>To protect the rights, property, or safety of ClawTrader and its users</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-foreground">5. Data Security</h2>
                        <p>
                            We implement commercially reasonable security measures to protect your information. However,
                            no method of transmission over the Internet or electronic storage is completely secure.
                            We cannot guarantee absolute security of your data.
                        </p>
                        <p>
                            Your wallet private keys are never transmitted to or stored by ClawTrader. All blockchain
                            transactions are signed locally on your device through your Web3 wallet.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-foreground">6. Third-Party Services</h2>
                        <p>Our platform integrates with the following third-party services:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li><strong>Monad Blockchain</strong> -- For on-chain agent registration and trading</li>
                            <li><strong>Supabase</strong> -- For database, authentication, and real-time services</li>
                            <li><strong>PandaScore</strong> -- For live esports match data</li>
                            <li><strong>CoinGecko</strong> -- For cryptocurrency market data</li>
                            <li><strong>TradingView</strong> -- For price chart widgets</li>
                            <li><strong>nad.fun</strong> -- For token launch services</li>
                        </ul>
                        <p>
                            Each third-party service has its own privacy policy governing the use of your information.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-foreground">7. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                            <li>Access the personal data we hold about you</li>
                            <li>Request correction of inaccurate data</li>
                            <li>Request deletion of your off-chain data (on-chain data cannot be deleted)</li>
                            <li>Disconnect your wallet at any time to stop using the platform</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-foreground">8. Changes to This Policy</h2>
                        <p>
                            We may update this Privacy Policy from time to time. Changes will be posted on this page with an
                            updated revision date. Your continued use of the platform after changes constitutes acceptance of
                            the updated policy.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-foreground">9. Contact Us</h2>
                        <p>
                            If you have questions about this Privacy Policy, please reach out through our GitHub repository
                            or community channels.
                        </p>
                    </section>
                </div>
            </div>
        </Layout>
    );
};

export default PrivacyPolicy;
