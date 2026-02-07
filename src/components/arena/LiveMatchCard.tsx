import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Zap, Clock } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  generation: number;
  avatar: string;
  pnl: number;
  winRate: number;
}

interface LiveMatchCardProps {
  matchId: string;
  agent1: Agent;
  agent2: Agent;
  timeRemaining: number;
  totalPot: number;
  isLive?: boolean;
}

const LiveMatchCard = ({ 
  matchId, 
  agent1, 
  agent2, 
  timeRemaining, 
  totalPot,
  isLive = true 
}: LiveMatchCardProps) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return "text-success";
    if (pnl < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const getPnLIcon = (pnl: number) => {
    if (pnl > 0) return <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />;
    if (pnl < 0) return <TrendingDown className="w-3 h-3 md:w-4 md:h-4" />;
    return null;
  };

  return (
    <Card className="card-glow overflow-hidden">
      <CardHeader className="pb-2 md:pb-3 px-3 md:px-6 pt-3 md:pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] md:text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1 animate-pulse" />
                LIVE
              </Badge>
            )}
            <span className="text-[10px] md:text-xs text-muted-foreground">#{matchId}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3 h-3 md:w-4 md:h-4" />
            <span className="text-xs md:text-sm font-mono font-medium text-primary">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 md:space-y-4 px-3 md:px-6 pb-3 md:pb-6">
        {/* VS Display */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-2 md:gap-4 items-center">
          {/* Agent 1 */}
          <div className="text-center space-y-1.5 md:space-y-2">
            <div className="relative w-12 h-12 md:w-16 md:h-16 mx-auto">
              <div className="w-full h-full rounded-lg bg-primary/10 flex items-center justify-center text-xl md:text-3xl border border-primary/20">
                {agent1.avatar}
              </div>
              <Badge className="absolute -bottom-1 -right-1 text-[8px] md:text-[10px] px-1 py-0 bg-primary/10 text-primary border-primary/20">
                G{agent1.generation}
              </Badge>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-xs md:text-sm truncate">{agent1.name}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{agent1.winRate}% Win</p>
            </div>
            <div className={`flex items-center justify-center gap-0.5 md:gap-1 ${getPnLColor(agent1.pnl)}`}>
              {getPnLIcon(agent1.pnl)}
              <span className="font-mono text-xs md:text-sm font-medium">
                {agent1.pnl >= 0 ? '+' : ''}{agent1.pnl.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted flex items-center justify-center border border-border">
              <Zap className="w-3 h-3 md:w-4 md:h-4 text-secondary" />
            </div>
            <span className="text-[10px] md:text-xs text-muted-foreground">VS</span>
          </div>

          {/* Agent 2 */}
          <div className="text-center space-y-1.5 md:space-y-2">
            <div className="relative w-12 h-12 md:w-16 md:h-16 mx-auto">
              <div className="w-full h-full rounded-lg bg-secondary/10 flex items-center justify-center text-xl md:text-3xl border border-secondary/20">
                {agent2.avatar}
              </div>
              <Badge className="absolute -bottom-1 -right-1 text-[8px] md:text-[10px] px-1 py-0 bg-secondary/10 text-secondary border-secondary/20">
                G{agent2.generation}
              </Badge>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-xs md:text-sm truncate">{agent2.name}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground">{agent2.winRate}% Win</p>
            </div>
            <div className={`flex items-center justify-center gap-0.5 md:gap-1 ${getPnLColor(agent2.pnl)}`}>
              {getPnLIcon(agent2.pnl)}
              <span className="font-mono text-xs md:text-sm font-medium">
                {agent2.pnl >= 0 ? '+' : ''}{agent2.pnl.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
            <span className="truncate max-w-[80px] md:max-w-none">{agent1.name}</span>
            <span className="truncate max-w-[80px] md:max-w-none text-right">{agent2.name}</span>
          </div>
          <div className="relative h-1.5 md:h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-primary transition-all duration-300"
              style={{ 
                width: `${Math.max(10, Math.min(90, 50 + (agent1.pnl - agent2.pnl) * 5))}%` 
              }}
            />
          </div>
        </div>

        {/* Pot Info */}
        <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-border">
          <span className="text-[10px] md:text-xs text-muted-foreground">Total Pot</span>
          <div className="flex items-center gap-1">
            <span className="text-sm md:text-lg font-semibold text-secondary tabular-nums">
              {totalPot.toLocaleString()}
            </span>
            <span className="text-[10px] md:text-xs text-muted-foreground">CLAW</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveMatchCard;
