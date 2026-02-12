import { NavLink } from "@/components/NavLink";
import { Zap, Trophy, Bot, Target, Menu, X, Activity, RefreshCw } from "lucide-react";
import { useState, useCallback } from 'react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { FaucetButton } from '@/components/header/FaucetButton';
import { useAccount } from 'wagmi';
import { CONTRACTS } from '@/lib/contracts';
import SwapModal from '@/components/swap/SwapModal';


const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <>
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
              <NavLink
                to="/trading"
                className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                activeClassName="text-foreground bg-muted"
              >
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Trading
                </span>
              </NavLink>
            </nav>

            {/* Right side - Desktop */}
            <div className="hidden md:flex items-center gap-2">
              {/* Swap Button */}
              <button
                onClick={() => setSwapModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 text-xs font-semibold text-orange-400 hover:from-orange-500/30 hover:to-yellow-500/30 transition-all hover:scale-105"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Swap
              </button>
              <FaucetButton />
              <ThemeToggle />
              <ConnectButton />
            </div>

            {/* Mobile: Theme toggle + Faucet + Menu */}
            <div className="flex md:hidden items-center gap-1">
              {/* Mobile Swap Button */}
              <button
                onClick={() => setSwapModalOpen(true)}
                className="p-2 text-orange-400 hover:text-orange-300 transition-colors rounded-full"
                title="Swap USDC → CLAW"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <FaucetButton />
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
              <NavLink
                to="/trading"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                activeClassName="text-foreground bg-muted"
              >
                <Activity className="w-5 h-5" />
                Trading
              </NavLink>
              {/* Mobile Swap Button */}
              <button
                onClick={() => { closeMobileMenu(); setSwapModalOpen(true); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-colors w-full"
              >
                <RefreshCw className="w-5 h-5" />
                Swap USDC → CLAW
              </button>
              <div className="pt-4 border-t border-border/50">
                <ConnectButton />
              </div>
            </nav>
          </div>
        )}

        {/* Swap Modal - outside header to avoid backdrop-blur stacking context */}
      </header>
      <SwapModal isOpen={swapModalOpen} onClose={() => setSwapModalOpen(false)} />
    </>
  );
};

export default Header;
