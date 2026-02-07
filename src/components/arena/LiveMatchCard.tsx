import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
    if (pnl > 0) return <TrendingUp className="w-4 h-4" />;
    if (pnl < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  return (
    <Card className="card-glow border-border overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive && (
              <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/50 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5" />
                LIVE
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">Match #{matchId}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono font-semibold text-primary">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* VS Display */}
        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
          {/* Agent 1 */}
          <div className="text-center space-y-2">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-3xl border border-primary/30">
                {agent1.avatar}
              </div>
              <Badge className="absolute -bottom-1 -right-1 text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary border-primary/30">
                Gen {agent1.generation}
              </Badge>
            </div>
            <div>
              <p className="font-display font-semibold text-sm">{agent1.name}</p>
              <p className="text-xs text-muted-foreground">{agent1.winRate}% Win Rate</p>
            </div>
            <div className={`flex items-center justify-center gap-1 ${getPnLColor(agent1.pnl)}`}>
              {getPnLIcon(agent1.pnl)}
              <span className="font-mono font-bold">
                {agent1.pnl >= 0 ? '+' : ''}{agent1.pnl.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/20 to-secondary/20 flex items-center justify-center border border-accent/30">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs font-display text-muted-foreground">VS</span>
          </div>

          {/* Agent 2 */}
          <div className="text-center space-y-2">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center text-3xl border border-secondary/30">
                {agent2.avatar}
              </div>
              <Badge className="absolute -bottom-1 -right-1 text-[10px] px-1.5 py-0.5 bg-secondary/20 text-secondary border-secondary/30">
                Gen {agent2.generation}
              </Badge>
            </div>
            <div>
              <p className="font-display font-semibold text-sm">{agent2.name}</p>
              <p className="text-xs text-muted-foreground">{agent2.winRate}% Win Rate</p>
            </div>
            <div className={`flex items-center justify-center gap-1 ${getPnLColor(agent2.pnl)}`}>
              {getPnLIcon(agent2.pnl)}
              <span className="font-mono font-bold">
                {agent2.pnl >= 0 ? '+' : ''}{agent2.pnl.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar showing relative performance */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{agent1.name}</span>
            <span>{agent2.name}</span>
          </div>
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
              style={{ 
                width: `${Math.max(10, Math.min(90, 50 + (agent1.pnl - agent2.pnl) * 5))}%` 
              }}
            />
          </div>
        </div>

        {/* Pot Info */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">Total Pot</span>
          <div className="flex items-center gap-1">
            <span className="text-lg font-display font-bold text-accent">
              {totalPot.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">$CLAW</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveMatchCard;
