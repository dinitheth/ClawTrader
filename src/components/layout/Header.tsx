import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Zap, Trophy, Bot, Target, Wallet, Menu, X } from "lucide-react";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useState, useCallback } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const Header = () => {
  const { isConnected } = useAccount();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group" onClick={closeMobileMenu}>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-foreground flex items-center justify-center">
              <span className="text-lg md:text-xl font-bold text-background">C</span>
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
          <nav className="hidden md:flex items-center gap-0.5">
            <NavLink
              to="/"
              className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground bg-muted"
            >
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Arena
              </span>
            </NavLink>
            <NavLink
              to="/leaderboard"
              className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground bg-muted"
            >
              <span className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Leaderboard
              </span>
            </NavLink>
            <NavLink
              to="/agents"
              className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground bg-muted"
            >
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                My Agents
              </span>
            </NavLink>
            <NavLink
              to="/betting"
              className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              activeClassName="text-foreground bg-muted"
            >
              <span className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                Betting
              </span>
            </NavLink>
          </nav>

          {/* Right side - Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {isConnected && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
                <span className="text-xs text-muted-foreground">CLAW</span>
                <span className="text-sm font-medium">1,000</span>
              </div>
            )}
            
            <ThemeToggle />
            
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
                            className="gap-2 rounded-full px-4"
                          >
                            <Wallet className="w-4 h-4" />
                            Connect
                          </Button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <Button onClick={openChainModal} variant="destructive" size="sm" className="rounded-full">
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
                            className="gap-1.5 hidden lg:flex rounded-full"
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
                            className="gap-2 rounded-full"
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

          {/* Mobile: Theme toggle + Menu */}
          <div className="flex md:hidden items-center gap-1">
            <ThemeToggle />
            <button 
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors rounded-full"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <nav className="container mx-auto px-4 py-4 space-y-1">
            <NavLink
              to="/"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              activeClassName="text-foreground bg-muted"
            >
              <Zap className="w-5 h-5" />
              Arena
            </NavLink>
            <NavLink
              to="/leaderboard"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              activeClassName="text-foreground bg-muted"
            >
              <Trophy className="w-5 h-5" />
              Leaderboard
            </NavLink>
            <NavLink
              to="/agents"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              activeClassName="text-foreground bg-muted"
            >
              <Bot className="w-5 h-5" />
              My Agents
            </NavLink>
            <NavLink
              to="/betting"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              activeClassName="text-foreground bg-muted"
            >
              <Target className="w-5 h-5" />
              Betting
            </NavLink>
            <div className="pt-4 border-t border-border/50">
              <ConnectButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
