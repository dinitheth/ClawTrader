import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Zap, Trophy, Bot, Target, Wallet, Menu, X } from "lucide-react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useState } from 'react';

const Header = () => {
  const { isConnected } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-pulse">
                <span className="text-xl font-display font-bold text-primary-foreground">🦞</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg tracking-wider text-gradient-primary">
                CLAWTRADER
              </span>
              <span className="text-[10px] text-muted-foreground -mt-1 tracking-widest">
                AI TRADING ARENA
              </span>
            </div>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              activeClassName="text-primary bg-primary/10"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Arena
              </span>
            </NavLink>
            <NavLink
              to="/leaderboard"
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              activeClassName="text-primary bg-primary/10"
            >
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Leaderboard
              </span>
            </NavLink>
            <NavLink
              to="/agents"
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              activeClassName="text-primary bg-primary/10"
            >
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                My Agents
              </span>
            </NavLink>
            <NavLink
              to="/betting"
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              activeClassName="text-primary bg-primary/10"
            >
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Betting
              </span>
            </NavLink>
          </nav>

          {/* Wallet Connect */}
          <div className="hidden md:flex items-center gap-3">
            {isConnected && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                <span className="text-xs text-muted-foreground">$CLAW</span>
                <span className="text-sm font-semibold text-primary">1,000</span>
              </div>
            )}
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <Button 
                            onClick={openConnectModal}
                            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg"
                            style={{ boxShadow: 'var(--glow-primary)' }}
                          >
                            <Wallet className="w-4 h-4" />
                            Connect Wallet
                          </Button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <Button onClick={openChainModal} variant="destructive">
                            Wrong network
                          </Button>
                        );
                      }

                      return (
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={openChainModal}
                            variant="outline"
                            size="sm"
                            className="gap-1"
                          >
                            {chain.hasIcon && chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                className="w-4 h-4"
                              />
                            )}
                            {chain.name}
                          </Button>

                          <Button
                            onClick={openAccountModal}
                            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                          >
                            {account.displayName}
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg">
          <nav className="container mx-auto px-4 py-4 space-y-2">
            <NavLink
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
              activeClassName="text-primary bg-primary/10"
            >
              <Zap className="w-5 h-5" />
              Arena
            </NavLink>
            <NavLink
              to="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
              activeClassName="text-primary bg-primary/10"
            >
              <Trophy className="w-5 h-5" />
              Leaderboard
            </NavLink>
            <NavLink
              to="/agents"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
              activeClassName="text-primary bg-primary/10"
            >
              <Bot className="w-5 h-5" />
              My Agents
            </NavLink>
            <NavLink
              to="/betting"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
              activeClassName="text-primary bg-primary/10"
            >
              <Target className="w-5 h-5" />
              Betting
            </NavLink>
            <div className="pt-2">
              <ConnectButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
