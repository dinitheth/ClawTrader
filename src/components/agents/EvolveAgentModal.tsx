import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Dna, Sparkles, Loader2, ArrowRight, Zap, Brain } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { CONTRACTS, AGENT_FACTORY_ABI, uuidToBytes32 } from '@/lib/contracts';

interface Agent {
  id: string;
  name: string;
  avatar: string;
  dna_risk_tolerance: number;
  dna_aggression: number;
  dna_pattern_recognition: number;
  dna_timing_sensitivity: number;
  dna_contrarian_bias: number;
  total_matches?: number;
  wins?: number;
  total_pnl?: number;
  mutation_count?: number;
  generation?: number;
}

interface EvolveAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agent;
  onSuccess: () => void;
}

type DNAKey = 'dna_risk_tolerance' | 'dna_aggression' | 'dna_pattern_recognition' | 'dna_timing_sensitivity' | 'dna_contrarian_bias';

const DNA_LABELS: Record<DNAKey, string> = {
  dna_risk_tolerance: 'Risk Tolerance',
  dna_aggression: 'Aggression',
  dna_pattern_recognition: 'Pattern Recognition',
  dna_timing_sensitivity: 'Timing Sensitivity',
  dna_contrarian_bias: 'Contrarian Bias',
};

export function EvolveAgentModal({ open, onOpenChange, agent, onSuccess }: EvolveAgentModalProps) {
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [isEvolving, setIsEvolving] = useState(false);
  const [txStep, setTxStep] = useState<'idle' | 'signing' | 'confirming' | 'saving'>('idle');
  const [evolveMode, setEvolveMode] = useState<'ai' | 'manual'>('ai');

  const FACTORY_ADDRESS = CONTRACTS.AGENT_FACTORY.address;

  // Convert Supabase agent UUID to bytes32 for contract
  const agentIdBytes32 = uuidToBytes32(agent.id);

  // New DNA values for manual mode
  const [newDNA, setNewDNA] = useState<Record<DNAKey, number>>({
    dna_risk_tolerance: agent.dna_risk_tolerance,
    dna_aggression: agent.dna_aggression,
    dna_pattern_recognition: agent.dna_pattern_recognition,
    dna_timing_sensitivity: agent.dna_timing_sensitivity,
    dna_contrarian_bias: agent.dna_contrarian_bias,
  });

  // Helper: call on-chain evolveAgent
  const evolveOnChain = async (risk: number, aggr: number, pattern: number, timing: number, contrarian: number) => {
    setTxStep('signing');
    const txHash = await writeContractAsync({
      address: FACTORY_ADDRESS,
      abi: AGENT_FACTORY_ABI,
      functionName: 'evolveAgent',
      args: [
        agentIdBytes32,
        BigInt(Math.round(risk * 100)),
        BigInt(Math.round(aggr * 100)),
        BigInt(Math.round(pattern * 100)),
        BigInt(Math.round(timing * 100)),
        BigInt(Math.round(contrarian * 100)),
      ],
    });
    setTxStep('confirming');
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash: txHash });
    }
    setTxStep('saving');
  };

  const handleAIEvolve = async () => {
    if (!isConnected || !address) {
      toast({ title: 'Wallet Required', description: 'Connect your wallet to evolve on-chain', variant: 'destructive' });
      return;
    }
    setIsEvolving(true);
    try {
      // Calculate performance-based mutations
      const winRate = agent.total_matches ? (agent.wins || 0) / agent.total_matches : 0.5;
      const pnl = agent.total_pnl || 0;

      // AI-suggested mutations based on performance
      const mutations: Partial<Record<DNAKey, number>> = {};
      const mutationStrength = 0.1; // 10% max change

      if (winRate < 0.4) {
        mutations.dna_aggression = Math.max(0, agent.dna_aggression - mutationStrength * Math.random());
        mutations.dna_risk_tolerance = Math.max(0, agent.dna_risk_tolerance - mutationStrength * Math.random());
      }
      if (winRate > 0.5 && pnl < 10) {
        mutations.dna_aggression = Math.min(1, agent.dna_aggression + mutationStrength * Math.random());
      }
      const traits: DNAKey[] = ['dna_pattern_recognition', 'dna_timing_sensitivity', 'dna_contrarian_bias'];
      const randomTrait = traits[Math.floor(Math.random() * traits.length)];
      mutations[randomTrait] = Math.max(0, Math.min(1, agent[randomTrait] + (Math.random() - 0.5) * mutationStrength * 2));

      const finalDNA = {
        risk: mutations.dna_risk_tolerance ?? agent.dna_risk_tolerance,
        aggression: mutations.dna_aggression ?? agent.dna_aggression,
        pattern: mutations.dna_pattern_recognition ?? agent.dna_pattern_recognition,
        timing: mutations.dna_timing_sensitivity ?? agent.dna_timing_sensitivity,
        contrarian: mutations.dna_contrarian_bias ?? agent.dna_contrarian_bias,
      };

      const dnaBefore = {
        risk: agent.dna_risk_tolerance,
        aggression: agent.dna_aggression,
        pattern: agent.dna_pattern_recognition,
        timing: agent.dna_timing_sensitivity,
        contrarian: agent.dna_contrarian_bias,
      };

      // ═══ Step 1: On-chain evolution via AgentFactory ═══
      await evolveOnChain(finalDNA.risk, finalDNA.aggression, finalDNA.pattern, finalDNA.timing, finalDNA.contrarian);

      // ═══ Step 2: Update Supabase ═══
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          ...mutations,
          mutation_count: (agent.mutation_count || 0) + 1,
        })
        .eq('id', agent.id);

      if (updateError) throw updateError;

      // Log evolution
      await supabase.from('evolution_log').insert({
        agent_id: agent.id,
        evolution_type: 'ai_suggestion',
        trigger_reason: `Win rate: ${(winRate * 100).toFixed(0)}%, P&L: ${pnl.toFixed(2)}`,
        dna_before: dnaBefore,
        dna_after: finalDNA,
      });

      toast({
        title: '🧬 Evolution Recorded On-Chain!',
        description: `${agent.avatar} ${agent.name} DNA evolved on Monad blockchain`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Evolution error:', error);
      const msg = error?.message?.includes('User rejected') ? 'Transaction rejected by wallet'
        : error?.message?.includes('Not owner') ? 'Only the agent owner can evolve'
          : 'Unable to evolve agent. Please try again.';
      toast({ title: 'Evolution Failed', description: msg, variant: 'destructive' });
    } finally {
      setIsEvolving(false);
      setTxStep('idle');
    }
  };

  const handleManualEvolve = async () => {
    if (!isConnected || !address) {
      toast({ title: 'Wallet Required', description: 'Connect your wallet to evolve on-chain', variant: 'destructive' });
      return;
    }
    setIsEvolving(true);
    try {
      const dnaBefore = {
        risk: agent.dna_risk_tolerance,
        aggression: agent.dna_aggression,
        pattern: agent.dna_pattern_recognition,
        timing: agent.dna_timing_sensitivity,
        contrarian: agent.dna_contrarian_bias,
      };

      // ═══ Step 1: On-chain evolution via AgentFactory ═══
      await evolveOnChain(
        newDNA.dna_risk_tolerance,
        newDNA.dna_aggression,
        newDNA.dna_pattern_recognition,
        newDNA.dna_timing_sensitivity,
        newDNA.dna_contrarian_bias
      );

      // ═══ Step 2: Update Supabase ═══
      const { error } = await supabase
        .from('agents')
        .update({
          dna_risk_tolerance: newDNA.dna_risk_tolerance,
          dna_aggression: newDNA.dna_aggression,
          dna_pattern_recognition: newDNA.dna_pattern_recognition,
          dna_timing_sensitivity: newDNA.dna_timing_sensitivity,
          dna_contrarian_bias: newDNA.dna_contrarian_bias,
          mutation_count: (agent.mutation_count || 0) + 1,
        })
        .eq('id', agent.id);

      if (error) throw error;

      // Log evolution
      await supabase.from('evolution_log').insert({
        agent_id: agent.id,
        evolution_type: 'manual',
        trigger_reason: 'User-directed evolution',
        dna_before: dnaBefore,
        dna_after: {
          risk: newDNA.dna_risk_tolerance,
          aggression: newDNA.dna_aggression,
          pattern: newDNA.dna_pattern_recognition,
          timing: newDNA.dna_timing_sensitivity,
          contrarian: newDNA.dna_contrarian_bias,
        },
      });

      toast({
        title: '🧬 Evolution Recorded On-Chain!',
        description: `${agent.avatar} ${agent.name} DNA modified on Monad blockchain`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Evolution error:', error);
      const msg = error?.message?.includes('User rejected') ? 'Transaction rejected by wallet'
        : error?.message?.includes('Not owner') ? 'Only the agent owner can evolve'
          : 'Unable to modify DNA. Please try again.';
      toast({ title: 'Evolution Failed', description: msg, variant: 'destructive' });
    } finally {
      setIsEvolving(false);
      setTxStep('idle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dna className="w-5 h-5 text-primary" />
            Evolve {agent.avatar} {agent.name}
          </DialogTitle>
          <DialogDescription>
            Modify your agent's strategy DNA to improve trading performance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-muted/30">
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className="font-bold">
                {agent.total_matches ? Math.round(((agent.wins || 0) / agent.total_matches) * 100) : 0}%
              </div>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <div className="text-xs text-muted-foreground">Mutations</div>
              <div className="font-bold">{agent.mutation_count || 0}</div>
            </div>
            <div className="p-2 rounded bg-muted/30">
              <div className="text-xs text-muted-foreground">Generation</div>
              <div className="font-bold">{agent.generation || 1}</div>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={evolveMode === 'ai' ? 'default' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => setEvolveMode('ai')}
            >
              <Brain className="w-4 h-4" />
              AI Suggest
            </Button>
            <Button
              variant={evolveMode === 'manual' ? 'default' : 'outline'}
              className="flex-1 gap-2"
              onClick={() => setEvolveMode('manual')}
            >
              <Zap className="w-4 h-4" />
              Manual
            </Button>
          </div>

          {evolveMode === 'ai' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-medium">AI Evolution</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI will analyze your agent's performance and suggest optimal DNA mutations
                  based on win rate, P&L, and trading patterns.
                </p>
              </div>

              {/* Current DNA Display */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Current DNA</div>
                {(Object.keys(DNA_LABELS) as DNAKey[]).map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs">{DNA_LABELS[key]}</span>
                    <Badge variant="outline" className="font-mono">
                      {Math.round(agent[key] * 100)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {(Object.keys(DNA_LABELS) as DNAKey[]).map((key) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{DNA_LABELS[key]}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {Math.round(agent[key] * 100)}%
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge className="font-mono text-xs bg-primary">
                        {Math.round(newDNA[key] * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <Slider
                    value={[newDNA[key] * 100]}
                    onValueChange={([val]) => setNewDNA(prev => ({ ...prev, [key]: val / 100 }))}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={evolveMode === 'ai' ? handleAIEvolve : handleManualEvolve}
            disabled={isEvolving || !isConnected}
            className="w-full gap-2"
          >
            {!isConnected ? (
              <>Connect Wallet to Evolve</>
            ) : isEvolving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {txStep === 'signing' ? 'Sign in wallet...' :
                  txStep === 'confirming' ? 'Confirming on-chain...' :
                    txStep === 'saving' ? 'Saving to database...' : 'Preparing...'}
              </>
            ) : (
              <>
                <Dna className="w-4 h-4" />
                {evolveMode === 'ai' ? 'Let AI Evolve (On-Chain)' : 'Apply Mutations (On-Chain)'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
