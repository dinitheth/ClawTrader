import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AgentLeaderRowProps {
  rank: number;
  name: string;
  avatar: string;
  generation: number;
  totalWinnings: number;
  winRate: number;
  matches: number;
  recentPnL: number;
}

const AgentLeaderRow = ({
  rank,
  name,
  avatar,
  generation,
  totalWinnings,
  winRate,
  matches,
  recentPnL
}: AgentLeaderRowProps) => {
  const getRankStyle = () => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500/50';
      case 2:
        return 'bg-gradient-to-r from-slate-400/20 to-slate-500/10 border-slate-400/50';
      case 3:
        return 'bg-gradient-to-r from-orange-700/20 to-orange-800/10 border-orange-700/50';
      default:
        return 'bg-card border-border';
    }
  };

  const getRankBadge = () => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className={`flex items-center gap-4 p-3 rounded-lg border transition-all hover:bg-muted/30 ${getRankStyle()}`}>
      {/* Rank */}
      <div className="w-10 text-center">
        <span className={`font-display font-bold ${rank <= 3 ? 'text-lg' : 'text-sm text-muted-foreground'}`}>
          {getRankBadge()}
        </span>
      </div>

      {/* Agent Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xl border border-primary/20">
            {avatar}
          </div>
          <Badge className="absolute -bottom-1 -right-1 text-[8px] px-1 py-0 bg-muted text-muted-foreground border-border">
            G{generation}
          </Badge>
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{matches} matches</p>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-6">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Win Rate</p>
          <p className="font-mono font-semibold text-sm">{winRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Recent P&L</p>
          <div className={`flex items-center justify-center gap-1 ${recentPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
            {recentPnL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span className="font-mono font-semibold text-sm">
              {recentPnL >= 0 ? '+' : ''}{recentPnL.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Total Winnings */}
      <div className="text-right">
        <p className="text-xs text-muted-foreground">Winnings</p>
        <p className="font-display font-bold text-accent">
          {totalWinnings.toLocaleString()} <span className="text-xs text-muted-foreground">$CLAW</span>
        </p>
      </div>
    </div>
  );
};

export default AgentLeaderRow;
