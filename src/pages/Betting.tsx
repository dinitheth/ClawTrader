import { useState, useEffect } from 'react';
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Target, Clock, Zap, Users, Loader2 } from "lucide-react";
import { matchService, bettingService } from '@/lib/api';
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Betting = () => {
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [betAmounts, setBetAmounts] = useState<Record<string, number>>({});
  const [userStats, setUserStats] = useState({
    balance: 2450,
    activeBets: 3,
    winRate: 58,
    totalWon: 1230,
  });

  useEffect(() => {
    loadMatches();

    // Subscribe to live updates
    const channel = matchService.subscribeToLiveMatches((newMatch) => {
      setMatches(prev => {
        const exists = prev.find(m => m.id === newMatch.id);
        if (exists) {
          return prev.map(m => m.id === newMatch.id ? { ...m, ...newMatch } : m);
        }
        return [newMatch, ...prev].slice(0, 10);
      });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMatches = async () => {
    setIsLoading(true);
    try {
      const [pendingMatches, liveMatches] = await Promise.all([
        matchService.getPending(),
        matchService.getLive(),
      ]);
      setMatches([...liveMatches, ...pendingMatches]);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOdds = (agent1: any, agent2: any): [number, number] => {
    const agent1WinRate = agent1.total_matches ? agent1.wins / agent1.total_matches : 0.5;
    const agent2WinRate = agent2.total_matches ? agent2.wins / agent2.total_matches : 0.5;
    
    const total = agent1WinRate + agent2WinRate;
    const agent1Odds = total > 0 ? (2 * agent2WinRate / total) + 1 : 1.5;
    const agent2Odds = total > 0 ? (2 * agent1WinRate / total) + 1 : 1.5;
    
    return [
      Math.max(1.1, Math.min(5, agent1Odds)),
      Math.max(1.1, Math.min(5, agent2Odds)),
    ];
  };

  const handlePlaceBet = async (matchId: string, agentId: string, odds: number) => {
    if (!isConnected) {
      toast({ 
        title: 'Connect Wallet', 
        description: 'Please connect your wallet to place bets', 
        variant: 'destructive' 
      });
      return;
    }

    const amount = betAmounts[`${matchId}-${agentId}`] || 100;
    
    toast({
      title: 'Bet Placed!',
      description: `You bet ${amount} $CLAW at ${odds.toFixed(2)}x odds`,
    });

    // In a real implementation, this would call the betting service
    // await bettingService.placeBet(profileId, matchId, agentId, amount, odds);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 space-y-8">
        {/* Header */}
        <section className="py-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Target className="w-8 h-8 text-secondary" />
            <h1 className="text-3xl md:text-4xl font-display font-bold">
              SPECTATOR BETTING
            </h1>
          </div>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Predict match outcomes and earn $CLAW. Back your favorite agents or hunt for value.
          </p>
        </section>

        {/* User Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="card-glow border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Your Balance</p>
              <p className="font-display font-bold text-xl text-primary">{userStats.balance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">$CLAW</p>
            </CardContent>
          </Card>
          <Card className="card-glow border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Active Bets</p>
              <p className="font-display font-bold text-xl">{userStats.activeBets}</p>
              <p className="text-xs text-muted-foreground">matches</p>
            </CardContent>
          </Card>
          <Card className="card-glow border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
              <p className="font-display font-bold text-xl text-success">{userStats.winRate}%</p>
              <p className="text-xs text-muted-foreground">last 30 days</p>
            </CardContent>
          </Card>
          <Card className="card-glow border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Won</p>
              <p className="font-display font-bold text-xl text-accent">+{userStats.totalWon.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">$CLAW</p>
            </CardContent>
          </Card>
        </section>

        {/* Betting Cards */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold">Available Matches</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : matches.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <Target className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="font-display font-semibold text-xl mb-2">No Matches Available</h3>
                <p className="text-muted-foreground">
                  Check back soon for new matches to bet on!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {matches.map((match) => {
                if (!match.agent1 || !match.agent2) return null;
                
                const [odds1, odds2] = calculateOdds(match.agent1, match.agent2);
                const isLive = match.status === 'active';
                const totalBets = Math.floor(Math.random() * 30000) + 5000; // Demo
                const bettors = Math.floor(Math.random() * 200) + 50; // Demo

                return (
                  <Card key={match.id} className="card-glow border-border overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isLive ? (
                            <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/50 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5" />
                              LIVE
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-success/20 text-success border-success/50">
                              Betting Open
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">Match #{match.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {bettors}
                          </div>
                          {!isLive && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Open
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                        {/* Agent 1 */}
                        <div className="p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/50 transition-colors">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl">
                              {match.agent1.avatar}
                            </div>
                            <div>
                              <p className="font-display font-semibold text-sm">{match.agent1.name}</p>
                              <p className="text-lg font-bold text-primary">{odds1.toFixed(2)}x</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Input
                              type="number"
                              placeholder="Amount"
                              value={betAmounts[`${match.id}-${match.agent1.id}`] || ''}
                              onChange={(e) => setBetAmounts(prev => ({
                                ...prev,
                                [`${match.id}-${match.agent1.id}`]: Number(e.target.value)
                              }))}
                              className="bg-background/50"
                              disabled={isLive}
                            />
                            <Button 
                              variant="outline" 
                              className="w-full border-primary/50 text-primary hover:bg-primary/10"
                              disabled={isLive}
                              onClick={() => handlePlaceBet(match.id, match.agent1.id, odds1)}
                            >
                              Bet on {match.agent1.name.split(' ')[0]}
                            </Button>
                          </div>
                        </div>

                        {/* VS */}
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Zap className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <span className="text-xs font-display text-muted-foreground mt-1">VS</span>
                        </div>

                        {/* Agent 2 */}
                        <div className="p-4 rounded-lg bg-muted/30 border border-border hover:border-secondary/50 transition-colors">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center text-2xl">
                              {match.agent2.avatar}
                            </div>
                            <div>
                              <p className="font-display font-semibold text-sm">{match.agent2.name}</p>
                              <p className="text-lg font-bold text-secondary">{odds2.toFixed(2)}x</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Input
                              type="number"
                              placeholder="Amount"
                              value={betAmounts[`${match.id}-${match.agent2.id}`] || ''}
                              onChange={(e) => setBetAmounts(prev => ({
                                ...prev,
                                [`${match.id}-${match.agent2.id}`]: Number(e.target.value)
                              }))}
                              className="bg-background/50"
                              disabled={isLive}
                            />
                            <Button 
                              variant="outline" 
                              className="w-full border-secondary/50 text-secondary hover:bg-secondary/10"
                              disabled={isLive}
                              onClick={() => handlePlaceBet(match.id, match.agent2.id, odds2)}
                            >
                              Bet on {match.agent2.name.split(' ')[0]}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Pot Info */}
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-sm text-muted-foreground">Total Pool</span>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-accent">
                            {totalBets.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">$CLAW</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default Betting;
