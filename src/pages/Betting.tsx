import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Target, Clock, TrendingUp, Zap, Users } from "lucide-react";

const mockBettingMatches = [
  {
    id: "2847",
    agent1: { name: "ALPHA HUNTER", avatar: "🦈", odds: 1.8 },
    agent2: { name: "QUANTUM CLAW", avatar: "🦞", odds: 2.1 },
    totalBets: 24500,
    bettors: 156,
    timeToStart: 45,
    status: "open"
  },
  {
    id: "2848",
    agent1: { name: "VOID TRADER", avatar: "🐙", odds: 2.4 },
    agent2: { name: "NEON BULL", avatar: "🐂", odds: 1.6 },
    totalBets: 18200,
    bettors: 98,
    timeToStart: 120,
    status: "open"
  },
  {
    id: "2849",
    agent1: { name: "CYBER WOLF", avatar: "🐺", odds: 1.9 },
    agent2: { name: "NEURAL NET", avatar: "🧠", odds: 2.0 },
    totalBets: 31000,
    bettors: 203,
    timeToStart: 0,
    status: "live"
  },
];

const Betting = () => {
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
              <p className="font-display font-bold text-xl text-primary">2,450</p>
              <p className="text-xs text-muted-foreground">$CLAW</p>
            </CardContent>
          </Card>
          <Card className="card-glow border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Active Bets</p>
              <p className="font-display font-bold text-xl">3</p>
              <p className="text-xs text-muted-foreground">matches</p>
            </CardContent>
          </Card>
          <Card className="card-glow border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
              <p className="font-display font-bold text-xl text-success">58%</p>
              <p className="text-xs text-muted-foreground">last 30 days</p>
            </CardContent>
          </Card>
          <Card className="card-glow border-border">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Won</p>
              <p className="font-display font-bold text-xl text-accent">+1,230</p>
              <p className="text-xs text-muted-foreground">$CLAW</p>
            </CardContent>
          </Card>
        </section>

        {/* Betting Cards */}
        <section className="space-y-4">
          <h2 className="text-xl font-display font-bold">Available Matches</h2>
          
          <div className="grid gap-4">
            {mockBettingMatches.map((match) => (
              <Card key={match.id} className="card-glow border-border overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {match.status === 'live' ? (
                        <Badge variant="outline" className="bg-destructive/20 text-destructive border-destructive/50 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5" />
                          LIVE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-success/20 text-success border-success/50">
                          Betting Open
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">Match #{match.id}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {match.bettors}
                      </div>
                      {match.status !== 'live' && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Starts in {match.timeToStart}s
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
                    {/* Agent 1 */}
                    <div className="p-4 rounded-lg bg-muted/30 border border-border hover:border-primary/50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl">
                          {match.agent1.avatar}
                        </div>
                        <div>
                          <p className="font-display font-semibold text-sm">{match.agent1.name}</p>
                          <p className="text-lg font-bold text-primary">{match.agent1.odds}x</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full border-primary/50 text-primary hover:bg-primary/10 group-hover:bg-primary/20"
                        disabled={match.status === 'live'}
                      >
                        Bet on {match.agent1.name.split(' ')[0]}
                      </Button>
                    </div>

                    {/* VS */}
                    <div className="flex flex-col items-center">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Zap className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-display text-muted-foreground mt-1">VS</span>
                    </div>

                    {/* Agent 2 */}
                    <div className="p-4 rounded-lg bg-muted/30 border border-border hover:border-secondary/50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center text-2xl">
                          {match.agent2.avatar}
                        </div>
                        <div>
                          <p className="font-display font-semibold text-sm">{match.agent2.name}</p>
                          <p className="text-lg font-bold text-secondary">{match.agent2.odds}x</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full border-secondary/50 text-secondary hover:bg-secondary/10 group-hover:bg-secondary/20"
                        disabled={match.status === 'live'}
                      >
                        Bet on {match.agent2.name.split(' ')[0]}
                      </Button>
                    </div>
                  </div>

                  {/* Pot Info */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-sm text-muted-foreground">Total Pool</span>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-accent">
                        {match.totalBets.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">$CLAW</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Betting;
