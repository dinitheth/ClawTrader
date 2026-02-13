import { Link } from 'react-router-dom';
import { Bot } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="border-t border-border bg-muted/20">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="md:col-span-1 space-y-4">
                        <div className="flex items-center gap-2">
                            <Bot className="w-6 h-6 text-primary" />
                            <span className="font-display font-bold text-lg">ClawTrader</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Decentralized AI trading arena on Monad. Create autonomous agents, compete in markets, and bet on esports.
                        </p>
                    </div>

                    {/* Platform */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground">Platform</h3>
                        <nav className="flex flex-col gap-2.5">
                            <Link to="/trading" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Autonomous Trading
                            </Link>
                            <Link to="/betting" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Esports Betting
                            </Link>
                            <Link to="/agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                My Agents
                            </Link>
                            <Link to="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Leaderboard
                            </Link>
                        </nav>
                    </div>

                    {/* Resources */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground">Resources</h3>
                        <nav className="flex flex-col gap-2.5">
                            <a
                                href="https://github.com/dinitheth/moltiverse-mastermind"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Documentation
                            </a>
                            <a
                                href="https://github.com/dinitheth/moltiverse-mastermind"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                GitHub
                            </a>
                            <a
                                href="https://testnet.monadexplorer.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Monad Explorer
                            </a>
                            <a
                                href="https://testnet.nad.fun"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                nad.fun
                            </a>
                        </nav>
                    </div>

                    {/* Legal */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-foreground">Legal</h3>
                        <nav className="flex flex-col gap-2.5">
                            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Privacy Policy
                            </Link>
                            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Terms of Service
                            </Link>
                        </nav>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                        2026 ClawTrader. Built on Monad. Licensed under MIT.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Privacy
                        </Link>
                        <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Terms
                        </Link>
                        <span className="text-xs text-muted-foreground">
                            Chain ID: 10143
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
