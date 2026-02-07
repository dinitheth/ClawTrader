import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, TrendingUp, TrendingDown, Dna, Zap, Settings } from "lucide-react";

const mockUserAgents = [
  {
    id: "1",
    name: "ALPHA HUNTER",
    avatar: "🦈",
    generation: 3,
    status: "active",
    totalWinnings: 4520,
    winRate: 62,
    matches: 23,
    recentPnL: 8.5,
    balance: 1200,
    strategy: {
      riskTolerance: 0.7,
      aggression: 0.8,
      patternRecognition: 0.65,
    }
  },
  {
    id: "2",
    name: "VOID SEEKER",
    avatar: "🐙",
    generation: 1,
    status: "idle",
    totalWinnings: 890,
    winRate: 48,
    matches: 12,
    recentPnL: -2.3,
    balance: 450,
    strategy: {
      riskTolerance: 0.4,
      aggression: 0.5,
      patternRecognition: 0.55,
    }
  },
];

const Agents = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 space-y-8">
        {/* Header */}
        <section className="py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Bot className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                MY AGENTS
              </h1>
            </div>
            <p className="text-muted-foreground">
              Manage your AI trading agents and watch them evolve
            </p>
          </div>
          <Button 
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-display font-semibold"
            style={{ boxShadow: 'var(--glow-primary)' }}
          >
            <Plus className="w-5 h-5" />
            Create Agent
          </Button>
        </section>

        {/* Agents Grid */}
        <section className="grid md:grid-cols-2 gap-6">
          {mockUserAgents.map((agent) => (
            <Card key={agent.id} className="card-glow border-border overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-3xl border border-primary/30">
                        {agent.avatar}
                      </div>
                      <Badge className="absolute -bottom-1 -right-1 text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary border-primary/30">
                        Gen {agent.generation}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className="font-display text-lg">{agent.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="outline" 
                          className={agent.status === 'active' 
                            ? 'bg-success/20 text-success border-success/50' 
                            : 'bg-muted text-muted-foreground border-border'
                          }
                        >
                          {agent.status === 'active' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse" />
                              Active
                            </>
                          ) : 'Idle'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                    <p className="font-display font-bold text-lg">{agent.winRate}%</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Matches</p>
                    <p className="font-display font-bold text-lg">{agent.matches}</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Recent P&L</p>
                    <div className={`flex items-center justify-center gap-1 ${agent.recentPnL >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {agent.recentPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span className="font-display font-bold text-lg">
                        {agent.recentPnL >= 0 ? '+' : ''}{agent.recentPnL}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Strategy DNA */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Dna className="w-4 h-4" />
                    <span>Strategy DNA</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Risk Tolerance</span>
                      <span className="text-xs font-mono">{Math.round(agent.strategy.riskTolerance * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-success to-warning transition-all"
                        style={{ width: `${agent.strategy.riskTolerance * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Aggression</span>
                      <span className="text-xs font-mono">{Math.round(agent.strategy.aggression * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                        style={{ width: `${agent.strategy.aggression * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Pattern Recognition</span>
                      <span className="text-xs font-mono">{Math.round(agent.strategy.patternRecognition * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-accent to-warning transition-all"
                        style={{ width: `${agent.strategy.patternRecognition * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Balance & Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-display font-bold text-accent text-lg">
                      {agent.balance.toLocaleString()} <span className="text-xs text-muted-foreground">$CLAW</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Dna className="w-4 h-4" />
                      Evolve
                    </Button>
                    <Button size="sm" className="gap-1 bg-primary hover:bg-primary/90">
                      <Zap className="w-4 h-4" />
                      Enter Arena
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Create New Agent Card */}
          <Card className="border-dashed border-2 border-muted hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">Create New Agent</h3>
              <p className="text-sm text-muted-foreground max-w-[200px]">
                Build a new AI trader with custom strategy DNA
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  );
};

export default Agents;
