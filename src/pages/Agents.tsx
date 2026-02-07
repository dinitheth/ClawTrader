import { useState, useEffect } from 'react';
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, TrendingUp, TrendingDown, Dna, Zap, Settings, Loader2 } from "lucide-react";
import CreateAgentModal from "@/components/agents/CreateAgentModal";
import { agentService, profileService } from "@/lib/api";
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';

const Agents = () => {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, [address, isConnected]);

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      // For demo, load all agents
      const allAgents = await agentService.getAll();
      setAgents(allAgents);
      
      // If connected, try to get/create profile
      if (isConnected && address) {
        // For demo purposes, we'll use a mock profile
        setProfile({ id: 'demo-profile', wallet_address: address });
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWinRate = (agent: any) => {
    if (!agent.total_matches) return 0;
    return Math.round((agent.wins / agent.total_matches) * 100);
  };

  const getRecentPnL = (agent: any) => {
    return agent.total_pnl || 0;
  };

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
              Create and manage your AI trading agents
            </p>
          </div>
          <Button 
            onClick={() => {
              if (!isConnected) {
                toast({ title: 'Connect Wallet', description: 'Please connect your wallet to create an agent', variant: 'destructive' });
                return;
              }
              setIsCreateModalOpen(true);
            }}
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-display font-semibold"
            style={{ boxShadow: 'var(--glow-primary)' }}
          >
            <Plus className="w-5 h-5" />
            Create Agent
          </Button>
        </section>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : agents.length === 0 ? (
          /* Empty State */
          <Card className="border-dashed border-2 border-muted">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
                <Bot className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-xl mb-2">No Agents Yet</h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Create your first AI trading agent to compete in the arena. Each agent has unique DNA and personality traits.
              </p>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80"
              >
                <Plus className="w-5 h-5" />
                Create Your First Agent
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* Agents Grid */
          <section className="grid md:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <Card key={agent.id} className="card-glow border-border overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
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
                        <h3 className="font-display font-semibold text-lg">{agent.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={agent.is_in_match 
                              ? 'bg-destructive/20 text-destructive border-destructive/50' 
                              : agent.is_active
                              ? 'bg-success/20 text-success border-success/50'
                              : 'bg-muted text-muted-foreground border-border'
                            }
                          >
                            {agent.is_in_match ? (
                              <>
                                <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5 animate-pulse" />
                                In Match
                              </>
                            ) : agent.is_active ? 'Active' : 'Idle'}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {agent.personality}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                      <p className="font-display font-bold text-lg">{getWinRate(agent)}%</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Matches</p>
                      <p className="font-display font-bold text-lg">{agent.total_matches || 0}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
                      <div className={`flex items-center justify-center gap-1 ${getRecentPnL(agent) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {getRecentPnL(agent) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span className="font-display font-bold text-lg">
                          {getRecentPnL(agent) >= 0 ? '+' : ''}{getRecentPnL(agent).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Strategy DNA */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Dna className="w-4 h-4" />
                      <span>Strategy DNA</span>
                      {agent.can_self_modify && (
                        <Badge variant="outline" className="text-xs text-secondary border-secondary/50">
                          Self-Modifying
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      <DNABar label="Risk" value={Number(agent.dna_risk_tolerance) * 100} />
                      <DNABar label="Aggr" value={Number(agent.dna_aggression) * 100} />
                      <DNABar label="Pattern" value={Number(agent.dna_pattern_recognition) * 100} />
                      <DNABar label="Timing" value={Number(agent.dna_timing_sensitivity) * 100} />
                      <DNABar label="Contra" value={Number(agent.dna_contrarian_bias) * 100} />
                    </div>
                  </div>

                  {/* Balance & Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="font-display font-bold text-accent text-lg">
                        {Number(agent.balance || 0).toLocaleString()} <span className="text-xs text-muted-foreground">$CLAW</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Dna className="w-4 h-4" />
                        Evolve
                      </Button>
                      <Button 
                        size="sm" 
                        className="gap-1 bg-primary hover:bg-primary/90"
                        disabled={agent.is_in_match}
                      >
                        <Zap className="w-4 h-4" />
                        Enter Arena
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {/* Create New Agent Card */}
            <Card 
              className="border-dashed border-2 border-muted hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => setIsCreateModalOpen(true)}
            >
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
        )}
      </div>

      {/* Create Agent Modal */}
      {profile && (
        <CreateAgentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          profileId={profile.id}
          onAgentCreated={loadAgents}
        />
      )}
    </Layout>
  );
};

const DNABar = ({ label, value }: { label: string; value: number }) => (
  <div className="text-center">
    <div className="h-12 w-full bg-muted/50 rounded relative overflow-hidden mb-1">
      <div 
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary/60 transition-all"
        style={{ height: `${value}%` }}
      />
    </div>
    <span className="text-[10px] text-muted-foreground">{label}</span>
  </div>
);

export default Agents;
