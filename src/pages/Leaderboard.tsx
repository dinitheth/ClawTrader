import { useState, useEffect } from 'react';
import Layout from "@/components/layout/Layout";
import AgentLeaderRow from "@/components/arena/AgentLeaderRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Clock, Flame, Loader2 } from "lucide-react";
import { agentService } from '@/lib/api';

const Leaderboard = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

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

        {/* Leaderboard Tabs */}
        <Tabs defaultValue="all-time" className="space-y-6">
          <div className="flex justify-center">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all-time" className="gap-2">
                <Trophy className="w-4 h-4" />
                All Time
              </TabsTrigger>
              <TabsTrigger value="weekly" className="gap-2">
                <Clock className="w-4 h-4" />
                By P&L
              </TabsTrigger>
              <TabsTrigger value="hot" className="gap-2">
                <Flame className="w-4 h-4" />
                Hot Streak
              </TabsTrigger>
            </TabsList>
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

              <TabsContent value="weekly">
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
                      <CardTitle className="text-lg font-display">🔥 Hot Streak Leaders</CardTitle>
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
