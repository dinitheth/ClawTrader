import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dna, Shuffle, Sparkles, Bot, Zap, Brain, Shield, Skull, Target, Loader2 } from 'lucide-react';
import { agentService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAccount, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, AGENT_FACTORY_ABI } from '@/lib/contracts';
import { keccak256, toHex, encodePacked } from 'viem';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  onAgentCreated?: () => void;
}

const AVATARS = ['🦞', '🦈', '🐙', '🐺', '🦇', '🐂', '🧠', '⚡', '🦾', '👁️', '🔥', '💀', '🌀', '🎯', '⚔️'];

const PERSONALITIES = [
  { value: 'aggressive', label: 'Aggressive', icon: Zap, description: 'Bold, high-risk', index: 0 },
  { value: 'cautious', label: 'Cautious', icon: Shield, description: 'Patient, safe', index: 1 },
  { value: 'deceptive', label: 'Deceptive', icon: Skull, description: 'Bluffs & tricks', index: 2 },
  { value: 'adaptive', label: 'Adaptive', icon: Brain, description: 'Evolves live', index: 3 },
  { value: 'chaotic', label: 'Chaotic', icon: Shuffle, description: 'Pure entropy', index: 4 },
  { value: 'calculating', label: 'Calculating', icon: Target, description: 'Pure logic', index: 5 },
];

const NAME_PREFIXES = ['ALPHA', 'OMEGA', 'VOID', 'NEON', 'CYBER', 'DARK', 'QUANTUM', 'APEX', 'STORM', 'IRON'];
const NAME_SUFFIXES = ['HUNTER', 'CLAW', 'TRADER', 'WOLF', 'BULL', 'SHARK', 'NET', 'GRIP', 'STRIKE', 'BLADE'];

const FACTORY_ADDRESS = CONTRACTS.AGENT_FACTORY.address;

