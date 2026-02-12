import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Activity } from 'lucide-react';

interface AgentPortfolioProps {
  agent: {
    id: string;
    name: string;
    avatar: string;
    balance: number; // This is the ON-CHAIN balance from AgentVault
  };
  isTrading: boolean;
}

export function AgentPortfolio({ agent, isTrading }: AgentPortfolioProps) {
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
        {/* Balance Display - 100% ON-CHAIN from AgentVault */}
        <div className="text-center p-3 md:p-4 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
          <p className="text-xs md:text-sm text-muted-foreground mb-1">On-Chain Balance</p>
          <p className="text-2xl md:text-3xl font-bold font-mono">{agent.balance.toFixed(2)}</p>
          <p className="text-xs md:text-sm text-muted-foreground">USDC</p>
        </div>
      </CardContent>
    </Card>
  );
}