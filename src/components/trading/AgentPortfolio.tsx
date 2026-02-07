import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Wallet, Activity, Target, BarChart3 } from 'lucide-react';

interface Trade {
  id: string;
  action: 'BUY' | 'SELL';
  symbol: string;
  amount: number;
  price: number;
  timestamp: string;
  pnl?: number;
}

interface AgentPortfolioProps {
  agent: {
    id: string;
    name: string;
    avatar: string;
    balance: number;
    total_pnl?: number;
  };
  trades: Trade[];
  isTrading: boolean;
}

export function AgentPortfolio({ agent, trades, isTrading }: AgentPortfolioProps) {
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => (t.pnl || 0) > 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  
  // Use agent's total_pnl from database if available, otherwise calculate from trades
  const displayPnl = agent.total_pnl ?? totalPnl;
  const pnlPercentage = agent.balance > 0 ? (displayPnl / agent.balance) * 100 : 0;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 md:pb-3">
        <CardTitle className="text-xs md:text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wallet className="w-3 h-3 md:w-4 md:h-4" />
            Agent Portfolio
          </span>
          {isTrading && (
            <Badge variant="outline" className="bg-accent/20 text-accent border-accent/50 animate-pulse text-[10px] md:text-xs">
              <Activity className="w-2 h-2 md:w-3 md:h-3 mr-1" />
              Trading
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-4">
        {/* Balance Display - REAL BALANCE */}
        <div className="text-center p-3 md:p-4 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
          <p className="text-xs md:text-sm text-muted-foreground mb-1">Trading Balance</p>
          <p className="text-2xl md:text-3xl font-bold font-mono">{agent.balance.toFixed(2)}</p>
          <p className="text-xs md:text-sm text-muted-foreground">USDC</p>
        </div>

        {/* PnL */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="p-2 md:p-3 rounded-lg bg-muted/30 text-center">
            <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Total P&L</p>
            <p className={`text-base md:text-lg font-mono font-semibold ${displayPnl >= 0 ? 'text-accent' : 'text-destructive'}`}>
              {displayPnl >= 0 ? '+' : ''}{displayPnl.toFixed(2)}
            </p>
            <p className={`text-[10px] md:text-xs ${pnlPercentage >= 0 ? 'text-accent' : 'text-destructive'}`}>
              {pnlPercentage >= 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%
            </p>
          </div>
          <div className="p-2 md:p-3 rounded-lg bg-muted/30 text-center">
            <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Win Rate</p>
            <p className="text-base md:text-lg font-mono font-semibold">{winRate.toFixed(0)}%</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">{winningTrades}/{totalTrades} trades</p>
          </div>
        </div>

        {/* Win Rate Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] md:text-xs">
            <span className="text-muted-foreground">Win Rate</span>
            <span className="font-mono">{winRate.toFixed(1)}%</span>
          </div>
          <Progress value={winRate} className="h-1.5 md:h-2" />
        </div>

        {/* Recent Trades */}
        {trades.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
              <BarChart3 className="w-2.5 h-2.5 md:w-3 md:h-3" />
              Recent Trades
            </p>
            <div className="space-y-1 max-h-[120px] md:max-h-[150px] overflow-y-auto">
              {trades.slice(0, 5).map((trade) => (
                <div 
                  key={trade.id} 
                  className="flex items-center justify-between p-1.5 md:p-2 rounded text-[10px] md:text-xs bg-muted/20"
                >
                  <div className="flex items-center gap-1.5 md:gap-2">
                    {trade.action === 'BUY' ? (
                      <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3 text-accent" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5 md:w-3 md:h-3 text-destructive" />
                    )}
                    <span>{trade.action}</span>
                    <span className="text-muted-foreground">{trade.symbol}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-mono">{trade.amount.toFixed(2)} USDC</p>
                    {trade.pnl !== undefined && (
                      <p className={`${trade.pnl >= 0 ? 'text-accent' : 'text-destructive'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {trades.length === 0 && (
          <div className="text-center py-3 md:py-4 text-xs md:text-sm text-muted-foreground">
            <Target className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 opacity-50" />
            <p>No trades yet</p>
            <p className="text-[10px] md:text-xs">Start autonomous trading to see activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}