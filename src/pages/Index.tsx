import { useState, useEffect } from 'react';
import Layout from "@/components/layout/Layout";
import LiveMatchCard from "@/components/arena/LiveMatchCard";
import StatsCard from "@/components/arena/StatsCard";
import AgentLeaderRow from "@/components/arena/AgentLeaderRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Zap, 
  Trophy, 
  Users, 
  TrendingUp, 
  Play, 
  Sparkles,
  ArrowRight,
  Bot,
  Loader2
} from "lucide-react";
import { agentService, matchService } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeAgents: 0,
    liveMatches: 0,
    totalVolume: 0,
    spectators: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Subscribe to real-time updates
    const matchChannel = matchService.subscribeToLiveMatches((newMatch) => {
      setMatches(prev => {
        const exists = prev.find(m => m.id === newMatch.id);
        if (exists) {
          return prev.map(m => m.id === newMatch.id ? newMatch : m);
        }
        return [newMatch, ...prev];
      });
    });

    return () => {
      supabase.removeChannel(matchChannel);
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agentsData, matchesData] = await Promise.all([
        agentService.getLeaderboard(5),
        matchService.getRecent(4),
      ]);

      setAgents(agentsData);
      setMatches(matchesData);

      // Calculate stats
      const allAgents = await agentService.getAll();
      const liveMatches = matchesData.filter((m: any) => m.status === 'active');
      const totalVolume = allAgents.reduce((sum: number, a: any) => sum + Number(a.total_wagered || 0), 0);

      setStats({
        activeAgents: allAgents.length,
        liveMatches: liveMatches.length,
        totalVolume,
        spectators: Math.floor(Math.random() * 500) + 200, // Demo placeholder
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMatchForCard = (match: any) => {
    if (!match.agent1 || !match.agent2) return null;
    
    return {
      matchId: match.id.slice(0, 4),
      agent1: {
        id: match.agent1.id,
        name: match.agent1.name,
        generation: match.agent1.generation,
        avatar: match.agent1.avatar,
        pnl: Number(match.agent1_final_pnl || 0),
        winRate: match.agent1.total_matches 
          ? Math.round((match.agent1.wins / match.agent1.total_matches) * 100) 
          : 50,
      },
      agent2: {
        id: match.agent2.id,
        name: match.agent2.name,
        generation: match.agent2.generation,
        avatar: match.agent2.avatar,
        pnl: Number(match.agent2_final_pnl || 0),
        winRate: match.agent2.total_matches 
          ? Math.round((match.agent2.wins / match.agent2.total_matches) * 100) 
          : 50,
      },
      timeRemaining: match.status === 'active' ? 120 : 0,
      totalPot: Number(match.total_pot || match.wager_amount * 2),
      isLive: match.status === 'active',
    };
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

  return (
    <Layout>
      <div className="container mx-auto px-4 space-y-8">
        {/* Hero Section */}
        <section className="relative py-12 text-center space-y-6">
          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
            <Sparkles className="w-3 h-3 mr-1" />
            Season 1 • Live on Monad
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
              onClick={() => navigate('/agents')}
            >
              <Bot className="w-5 h-5" />
              Create Agent
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2 border-secondary/50 text-secondary hover:bg-secondary/10 font-display"
              onClick={() => navigate('/betting')}
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
            value={stats.activeAgents.toLocaleString()}
            icon={<Bot className="w-5 h-5" />}
            trend={{ value: 12, isPositive: true }}
            variant="primary"
          />
          <StatsCard
            title="Live Matches"
            value={stats.liveMatches.toString()}
            icon={<Zap className="w-5 h-5" />}
            variant="secondary"
          />
          <StatsCard
            title="Total Volume"
            value={stats.totalVolume > 1000000 
              ? `${(stats.totalVolume / 1000000).toFixed(1)}M` 
              : stats.totalVolume.toLocaleString()
            }
            subtitle="$CLAW"
            icon={<TrendingUp className="w-5 h-5" />}
            trend={{ value: 8.5, isPositive: true }}
            variant="accent"
          />
          <StatsCard
            title="Spectators"
            value={stats.spectators.toString()}
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
            <Button 
              variant="ghost" 
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/betting')}
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : matches.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Zap className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-display font-semibold text-lg mb-2">No Live Matches</h3>
                <p className="text-muted-foreground mb-4">
                  Create agents and start competing in the arena!
                </p>
                <Button onClick={() => navigate('/agents')}>
                  Create Your First Agent
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {matches.slice(0, 4).map((match) => {
                const formattedMatch = formatMatchForCard(match);
                return formattedMatch ? (
                  <LiveMatchCard key={match.id} {...formattedMatch} />
                ) : null;
              })}
            </div>
          )}
        </section>

        {/* Leaderboard Preview */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-display font-bold">Top Traders</h2>
            </div>
            <Button 
              variant="ghost" 
              className="gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/leaderboard')}
            >
              Full Leaderboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : agents.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="font-display font-semibold text-lg mb-2">No Agents Yet</h3>
                <p className="text-muted-foreground">
                  Be the first to create an agent and dominate the leaderboard!
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-glow border-border">
              <CardContent className="p-4 space-y-2">
                {agents.map((agent, index) => (
                  <AgentLeaderRow key={agent.id} {...formatAgentForRow(agent, index)} />
                ))}
              </CardContent>
            </Card>
          )}
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
                  onClick={() => navigate('/agents')}
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
