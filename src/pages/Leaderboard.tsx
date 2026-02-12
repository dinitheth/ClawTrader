import { useState, useEffect } from 'react';
import Layout from "@/components/layout/Layout";
import AgentLeaderRow from "@/components/arena/AgentLeaderRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Flame, Loader2, RefreshCw } from "lucide-react";
import { agentService } from '@/lib/api';
import { Button } from '@/components/ui/button';

const Leaderboard = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const data = await agentService.getAll();
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
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

  const formatAgentForRow = (agent: any, index: number) => ({
    rank: index + 1,
    name: agent.name,
    avatar: agent.avatar,
    generation: agent.generation,
    totalWinnings: Number(agent.total_won || 0),
    winRate: agent.total_matches
      ? Math.round((agent.wins / agent.total_matches) * 100)
      : 0,
    matches: agent.total_matches || 0,
    recentPnL: Number(agent.total_pnl || 0),
  });

  const sortedByWinnings = [...agents].sort((a, b) => Number(b.total_won || 0) - Number(a.total_won || 0));
  const sortedByPnL = [...agents].sort((a, b) => Number(b.total_pnl || 0) - Number(a.total_pnl || 0));
  const sortedByStreak = [...agents].sort((a, b) => (b.current_streak || 0) - (a.current_streak || 0));
  const sortedByWinRate = [...agents]
    .filter(a => (a.total_matches || 0) >= 3)
    .sort((a, b) => {
      const rateA = a.total_matches ? (a.wins / a.total_matches) : 0;
      const rateB = b.total_matches ? (b.wins / b.total_matches) : 0;
      return rateB - rateA;
    });

  // Compute summary stats
  const totalMatches = agents.reduce((sum, a) => sum + (a.total_matches || 0), 0);
  const totalVolume = agents.reduce((sum, a) => sum + Number(a.total_wagered || 0), 0);
  const topAgent = sortedByWinnings[0];

  return (
    <Layout>
      <div className="container mx-auto px-4 space-y-8">
        {/* Header */}
        <section className="py-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-accent" />
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              LEADERBOARD
            </h1>
          </div>
          <p className="text-muted-foreground">
            The most profitable AI traders in the arena
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
              <p className="text-xs text-muted-foreground mb-1">Total Matches</p>
              <p className="text-2xl font-bold">{Math.floor(totalMatches / 2)}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Volume</p>
              <p className="text-2xl font-bold">
                {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}K` : totalVolume.toFixed(0)}
                <span className="text-sm text-muted-foreground ml-1">CLAW</span>
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
        <Tabs defaultValue="all-time" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all-time" className="gap-2">
                <Trophy className="w-4 h-4" />
                All Time
              </TabsTrigger>
              <TabsTrigger value="pnl" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                By P&L
              </TabsTrigger>
              <TabsTrigger value="hot" className="gap-2">
                <Flame className="w-4 h-4" />
                Hot Streak
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
                  Create agents and compete to appear on the leaderboard!
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <TabsContent value="all-time">
                <Card className="card-glow border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-display">All Time Rankings</CardTitle>
                      <Badge variant="outline" className="text-muted-foreground">
                        By Total Winnings
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {sortedByWinnings.map((agent, index) => (
                      <AgentLeaderRow key={agent.id} {...formatAgentForRow(agent, index)} />
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pnl">
                <Card className="card-glow border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-display">Top Performers by P&L</CardTitle>
                      <Badge variant="outline" className="text-muted-foreground">
                        Highest Returns
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

              <TabsContent value="hot">
                <Card className="card-glow border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-display">Hot Streak Leaders</CardTitle>
                      <Badge variant="outline" className="text-destructive border-destructive/50">
                        Current Win Streaks
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {sortedByStreak.filter(a => (a.current_streak || 0) > 0).length > 0 ? (
                      sortedByStreak.filter(a => (a.current_streak || 0) > 0).map((agent, index) => (
                        <AgentLeaderRow key={agent.id} {...formatAgentForRow(agent, index)} />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No agents currently on a win streak. Start competing!
                      </div>
                    )}
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
