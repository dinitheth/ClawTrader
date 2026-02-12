import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Plus, TrendingUp, TrendingDown, Dna, Zap, Settings, Loader2, Rocket, Coins } from "lucide-react";
import CreateAgentModal from "@/components/agents/CreateAgentModal";
import { LaunchTokenModal } from "@/components/agents/LaunchTokenModal";
import { TokenDashboard } from "@/components/agents/TokenDashboard";
import { EvolveAgentModal } from "@/components/agents/EvolveAgentModal";
import { agentService, profileService } from "@/lib/api";
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { OnChainBalance } from '@/components/trading/OnChainBalance';

const Agents = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [launchTokenAgent, setLaunchTokenAgent] = useState<any>(null);
  const [evolveAgent, setEvolveAgent] = useState<any>(null);
  const [expandedTokenAgent, setExpandedTokenAgent] = useState<string | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, [address, isConnected]);

  useEffect(() => {
    if (isConnected && address) {
      loadProfile();
    } else {
      setProfile(null);
    }
  }, [address, isConnected]);

  const loadProfile = async () => {
    if (!address) return;
    try {
      const profileData = await profileService.getOrCreateByWallet(address);
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading/creating profile:', error);
      toast({
        title: 'Profile Error',
        description: 'Failed to load your profile. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const loadAgents = async () => {
    setIsLoading(true);
    try {
      const allAgents = await agentService.getAll();
      setAgents(allAgents);
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
              Create AI trading agents and launch tokens on nad.fun
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
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <div key={agent.id} className="space-y-4">
                <Card className="card-glow border-border overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xl border border-primary/30">
                            {agent.avatar}
                          </div>
                          <Badge className="absolute -bottom-1 -right-1 text-[8px] px-1 py-0 bg-primary/20 text-primary border-primary/30">
                            G{agent.generation}
                          </Badge>
                        </div>
                        <div>
                          <h3 className="font-display font-semibold text-sm">{agent.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${agent.is_in_match
                                ? 'bg-destructive/20 text-destructive border-destructive/50'
                                : agent.is_active
                                  ? 'bg-accent/20 text-accent border-accent/50'
                                  : 'bg-muted text-muted-foreground border-border'
                                }`}
                            >
                              {agent.is_in_match ? (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-destructive mr-1 animate-pulse" />
                                  In Match
                                </>
                              ) : agent.is_active ? 'Active' : 'Idle'}
                            </Badge>
                            <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0">
                              {agent.personality}
                            </Badge>
                            {agent.token_address && (
                              <Badge variant="outline" className="bg-secondary/20 text-secondary border-secondary/50 text-[10px] px-1.5 py-0">
                                <Coins className="w-2.5 h-2.5 mr-0.5" />
                                ${agent.token_symbol}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Settings className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      <div className="text-center p-1.5 rounded-md bg-muted/30">
                        <p className="text-[9px] text-muted-foreground">Win Rate</p>
                        <p className="font-display font-bold text-sm">{getWinRate(agent)}%</p>
                      </div>
                      <div className="text-center p-1.5 rounded-md bg-muted/30">
                        <p className="text-[9px] text-muted-foreground">Matches</p>
                        <p className="font-display font-bold text-sm">{agent.total_matches || 0}</p>
                      </div>
                      <div className="text-center p-1.5 rounded-md bg-muted/30">
                        <p className="text-[9px] text-muted-foreground">Total P&L</p>
                        <div className={`flex items-center justify-center gap-0.5 ${getRecentPnL(agent) >= 0 ? 'text-accent' : 'text-destructive'}`}>
                          {getRecentPnL(agent) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span className="font-display font-bold text-sm">
                            {getRecentPnL(agent) >= 0 ? '+' : ''}{getRecentPnL(agent).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      <div className="text-center p-1.5 rounded-md bg-muted/30">
                        <p className="text-[9px] text-muted-foreground">Market Cap</p>
                        <p className="font-display font-bold text-sm text-primary">
                          {agent.token_address ? `$${Number(agent.token_market_cap || 0).toLocaleString()}` : '—'}
                        </p>
                      </div>
                      <div className="text-center p-1.5 rounded-md bg-muted/30">
                        <p className="text-[9px] text-muted-foreground">Holders</p>
                        <p className="font-display font-bold text-sm">
                          {agent.token_address ? (agent.token_holders || 0) : '—'}
                        </p>
                      </div>
                      <div className="text-center p-1.5 rounded-md bg-muted/30">
                        <p className="text-[9px] text-muted-foreground">Rev Share</p>
                        <p className="font-display font-bold text-sm text-secondary">
                          {agent.token_address ? (agent.revenue_share_enabled ? `${agent.revenue_share_percentage}%` : 'Off') : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Strategy DNA */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Dna className="w-3 h-3" />
                        <span>Strategy DNA</span>
                        {agent.can_self_modify && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 text-secondary border-secondary/50">
                            Self-Mod
                          </Badge>
                        )}
                        {agent.governance_enabled && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 text-primary border-primary/50">
                            DAO
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        <DNABar label="Risk" value={Number(agent.dna_risk_tolerance) * 100} />
                        <DNABar label="Aggr" value={Number(agent.dna_aggression) * 100} />
                        <DNABar label="Pattern" value={Number(agent.dna_pattern_recognition) * 100} />
                        <DNABar label="Timing" value={Number(agent.dna_timing_sensitivity) * 100} />
                        <DNABar label="Contra" value={Number(agent.dna_contrarian_bias) * 100} />
                      </div>
                    </div>

                    {/* Balance & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div>
                        <p className="text-[9px] text-muted-foreground">Balance</p>
                        <p className="font-display font-bold text-accent text-sm">
                          <OnChainBalance agentId={agent.id} />
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!agent.token_address ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 h-7 text-xs border-secondary/50 text-secondary hover:bg-secondary/10"
                            onClick={() => setLaunchTokenAgent(agent)}
                            disabled={!isConnected}
                          >
                            <Rocket className="w-3 h-3" />
                            Token
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 h-7 text-xs"
                            onClick={() => setExpandedTokenAgent(
                              expandedTokenAgent === agent.id ? null : agent.id
                            )}
                          >
                            <Coins className="w-3 h-3" />
                            {expandedTokenAgent === agent.id ? 'Hide' : 'View'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 h-7 text-xs"
                          onClick={() => setEvolveAgent(agent)}
                        >
                          <Dna className="w-3 h-3" />
                          Evolve
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1 h-7 text-xs bg-primary hover:bg-primary/90"
                          disabled={agent.is_in_match}
                          onClick={() => navigate(`/trading?agent=${agent.id}`)}
                        >
                          <Zap className="w-3 h-3" />
                          Arena
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Token Dashboard (Expandable) */}
                {expandedTokenAgent === agent.id && agent.token_address && (
                  <TokenDashboard agentId={agent.id} agentName={agent.name} />
                )}
              </div>
            ))}

            {/* Create New Agent Card */}
            <Card
              className="border-dashed border-2 border-muted hover:border-primary/50 transition-colors cursor-pointer group"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                  <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-display font-semibold text-sm mb-1">Create New Agent</h3>
                <p className="text-xs text-muted-foreground max-w-[180px]">
                  Build a new AI trader with custom DNA
                </p>
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      {/* Modals */}
      {profile && (
        <CreateAgentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          profileId={profile.id}
          onAgentCreated={loadAgents}
        />
      )}

      {launchTokenAgent && (
        <LaunchTokenModal
          open={!!launchTokenAgent}
          onOpenChange={(open) => !open && setLaunchTokenAgent(null)}
          agent={launchTokenAgent}
          onSuccess={loadAgents}
        />
      )}

      {evolveAgent && (
        <EvolveAgentModal
          open={!!evolveAgent}
          onOpenChange={(open) => !open && setEvolveAgent(null)}
          agent={evolveAgent}
          onSuccess={loadAgents}
        />
      )}
    </Layout>
  );
};

const DNABar = ({ label, value }: { label: string; value: number }) => (
  <div className="text-center">
    <div className="h-8 w-full bg-muted/50 rounded relative overflow-hidden mb-0.5">
      <div
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary/60 transition-all"
        style={{ height: `${value}%` }}
      />
    </div>
    <span className="text-[8px] text-muted-foreground">{label}</span>
  </div>
);

export default Agents;
