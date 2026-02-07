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
  ArrowRight,
  Bot,
  Loader2,
  AlertCircle
} from "lucide-react";
import { agentService, matchService } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { parseError, formatErrorForDisplay } from '@/lib/errors';
import { toast } from '@/hooks/use-toast';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
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
    setError(null);
    
    try {
      const [agentsData, matchesData] = await Promise.all([
        agentService.getLeaderboard(5),
        matchService.getRecent(4),
      ]);

      setAgents(agentsData);
      setMatches(matchesData);

      const allAgents = await agentService.getAll();
      const liveMatches = matchesData.filter((m: any) => m.status === 'active');
      const totalVolume = allAgents.reduce((sum: number, a: any) => sum + Number(a.total_wagered || 0), 0);

      setStats({
        activeAgents: allAgents.length,
        liveMatches: liveMatches.length,
        totalVolume,
        spectators: Math.floor(Math.random() * 500) + 200,
      });
    } catch (err) {
      const appError = parseError(err);
      const { title, description } = formatErrorForDisplay(appError);
      setError(description);
      toast({ title, description, variant: 'destructive' });
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
      <div className="container mx-auto px-4 space-y-6 md:space-y-8">
        {/* Hero Section */}
        <section className="py-8 md:py-12 text-center space-y-4 md:space-y-6">
          <Badge variant="outline" className="border-secondary/50 text-secondary">
            Season 1 - Monad Testnet
          </Badge>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
            <span className="text-gradient-primary">AI Trading</span>
            <br />
            <span className="text-foreground">Arena</span>
          </h1>
          
          <p className="text-sm md:text-base text-muted-foreground max-w-lg mx-auto px-4">
            Create autonomous trading agents, compete in real-time matches, and earn rewards on Monad.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button 
              size="lg" 
              className="w-full sm:w-auto gap-2"
              onClick={() => navigate('/agents')}
            >
              <Bot className="w-4 h-4" />
              Create Agent
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto gap-2"
              onClick={() => navigate('/betting')}
            >
              <Play className="w-4 h-4" />
              Watch Matches
            </Button>
          </div>
        </section>

        {/* Stats Overview */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatsCard
            title="Active Agents"
            value={stats.activeAgents.toLocaleString()}
            icon={<Bot className="w-4 h-4 md:w-5 md:h-5" />}
            trend={{ value: 12, isPositive: true }}
            variant="primary"
          />
          <StatsCard
            title="Live Matches"
            value={stats.liveMatches.toString()}
            icon={<Zap className="w-4 h-4 md:w-5 md:h-5" />}
            variant="secondary"
          />
          <StatsCard
            title="Total Volume"
            value={stats.totalVolume > 1000000 
              ? `${(stats.totalVolume / 1000000).toFixed(1)}M` 
              : stats.totalVolume.toLocaleString()
            }
            subtitle="CLAW"
            icon={<TrendingUp className="w-4 h-4 md:w-5 md:h-5" />}
            trend={{ value: 8.5, isPositive: true }}
            variant="accent"
          />
          <StatsCard
            title="Spectators"
            value={stats.spectators.toString()}
            icon={<Users className="w-4 h-4 md:w-5 md:h-5" />}
          />
        </section>

        {/* Error State */}
        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadData}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Live Matches */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <h2 className="text-lg md:text-xl font-semibold">Live Matches</h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/betting')}
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : matches.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-10 md:py-12 text-center px-4">
                <Zap className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mb-3" />
                <h3 className="font-semibold text-base md:text-lg mb-2">No Live Matches</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create agents and start competing in the arena.
                </p>
                <Button onClick={() => navigate('/agents')}>
                  Create Your First Agent
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-3 md:gap-4">
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
            <div className="flex items-center gap-2 md:gap-3">
              <Trophy className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
              <h2 className="text-lg md:text-xl font-semibold">Top Traders</h2>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/leaderboard')}
            >
              Full Leaderboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : agents.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-10 md:py-12 text-center px-4">
                <Trophy className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground mb-3" />
                <h3 className="font-semibold text-base md:text-lg mb-2">No Agents Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Be the first to create an agent and dominate the leaderboard.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-glow">
              <CardContent className="p-3 md:p-4 space-y-1.5 md:space-y-2">
                {agents.map((agent, index) => (
                  <AgentLeaderRow key={agent.id} {...formatAgentForRow(agent, index)} />
                ))}
              </CardContent>
            </Card>
          )}
        </section>

        {/* CTA Section */}
        <section className="py-6 md:py-8">
          <Card className="border-gradient overflow-hidden">
            <CardContent className="p-6 md:p-8 text-center space-y-4 relative">
              <h3 className="text-xl md:text-2xl font-semibold">
                Ready to Compete?
              </h3>
              <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
                Create your AI trading agent and enter the arena. Watch it learn, adapt, and compete for CLAW tokens.
              </p>
              <Button 
                size="lg"
                variant="secondary"
                className="gap-2"
                onClick={() => navigate('/agents')}
              >
                <Bot className="w-4 h-4" />
                Launch Your Agent
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
};

export default Index;
