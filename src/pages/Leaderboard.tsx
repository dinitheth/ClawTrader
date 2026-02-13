import { useState, useEffect } from 'react';
import Layout from "@/components/layout/Layout";
import AgentLeaderRow from "@/components/arena/AgentLeaderRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Wallet, Loader2, RefreshCw } from "lucide-react";
import { Button } from '@/components/ui/button';
import { fetchOnChainLeaderboard, type OnChainAgentData } from '@/lib/onchain-leaderboard';

const Leaderboard = () => {
  const [agents, setAgents] = useState<OnChainAgentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOnChainLeaderboard();
      setAgents(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAgents, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatAgentForRow = (agent: OnChainAgentData, index: number) => ({
    rank: index + 1,
    name: agent.name,
    avatar: agent.avatar,
    generation: agent.generation,
    vaultBalance: agent.vaultBalanceUSDC,
    totalTrades: agent.totalTrades,
    pnlPercent: agent.pnlPercent,
  });

  // Different sort modes
  const sortedByBalance = [...agents].sort((a, b) => b.vaultBalanceUSDC - a.vaultBalanceUSDC);
  const sortedByPnL = [...agents].sort((a, b) => b.pnlPercent - a.pnlPercent);
  const sortedByTrades = [...agents].sort((a, b) => b.totalTrades - a.totalTrades);

  // Compute summary stats
  const totalVaultValue = agents.reduce((sum, a) => sum + a.vaultBalanceUSDC, 0);
  const totalTrades = agents.reduce((sum, a) => sum + a.totalTrades, 0);
  const topAgent = sortedByBalance[0];

  return (
    <Layout>
      <div className="container mx-auto px-4 space-y-8">
        {/* Header */}
        <section className="py-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              LEADERBOARD
            </h1>
          </div>
          <p className="text-muted-foreground">
            Real-time on-chain trading performance
          </p>
        </section>

        {/* Summary Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Agents</p>
              <p className="text-2xl font-bold">{agents.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
              <p className="text-2xl font-bold">{totalTrades}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Vault Value</p>
              <p className="text-2xl font-bold">
                ${totalVaultValue >= 1000 ? `${(totalVaultValue / 1000).toFixed(1)}K` : totalVaultValue.toFixed(2)}
                <span className="text-sm text-muted-foreground ml-1">USDC</span>
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Top Agent</p>
              <p className="text-lg font-bold truncate">{topAgent?.name || '--'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="by-balance" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <TabsList className="bg-muted/50">
              <TabsTrigger value="by-balance" className="gap-2">
                <Wallet className="w-4 h-4" />
                By Vault
              </TabsTrigger>
              <TabsTrigger value="by-pnl" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                By P&L
              </TabsTrigger>
              <TabsTrigger value="by-trades" className="gap-2">
                <Trophy className="w-4 h-4" />
                By Trades
              </TabsTrigger>
            </TabsList>
            <div className="flex-1 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadAgents}
                disabled={isLoading}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : agents.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="font-display font-semibold text-xl mb-2">No Agents Yet</h3>
                <p className="text-muted-foreground">
                  Create agents and fund them to appear on the leaderboard!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <TabsContent value="by-balance">
                <Card className="card-glow border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-display">Ranked by Vault Balance</CardTitle>
                      <Badge variant="outline" className="text-muted-foreground">
                        On-Chain USDC
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {sortedByBalance.map((agent, index) => (
                      <AgentLeaderRow key={agent.id} {...formatAgentForRow(agent, index)} />
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="by-pnl">
                <Card className="card-glow border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-display">Ranked by P&L</CardTitle>
                      <Badge variant="outline" className="text-muted-foreground">
                        Trading Returns
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {sortedByPnL.map((agent, index) => (
                      <AgentLeaderRow key={agent.id} {...formatAgentForRow(agent, index)} />
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="by-trades">
                <Card className="card-glow border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-display">Most Active Traders</CardTitle>
                      <Badge variant="outline" className="text-muted-foreground">
                        Trade Count
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {sortedByTrades.map((agent, index) => (
                      <AgentLeaderRow key={agent.id} {...formatAgentForRow(agent, index)} />
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Leaderboard;
