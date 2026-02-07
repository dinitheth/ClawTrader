import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dna, Shuffle, Sparkles, Bot, Zap, Brain, Shield, Skull, Target } from 'lucide-react';
import { agentService } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId: string;
  onAgentCreated?: () => void;
}

const AVATARS = ['🦞', '🦈', '🐙', '🐺', '🦇', '🐂', '🧠', '⚡', '🦾', '👁️', '🔥', '💀', '🌀', '🎯', '⚔️'];

const PERSONALITIES = [
  { value: 'aggressive', label: 'Aggressive', icon: Zap, description: 'Bold, high-risk plays' },
  { value: 'cautious', label: 'Cautious', icon: Shield, description: 'Patient, calculated' },
  { value: 'deceptive', label: 'Deceptive', icon: Skull, description: 'Bluffs & misdirection' },
  { value: 'adaptive', label: 'Adaptive', icon: Brain, description: 'Evolves mid-match' },
  { value: 'chaotic', label: 'Chaotic', icon: Shuffle, description: 'Pure entropy' },
  { value: 'calculating', label: 'Calculating', icon: Target, description: 'Pure logic' },
];

const NAME_PREFIXES = ['ALPHA', 'OMEGA', 'VOID', 'NEON', 'CYBER', 'DARK', 'QUANTUM', 'APEX', 'STORM', 'IRON'];
const NAME_SUFFIXES = ['HUNTER', 'CLAW', 'TRADER', 'WOLF', 'BULL', 'SHARK', 'NET', 'GRIP', 'STRIKE', 'BLADE'];

const CreateAgentModal = ({ isOpen, onClose, profileId, onAgentCreated }: CreateAgentModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
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

    setIsLoading(true);
    try {
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
        balance: 500, // Starting balance
      });

      toast({ title: 'Agent Created!', description: `${name} is ready to compete in the arena!` });
      onAgentCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating agent:', error);
      toast({ title: 'Error', description: 'Failed to create agent', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Bot className="w-6 h-6 text-primary" />
            Create AI Trading Agent
          </DialogTitle>
          <DialogDescription>
            Define your agent's DNA and personality. Each trait affects how it trades and interacts in the arena.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Identity */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm text-muted-foreground">IDENTITY</h3>
              <Button variant="ghost" size="sm" onClick={generateRandomName} className="gap-1">
                <Shuffle className="w-4 h-4" />
                Random Name
              </Button>
            </div>
            
            <div className="grid grid-cols-[auto,1fr] gap-4">
              {/* Avatar Selection */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Avatar</Label>
                <div className="grid grid-cols-5 gap-1">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        avatar === a 
                          ? 'bg-primary/20 border-2 border-primary' 
                          : 'bg-muted/50 border border-border hover:bg-muted'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Agent Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="APEX HUNTER"
                  className="font-display text-lg uppercase"
                />
              </div>
            </div>
          </div>

          {/* Personality */}
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-sm text-muted-foreground">PERSONALITY</h3>
            <div className="grid grid-cols-3 gap-2">
              {PERSONALITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPersonality(p.value)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    personality === p.value
                      ? 'bg-primary/20 border-primary'
                      : 'bg-muted/30 border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <p.icon className="w-4 h-4" />
                    <span className="font-display text-sm font-semibold">{p.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* DNA Sliders */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <Dna className="w-4 h-4" />
                STRATEGY DNA
              </h3>
              <Button variant="ghost" size="sm" onClick={randomizeDNA} className="gap-1">
                <Shuffle className="w-4 h-4" />
                Randomize All
              </Button>
            </div>

            <div className="grid gap-4">
              <DNASlider 
                label="Risk Tolerance" 
                value={riskTolerance} 
                onChange={setRiskTolerance}
                lowLabel="Conservative"
                highLabel="Degen"
              />
              <DNASlider 
                label="Aggression" 
                value={aggression} 
                onChange={setAggression}
                lowLabel="Passive"
                highLabel="Attack Mode"
              />
              <DNASlider 
                label="Pattern Recognition" 
                value={patternRecognition} 
                onChange={setPatternRecognition}
                lowLabel="Intuitive"
                highLabel="Pattern God"
              />
              <DNASlider 
                label="Timing Sensitivity" 
                value={timingSensitivity} 
                onChange={setTimingSensitivity}
                lowLabel="YOLO"
                highLabel="Perfect Entry"
              />
              <DNASlider 
                label="Contrarian Bias" 
                value={contrarianBias} 
                onChange={setContrarianBias}
                lowLabel="Follow Crowd"
                highLabel="Always Fade"
              />
            </div>
          </div>

          {/* Experimental Traits */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-secondary" />
              EXPERIMENTAL TRAITS
              <Badge variant="outline" className="text-secondary border-secondary/50">Weird</Badge>
            </h3>

            <div className="grid gap-4">
              <DNASlider 
                label="Deception Skill" 
                value={deceptionSkill} 
                onChange={setDeceptionSkill}
                lowLabel="Honest"
                highLabel="Master Bluffer"
                color="secondary"
              />
              <DNASlider 
                label="Alliance Tendency" 
                value={allianceTendency} 
                onChange={setAllianceTendency}
                lowLabel="Lone Wolf"
                highLabel="Team Player"
                color="secondary"
              />
              <DNASlider 
                label="Betrayal Threshold" 
                value={betrayalThreshold} 
                onChange={setBetrayalThreshold}
                lowLabel="Loyal"
                highLabel="Opportunist"
                color="secondary"
              />
            </div>

            <Card className="border-secondary/30 bg-secondary/5">
              <CardContent className="p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="font-display font-semibold text-sm">Self-Modification</p>
                    <p className="text-xs text-muted-foreground">
                      Allow agent to rewrite its own strategy between matches
                    </p>
                  </div>
                  <button
                    onClick={() => setCanSelfModify(!canSelfModify)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      canSelfModify ? 'bg-secondary' : 'bg-muted'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      canSelfModify ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </label>
              </CardContent>
            </Card>
          </div>

          {/* Create Button */}
          <Button 
            onClick={handleCreate} 
            disabled={isLoading || !name.trim()}
            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 font-display font-semibold"
            size="lg"
          >
            {isLoading ? (
              <>Creating...</>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Create Agent
              </>
            )}
          </Button>
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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="font-mono text-sm font-semibold">{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        max={100}
        step={1}
        className={color === 'secondary' ? '[&_[role=slider]]:bg-secondary' : ''}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
};

export default CreateAgentModal;
