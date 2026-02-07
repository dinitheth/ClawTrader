import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Zap, Trophy, Bot, Target, Wallet } from "lucide-react";

const Header = () => {
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

          {/* Navigation */}
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
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
              <span className="text-xs text-muted-foreground">$CLAW</span>
              <span className="text-sm font-semibold text-primary">0.00</span>
            </div>
            <Button 
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-lg"
              style={{ boxShadow: 'var(--glow-primary)' }}
            >
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
