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
        return 'bg-primary/5 border-primary/20';
      case 2:
        return 'bg-muted/50 border-muted-foreground/20';
      case 3:
        return 'bg-secondary/5 border-secondary/20';
      default:
        return 'bg-transparent border-transparent';
    }
  };

  const getRankBadge = () => {
    switch (rank) {
      case 1:
        return '1';
      case 2:
        return '2';
      case 3:
        return '3';
      default:
        return `${rank}`;
    }
  };

  const getRankColor = () => {
    switch (rank) {
      case 1:
        return 'text-primary';
      case 2:
        return 'text-muted-foreground';
      case 3:
        return 'text-secondary';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className={`flex items-center gap-2 md:gap-4 p-2 md:p-3 rounded-lg border transition-colors hover:bg-muted/30 ${getRankStyle()}`}>
      {/* Rank */}
      <div className="w-6 md:w-8 text-center flex-shrink-0">
        <span className={`font-semibold text-sm md:text-base ${getRankColor()}`}>
          {getRankBadge()}
        </span>
      </div>

      {/* Agent Info */}
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-muted flex items-center justify-center text-base md:text-xl border border-border">
            {avatar}
          </div>
          <Badge className="absolute -bottom-1 -right-1 text-[7px] md:text-[8px] px-0.5 md:px-1 py-0 bg-muted text-muted-foreground border-border">
            G{generation}
          </Badge>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-xs md:text-sm truncate">{name}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground">{matches} matches</p>
        </div>
      </div>

      {/* Stats - Desktop only */}
      <div className="hidden sm:flex items-center gap-4 md:gap-6">
        <div className="text-center">
          <p className="text-[10px] md:text-xs text-muted-foreground">Win Rate</p>
          <p className="font-mono font-medium text-xs md:text-sm">{winRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] md:text-xs text-muted-foreground">P&L</p>
          <div className={`flex items-center justify-center gap-0.5 ${recentPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
            {recentPnL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span className="font-mono font-medium text-xs md:text-sm">
              {recentPnL >= 0 ? '+' : ''}{recentPnL.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Total Winnings */}
      <div className="text-right flex-shrink-0">
        <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">Winnings</p>
        <p className="font-medium text-xs md:text-sm text-secondary">
          {totalWinnings >= 1000 
            ? `${(totalWinnings / 1000).toFixed(1)}K` 
            : totalWinnings.toLocaleString()
          }
          <span className="text-[10px] md:text-xs text-muted-foreground ml-1">CLAW</span>
        </p>
      </div>
    </div>
  );
};

export default AgentLeaderRow;