const CreateAgentModal = ({ isOpen, onClose, profileId, onAgentCreated }: CreateAgentModalProps) => {
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isLoading, setIsLoading] = useState(false);
  const [txStep, setTxStep] = useState<'idle' | 'signing' | 'confirming' | 'saving'>('idle');

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🦞');
  const [personality, setPersonality] = useState<string>('adaptive');

  // DNA sliders
  const [riskTolerance, setRiskTolerance] = useState(50);
  const [aggression, setAggression] = useState(50);
  const [patternRecognition, setPatternRecognition] = useState(50);
  const [timingSensitivity, setTimingSensitivity] = useState(50);
  const [contrarianBias, setContrarianBias] = useState(50);

  // Experimental traits
  const [deceptionSkill, setDeceptionSkill] = useState(30);
  const [allianceTendency, setAllianceTendency] = useState(50);
  const [betrayalThreshold, setBetrayalThreshold] = useState(70);
  const [canSelfModify, setCanSelfModify] = useState(false);

  const generateRandomName = () => {
    const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    setName(`${prefix} ${suffix}`);
  };

  const randomizeDNA = () => {
    setRiskTolerance(Math.floor(Math.random() * 100));
    setAggression(Math.floor(Math.random() * 100));
    setPatternRecognition(Math.floor(Math.random() * 100));
    setTimingSensitivity(Math.floor(Math.random() * 100));
    setContrarianBias(Math.floor(Math.random() * 100));
    setDeceptionSkill(Math.floor(Math.random() * 100));
    setAllianceTendency(Math.floor(Math.random() * 100));
    setBetrayalThreshold(Math.floor(Math.random() * 100));
    setAvatar(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    setPersonality(PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)].value);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Please enter an agent name', variant: 'destructive' });
      return;
    }

    if (!isConnected || !address) {
      toast({ title: 'Wallet Required', description: 'Please connect your wallet to create an agent on-chain', variant: 'destructive' });
      return;
    }

    const personalityEntry = PERSONALITIES.find(p => p.value === personality);
    const personalityIndex = personalityEntry ? personalityEntry.index : 3;

    // Generate a deterministic bytes32 ID from agent name + timestamp + address
    const agentId = keccak256(
      encodePacked(
        ['string', 'address', 'uint256'],
        [name.toUpperCase(), address, BigInt(Date.now())]
      )
    );

    setIsLoading(true);
    setTxStep('signing');

    try {
      // ═══ Step 1: On-chain transaction via AgentFactory ═══
      const txHash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: AGENT_FACTORY_ABI,
        functionName: 'createAgent',
        args: [
          agentId,
          name.toUpperCase(),
          avatar,
          personalityIndex,
          BigInt(riskTolerance),
          BigInt(aggression),
          BigInt(patternRecognition),
          BigInt(timingSensitivity),
          BigInt(contrarianBias),
        ],
      });

      setTxStep('confirming');

      // Wait for on-chain confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }

      // ═══ Step 2: Save to Supabase (off-chain DB) ═══
      setTxStep('saving');

      await agentService.create({
        owner_id: profileId,
        name: name.toUpperCase(),
        avatar,
        personality: personality as any,
        dna_risk_tolerance: riskTolerance / 100,
        dna_aggression: aggression / 100,
        dna_pattern_recognition: patternRecognition / 100,
        dna_timing_sensitivity: timingSensitivity / 100,
        dna_contrarian_bias: contrarianBias / 100,
        deception_skill: deceptionSkill / 100,
        alliance_tendency: allianceTendency / 100,
        betrayal_threshold: betrayalThreshold / 100,
        can_self_modify: canSelfModify,
        balance: 500,
      });

      toast({
        title: '🎉 Agent Created On-Chain!',
        description: `${name} has been permanently recorded on Monad blockchain!`,
      });
      onAgentCreated?.();
      onClose();
    } catch (error: any) {
      console.error('Error creating agent:', error);

      // Provide user-friendly error messages
      let errorMsg = 'Failed to create agent';
      if (error?.message?.includes('User rejected')) {
        errorMsg = 'Transaction was rejected by wallet';
      } else if (error?.message?.includes('already exists')) {
        errorMsg = 'An agent with this name already exists on-chain';
      } else if (error?.message?.includes('insufficient funds')) {
        errorMsg = 'Insufficient MON for gas fees';
      }

      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setTxStep('idle');
    }
  };

  const getButtonLabel = () => {
    switch (txStep) {
      case 'signing': return 'Sign Transaction...';
      case 'confirming': return 'Confirming On-Chain...';
      case 'saving': return 'Saving Agent Data...';
      default: return 'Create Agent On-Chain';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto bg-card border-border p-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/50">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 font-display text-base">
              <Bot className="w-5 h-5 text-primary" />
              Create AI Trading Agent
            </DialogTitle>
            <DialogDescription className="text-xs">
              Your agent's DNA is recorded permanently on the Monad blockchain.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Horizontal 2-column layout */}
        <div className="grid grid-cols-2 gap-0 divide-x divide-border/40">

          {/* ═══ LEFT COLUMN: Identity + Personality ═══ */}
          <div className="px-5 py-4 space-y-4">

            {/* Identity Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Identity</h3>
                <button onClick={generateRandomName} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                  <Shuffle className="w-3 h-3" /> Random
                </button>
              </div>

              {/* Avatar + Name row */}
              <div className="flex items-start gap-3">
                <div className="space-y-1.5 flex-shrink-0">
                  <Label className="text-[10px] text-muted-foreground">Avatar</Label>
                  <div className="grid grid-cols-5 gap-0.5">
                    {AVATARS.map((a) => (
                      <button
                        key={a}
                        onClick={() => setAvatar(a)}
                        className={`w-7 h-7 rounded text-sm flex items-center justify-center transition-all ${avatar === a
                            ? 'bg-primary/20 ring-1.5 ring-primary'
                            : 'bg-muted/40 hover:bg-muted/70'
                          }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground">Agent Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="APEX HUNTER"
                    className="font-display text-sm uppercase h-8"
                  />
                </div>
              </div>
            </div>

            {/* Personality Section */}
            <div className="space-y-2">
              <h3 className="font-display font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">Personality</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {PERSONALITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPersonality(p.value)}
                    className={`px-2 py-1.5 rounded-md border transition-all text-left ${personality === p.value
                        ? 'bg-primary/15 border-primary/60 ring-1 ring-primary/20'
                        : 'bg-muted/20 border-border/50 hover:bg-muted/40'
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <p.icon className="w-3 h-3 flex-shrink-0" />
                      <span className="font-display text-[11px] font-semibold truncate">{p.label}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5 pl-[18px]">{p.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Experimental Traits */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-semibold text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-secondary" />
                  Experimental
                </h3>
                <Badge variant="outline" className="text-[8px] text-secondary border-secondary/40 px-1.5 py-0">Weird</Badge>
              </div>

              <div className="space-y-2.5">
                <DNASlider label="Deception" value={deceptionSkill} onChange={setDeceptionSkill} lowLabel="Honest" highLabel="Bluffer" color="secondary" />
                <DNASlider label="Alliance" value={allianceTendency} onChange={setAllianceTendency} lowLabel="Lone Wolf" highLabel="Team" color="secondary" />
                <DNASlider label="Betrayal" value={betrayalThreshold} onChange={setBetrayalThreshold} lowLabel="Loyal" highLabel="Opportunist" color="secondary" />
              </div>

              {/* Self-modification toggle */}
              <div className="flex items-center justify-between p-2 rounded-md bg-secondary/5 border border-secondary/20">
                <div>
                  <p className="font-display font-semibold text-[11px]">Self-Modification</p>
                  <p className="text-[9px] text-muted-foreground">Rewrite its own strategy</p>
                </div>
                <button
                  onClick={() => setCanSelfModify(!canSelfModify)}
                  className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${canSelfModify ? 'bg-secondary' : 'bg-muted'
                    }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${canSelfModify ? 'translate-x-[18px]' : 'translate-x-0.5'
                    }`} />
                </button>
              </div>
            </div>
          </div>

          {/* ═══ RIGHT COLUMN: Strategy DNA ═══ */}
          <div className="px-5 py-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Dna className="w-3 h-3" />
                Strategy DNA
              </h3>
              <button onClick={randomizeDNA} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                <Shuffle className="w-3 h-3" /> Randomize
              </button>
            </div>

            <div className="space-y-3">
              <DNASlider label="Risk Tolerance" value={riskTolerance} onChange={setRiskTolerance} lowLabel="Conservative" highLabel="Degen" />
              <DNASlider label="Aggression" value={aggression} onChange={setAggression} lowLabel="Passive" highLabel="Attack Mode" />
              <DNASlider label="Pattern Recognition" value={patternRecognition} onChange={setPatternRecognition} lowLabel="Intuitive" highLabel="Pattern God" />
              <DNASlider label="Timing Sensitivity" value={timingSensitivity} onChange={setTimingSensitivity} lowLabel="YOLO" highLabel="Perfect Entry" />
              <DNASlider label="Contrarian Bias" value={contrarianBias} onChange={setContrarianBias} lowLabel="Follow Crowd" highLabel="Always Fade" />
            </div>

            {/* On-chain indicator */}
            <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-[10px] text-muted-foreground">
                {isConnected
                  ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)} — Agent will be registered on Monad`
                  : 'Connect wallet to register agent on-chain'}
              </p>
            </div>

            {/* Create Button */}
            <div className="pt-1">
              <Button
                onClick={handleCreate}
                disabled={isLoading || !name.trim() || !isConnected}
                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-display font-semibold h-9 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {getButtonLabel()}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Create Agent On-Chain
                  </>
                )}
              </Button>
              {!isConnected && (
                <p className="text-[9px] text-destructive text-center mt-1">Wallet connection required</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface DNASliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  lowLabel: string;
  highLabel: string;
  color?: 'primary' | 'secondary';
}

const DNASlider = ({ label, value, onChange, lowLabel, highLabel, color = 'primary' }: DNASliderProps) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[11px]">{label}</Label>
        <span className="font-mono text-[10px] font-semibold text-muted-foreground">{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        max={100}
        step={1}
        className={`h-1.5 ${color === 'secondary' ? '[&_[role=slider]]:bg-secondary' : ''}`}
      />
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
};

export default CreateAgentModal;
