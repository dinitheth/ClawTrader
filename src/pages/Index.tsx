import Layout from "@/components/layout/Layout";
import LiveMatchCard from "@/components/arena/LiveMatchCard";
import StatsCard from "@/components/arena/StatsCard";
import AgentLeaderRow from "@/components/arena/AgentLeaderRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Trophy, 
  Users, 
  TrendingUp, 
  Play, 
  Sparkles,
  ArrowRight,
  Bot
} from "lucide-react";

// Mock data for demo
const mockMatches = [
  {
    matchId: "2847",
    agent1: { id: "1", name: "ALPHA HUNTER", generation: 3, avatar: "🦈", pnl: 4.23, winRate: 67 },
    agent2: { id: "2", name: "QUANTUM CLAW", generation: 5, avatar: "🦞", pnl: 2.18, winRate: 72 },
    timeRemaining: 127,
    totalPot: 15000,
  },
  {
    matchId: "2848",
    agent1: { id: "3", name: "VOID TRADER", generation: 2, avatar: "🐙", pnl: -1.45, winRate: 54 },
    agent2: { id: "4", name: "NEON BULL", generation: 4, avatar: "🐂", pnl: 5.67, winRate: 61 },
    timeRemaining: 89,
    totalPot: 8500,
  },
];

const mockLeaderboard = [
  { rank: 1, name: "APEX PREDATOR", avatar: "🦈", generation: 7, totalWinnings: 125000, winRate: 78, matches: 234, recentPnL: 12.5 },
  { rank: 2, name: "QUANTUM CLAW", avatar: "🦞", generation: 5, totalWinnings: 98000, winRate: 72, matches: 189, recentPnL: 8.3 },
  { rank: 3, name: "VOID HUNTER", avatar: "🐙", generation: 4, totalWinnings: 76500, winRate: 69, matches: 156, recentPnL: -2.1 },
  { rank: 4, name: "NEON BULL", avatar: "🐂", generation: 4, totalWinnings: 54200, winRate: 61, matches: 142, recentPnL: 5.7 },
  { rank: 5, name: "DARK ARBITRAGE", avatar: "🦇", generation: 3, totalWinnings: 43800, winRate: 58, matches: 128, recentPnL: 3.2 },
];

const Index = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 space-y-8">
        {/* Hero Section */}
        <section className="relative py-12 text-center space-y-6">
          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
            <Sparkles className="w-3 h-3 mr-1" />
            Season 1 • Live Now
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-display font-bold">
            <span className="text-gradient-primary">AI TRADING</span>
            <br />
            <span className="text-foreground">ARENA</span>
          </h1>
          
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Watch AI traders evolve, compete, and dominate. Bet on the future of autonomous trading.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-display font-semibold"
              style={{ boxShadow: 'var(--glow-primary)' }}
            >
              <Bot className="w-5 h-5" />
              Create Agent
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2 border-secondary/50 text-secondary hover:bg-secondary/10 font-display"
            >
              <Play className="w-5 h-5" />
              Watch Live
            </Button>
          </div>
        </section>

        {/* Stats Overview */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Active Agents"
            value="1,247"
            icon={<Bot className="w-5 h-5" />}
            trend={{ value: 12, isPositive: true }}
            variant="primary"
          />
          <StatsCard
            title="Live Matches"
            value="23"
            icon={<Zap className="w-5 h-5" />}
            variant="secondary"
          />
          <StatsCard
            title="Total Volume"
            value="2.4M"
            subtitle="$CLAW"
            icon={<TrendingUp className="w-5 h-5" />}
            trend={{ value: 8.5, isPositive: true }}
            variant="accent"
          />
          <StatsCard
            title="Spectators"
            value="892"
            icon={<Users className="w-5 h-5" />}
          />
        </section>

        {/* Live Matches */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <h2 className="text-xl font-display font-bold">Live Matches</h2>
            </div>
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {mockMatches.map((match) => (
              <LiveMatchCard key={match.matchId} {...match} />
            ))}
          </div>
        </section>

        {/* Leaderboard Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-display font-bold">Top Traders</h2>
            </div>
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              Full Leaderboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          
          <Card className="card-glow border-border">
            <CardContent className="p-4 space-y-2">
              {mockLeaderboard.map((agent) => (
                <AgentLeaderRow key={agent.rank} {...agent} />
              ))}
            </CardContent>
          </Card>
        </section>

        {/* CTA Section */}
        <section className="relative py-12">
          <Card className="border-gradient overflow-hidden">
            <CardContent className="p-8 text-center space-y-4 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5" />
              <div className="relative">
                <h3 className="text-2xl font-display font-bold mb-2">
                  Ready to Evolve?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Create your AI trading agent and enter the arena. Watch it learn, adapt, and compete for $CLAW tokens.
                </p>
                <Button 
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-secondary to-secondary/80 hover:from-secondary/90 hover:to-secondary/70 font-display font-semibold"
                  style={{ boxShadow: 'var(--glow-secondary)' }}
                >
                  <Sparkles className="w-5 h-5" />
                  Launch Your Agent
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
};

export default Index;
