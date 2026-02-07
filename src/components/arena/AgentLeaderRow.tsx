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
        return 'bg-primary/5';
      case 2:
        return 'bg-muted/50';
      case 3:
        return 'bg-muted/30';
      default:
        return 'bg-transparent';
    }
  };

  const getRankColor = () => {
    switch (rank) {
      case 1:
        return 'text-primary font-bold';
      case 2:
        return 'text-foreground font-semibold';
      case 3:
        return 'text-foreground font-semibold';
      default:
        return 'text-muted-foreground font-medium';
    }
  };

  return (
    <div className={`flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl transition-colors hover:bg-muted/50 ${getRankStyle()}`}>
      {/* Rank */}
      <div className="w-8 text-center flex-shrink-0">
        <span className={`text-sm md:text-base ${getRankColor()}`}>
          {rank}
        </span>
      </div>

      {/* Agent Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-muted flex items-center justify-center text-xl border border-border">
            {avatar}
          </div>
          <Badge className="absolute -bottom-1 -right-1 text-[8px] px-1 py-0 bg-background text-muted-foreground border border-border">
            G{generation}
          </Badge>
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{matches} matches</p>
        </div>
      </div>

      {/* Stats - Desktop only */}
      <div className="hidden sm:flex items-center gap-6">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Win Rate</p>
          <p className="font-medium text-sm tabular-nums">{winRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-0.5">P&L</p>
          <div className={`flex items-center justify-center gap-1 ${recentPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
            {recentPnL >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span className="font-medium text-sm tabular-nums">
              {recentPnL >= 0 ? '+' : ''}{recentPnL.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Total Winnings */}
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-muted-foreground hidden sm:block mb-0.5">Winnings</p>
        <p className="font-semibold text-sm text-primary tabular-nums">
          {totalWinnings >= 1000 
            ? `${(totalWinnings / 1000).toFixed(1)}K` 
            : totalWinnings.toLocaleString()
          }
          <span className="text-xs text-muted-foreground ml-1 font-normal">CLAW</span>
        </p>
      </div>
    </div>
  );
};

export default AgentLeaderRow;
