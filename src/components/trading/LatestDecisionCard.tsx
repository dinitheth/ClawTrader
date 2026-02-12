import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp, TrendingDown, Clock, Brain, Target, ShieldAlert } from 'lucide-react';
import type { TradingDecision } from '@/lib/trading-service';

interface LatestDecisionCardProps {
  decision: TradingDecision | null;
  agentName?: string;
  timestamp?: string;
}

export function LatestDecisionCard({ decision, agentName, timestamp }: LatestDecisionCardProps) {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'bg-accent/20 text-accent border-accent/50';
      case 'SELL': return 'bg-destructive/20 text-destructive border-destructive/50';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BUY': return <TrendingUp className="w-5 h-5" />;
      case 'SELL': return <TrendingDown className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-accent';
    if (confidence >= 50) return 'text-yellow-500';
    return 'text-destructive';
  };

  if (!decision) {
    return (
      <Card className="border-muted/50 bg-gradient-to-br from-muted/10 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            Latest AI Decision
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-3">
              <Brain className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No analysis yet</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Analyze" or enable "Auto Trade"</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Latest AI Decision
          </CardTitle>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        {agentName && (
          <p className="text-xs text-muted-foreground">by {agentName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Badge & Confidence */}
        <div className="flex items-center justify-between">
          <Badge className={`text-lg px-4 py-2 flex items-center gap-2 ${getActionColor(decision.action)}`}>
            {getActionIcon(decision.action)}
            <span className="font-bold">{decision.action}</span>
          </Badge>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getConfidenceColor(decision.confidence)}`}>
              {decision.confidence.toFixed(2)}%
            </div>
            <div className="text-xs text-muted-foreground">Confidence</div>
          </div>
        </div>

        {/* Reasoning */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-3 h-3 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">AI Reasoning</span>
          </div>
          <p className="text-xs leading-relaxed">{decision.reasoning}</p>
        </div>

        {/* Technical Analysis */}
        {decision.technicalAnalysis && (
          <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-3 h-3 text-secondary" />
              <span className="text-xs font-medium text-muted-foreground">Technical Analysis</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{decision.technicalAnalysis}</p>
          </div>
        )}

        {/* Risk Assessment */}
        {decision.riskAssessment && (
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-3 h-3 text-destructive" />
              <span className="text-xs font-medium text-destructive/70">Risk Assessment</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{decision.riskAssessment}</p>
          </div>
        )}

        {/* Trade Parameters */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/30 border border-border/30">
            <p className="text-xs text-muted-foreground">Position Size</p>
            <p className="font-mono font-semibold">{decision.suggestedAmount}%</p>
          </div>
          {decision.stopLoss && (
            <div className="text-center p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive">Stop Loss</p>
              <p className="font-mono text-xs font-semibold">${decision.stopLoss.toLocaleString()}</p>
            </div>
          )}
          {decision.takeProfit && (
            <div className="text-center p-2 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-xs text-accent">Take Profit</p>
              <p className="font-mono text-xs font-semibold">${decision.takeProfit.toLocaleString()}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
