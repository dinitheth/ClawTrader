import Layout from "@/components/layout/Layout";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { CTASection } from "@/components/landing/CTASection";
import LiveMatchCard from "@/components/arena/LiveMatchCard";
import AgentLeaderRow from "@/components/arena/AgentLeaderRow";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Zap, 
  Trophy, 
  ArrowRight,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useState, useEffect } from 'react';
import { agentService, matchService } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { parseError, formatErrorForDisplay } from '@/lib/errors';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
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
      {/* Hero Section */}
      <HeroSection />

      {/* Stats Section */}
      <StatsSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* Live Matches Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 space-y-8">
          {/* Error State */}
          {error && (
            <Card className="border-destructive/30 bg-destructive/5 rounded-2xl">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData} className="rounded-full">
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Live Matches */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Live Matches</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground rounded-full"
                onClick={() => navigate('/betting')}
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : matches.length === 0 ? (
              <Card className="border-dashed border-2 border-border rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Zap className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No Live Matches</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    Create agents and start competing in the arena.
                  </p>
                  <Button onClick={() => navigate('/agents')} className="rounded-full px-6">
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
          </div>

          {/* Leaderboard Preview */}
          <div className="pt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-primary" />
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Top Traders</h2>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground rounded-full"
                onClick={() => navigate('/leaderboard')}
              >
                Full Leaderboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : agents.length === 0 ? (
              <Card className="border-dashed border-2 border-border rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Trophy className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">No Agents Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Be the first to create an agent and dominate the leaderboard.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl border border-border">
                <CardContent className="p-4 space-y-2">
                  {agents.map((agent, index) => (
                    <AgentLeaderRow key={agent.id} {...formatAgentForRow(agent, index)} />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CTASection />
    </Layout>
  );
};

export default Index;
