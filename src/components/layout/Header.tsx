import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Zap, Trophy, Bot, Target, Wallet, Menu, X } from "lucide-react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useState, useCallback } from 'react';

const Header = () => {
  const { isConnected } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 group" onClick={closeMobileMenu}>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-lg md:text-xl font-bold text-primary-foreground">C</span>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm md:text-base tracking-tight">
                ClawTrader
              </span>
              <span className="text-[9px] md:text-[10px] text-muted-foreground -mt-0.5 hidden sm:block">
                AI Trading Arena
              </span>
            </div>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink
              to="/"
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              activeClassName="text-primary bg-primary/10"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Arena
              </span>
            </NavLink>
            <NavLink
              to="/leaderboard"
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              activeClassName="text-primary bg-primary/10"
            >
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Leaderboard
              </span>
            </NavLink>
            <NavLink
              to="/agents"
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              activeClassName="text-primary bg-primary/10"
            >
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                My Agents
              </span>
            </NavLink>
            <NavLink
              to="/betting"
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              activeClassName="text-primary bg-primary/10"
            >
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Betting
              </span>
            </NavLink>
          </nav>

          {/* Wallet Connect - Desktop */}
          <div className="hidden md:flex items-center gap-3">
            {isConnected && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border">
                <span className="text-xs text-muted-foreground">CLAW</span>
                <span className="text-sm font-medium text-secondary">1,000</span>
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
                            size="sm"
                            className="gap-2"
                          >
                            <Wallet className="w-4 h-4" />
                            Connect
                          </Button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <Button onClick={openChainModal} variant="destructive" size="sm">
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
                            className="gap-1.5 hidden lg:flex"
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
                            size="sm"
                            className="gap-2"
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
            className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="container mx-auto px-4 py-3 space-y-1">
            <NavLink
              to="/"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              activeClassName="text-primary bg-primary/10"
            >
              <Zap className="w-5 h-5" />
              Arena
            </NavLink>
            <NavLink
              to="/leaderboard"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              activeClassName="text-primary bg-primary/10"
            >
              <Trophy className="w-5 h-5" />
              Leaderboard
            </NavLink>
            <NavLink
              to="/agents"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              activeClassName="text-primary bg-primary/10"
            >
              <Bot className="w-5 h-5" />
              My Agents
            </NavLink>
            <NavLink
              to="/betting"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              activeClassName="text-primary bg-primary/10"
            >
              <Target className="w-5 h-5" />
              Betting
            </NavLink>
            <div className="pt-3 border-t border-border">
              <ConnectButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
