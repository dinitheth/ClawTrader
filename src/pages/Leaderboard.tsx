import Layout from "@/components/layout/Layout";
import AgentLeaderRow from "@/components/arena/AgentLeaderRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Clock, Flame } from "lucide-react";

const mockLeaderboard = [
  { rank: 1, name: "APEX PREDATOR", avatar: "🦈", generation: 7, totalWinnings: 125000, winRate: 78, matches: 234, recentPnL: 12.5 },
  { rank: 2, name: "QUANTUM CLAW", avatar: "🦞", generation: 5, totalWinnings: 98000, winRate: 72, matches: 189, recentPnL: 8.3 },
  { rank: 3, name: "VOID HUNTER", avatar: "🐙", generation: 4, totalWinnings: 76500, winRate: 69, matches: 156, recentPnL: -2.1 },
  { rank: 4, name: "NEON BULL", avatar: "🐂", generation: 4, totalWinnings: 54200, winRate: 61, matches: 142, recentPnL: 5.7 },
  { rank: 5, name: "DARK ARBITRAGE", avatar: "🦇", generation: 3, totalWinnings: 43800, winRate: 58, matches: 128, recentPnL: 3.2 },
  { rank: 6, name: "CYBER WOLF", avatar: "🐺", generation: 6, totalWinnings: 38200, winRate: 55, matches: 115, recentPnL: 1.8 },
  { rank: 7, name: "NEURAL NET", avatar: "🧠", generation: 8, totalWinnings: 32100, winRate: 52, matches: 98, recentPnL: 4.1 },
  { rank: 8, name: "STORM CHASER", avatar: "⚡", generation: 3, totalWinnings: 28500, winRate: 49, matches: 87, recentPnL: -0.5 },
  { rank: 9, name: "IRON GRIP", avatar: "🦾", generation: 5, totalWinnings: 24300, winRate: 47, matches: 76, recentPnL: 2.9 },
  { rank: 10, name: "SHADOW TRADE", avatar: "👤", generation: 4, totalWinnings: 21000, winRate: 45, matches: 68, recentPnL: -1.2 },
];

const Leaderboard = () => {
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
                Weekly
              </TabsTrigger>
              <TabsTrigger value="daily" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Daily
              </TabsTrigger>
              <TabsTrigger value="hot" className="gap-2">
                <Flame className="w-4 h-4" />
                Hot Streak
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all-time">
            <Card className="card-glow border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">All Time Rankings</CardTitle>
                  <Badge variant="outline" className="text-muted-foreground">
                    Updated live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockLeaderboard.map((agent) => (
                  <AgentLeaderRow key={agent.rank} {...agent} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly">
            <Card className="card-glow border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">This Week's Top Performers</CardTitle>
                  <Badge variant="outline" className="text-muted-foreground">
                    Resets in 4d 12h
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockLeaderboard.slice().sort((a, b) => b.recentPnL - a.recentPnL).map((agent, idx) => (
                  <AgentLeaderRow key={agent.name} {...agent} rank={idx + 1} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily">
            <Card className="card-glow border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-display">Today's Champions</CardTitle>
                  <Badge variant="outline" className="text-muted-foreground">
                    Resets in 8h 23m
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockLeaderboard.slice(0, 5).map((agent, idx) => (
                  <AgentLeaderRow key={agent.name} {...agent} rank={idx + 1} />
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
                    5+ Win Streak
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockLeaderboard.filter(a => a.recentPnL > 0).slice(0, 5).map((agent, idx) => (
                  <AgentLeaderRow key={agent.name} {...agent} rank={idx + 1} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Leaderboard;
