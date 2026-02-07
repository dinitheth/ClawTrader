import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Rocket, Coins, Vote, Users, Sparkles, TrendingUp } from 'lucide-react';
import { launchAgentToken } from '@/lib/nadfun';
import { useToast } from '@/hooks/use-toast';

interface LaunchTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: {
    id: string;
    name: string;
    personality: string;
    avatar: string;
  };
  onSuccess?: () => void;
}

export function LaunchTokenModal({ open, onOpenChange, agent, onSuccess }: LaunchTokenModalProps) {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [isLaunching, setIsLaunching] = useState(false);

  const [tokenName, setTokenName] = useState(`${agent.name} Token`);
  const [tokenSymbol, setTokenSymbol] = useState(agent.name.slice(0, 4).toUpperCase());
  const [description, setDescription] = useState('');
  const [revenueShare, setRevenueShare] = useState([10]);
  const [governanceEnabled, setGovernanceEnabled] = useState(true);
  const [accessTier, setAccessTier] = useState<'public' | 'premium' | 'vip' | 'founder'>('premium');

  const handleLaunch = async () => {
    if (!isConnected || !address) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to launch a token',
        variant: 'destructive',
      });
      return;
    }

    setIsLaunching(true);
    try {
      const result = await launchAgentToken({
        agentId: agent.id,
        tokenName,
        tokenSymbol,
        description,
        revenueSharePercentage: revenueShare[0],
        governanceEnabled,
        accessTier,
        creatorWallet: address,
      });

      toast({
        title: '🚀 Token Launched!',
        description: `$${tokenSymbol} is now live on nad.fun`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Launch failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLaunching(false);
    }
  };

  const accessTierFeatures = {
    public: ['View stats', 'Watch matches'],
    premium: ['Early betting access', 'Strategy insights'],
    vip: ['Governance voting', 'Revenue share'],
    founder: ['DNA modification', 'Alliance control'],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto glass border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Rocket className="w-6 h-6 text-primary" />
            Launch Token on nad.fun
          </DialogTitle>
          <DialogDescription>
            Create a tradeable token for {agent.avatar} {agent.name}. Community can speculate on your agent's success!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Token Basics */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Token Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tokenName">Token Name</Label>
                <Input
                  id="tokenName"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="My Agent Token"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tokenSymbol">Symbol</Label>
                <Input
                  id="tokenSymbol"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="AGENT"
                  className="bg-background/50"
                  maxLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what makes this agent special..."
                className="bg-background/50 min-h-[80px]"
              />
            </div>
          </div>

          {/* Token Utilities */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Token Utilities
            </h3>

            {/* Revenue Share */}
            <div className="p-4 rounded-lg bg-background/30 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary" />
                  <span className="font-medium">Revenue Share</span>
                </div>
                <Badge variant="outline" className="text-primary">
                  {revenueShare[0]}% to holders
                </Badge>
              </div>
              <Slider
                value={revenueShare}
                onValueChange={setRevenueShare}
                min={0}
                max={50}
                step={5}
                className="py-2"
              />
              <p className="text-xs text-muted-foreground">
                Token holders receive a share of your agent's match winnings
              </p>
            </div>

            {/* Governance */}
            <div className="p-4 rounded-lg bg-background/30 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="w-5 h-5 text-secondary" />
                  <div>
                    <span className="font-medium">Governance</span>
                    <p className="text-xs text-muted-foreground">Holders can vote on strategy changes</p>
                  </div>
                </div>
                <Switch
                  checked={governanceEnabled}
                  onCheckedChange={setGovernanceEnabled}
                />
              </div>
            </div>

            {/* Access Tier */}
            <div className="p-4 rounded-lg bg-background/30 border border-border space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                <span className="font-medium">Access Tiers</span>
              </div>
              
              <Select value={accessTier} onValueChange={(v: any) => setAccessTier(v)}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Basic access for all</SelectItem>
                  <SelectItem value="premium">Premium - Tiered benefits</SelectItem>
                  <SelectItem value="vip">VIP - Exclusive perks</SelectItem>
                  <SelectItem value="founder">Founder - Full control</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-2 mt-3">
                {Object.entries(accessTierFeatures).map(([tier, features]) => (
                  <div
                    key={tier}
                    className={`p-2 rounded border text-xs ${
                      tier === accessTier 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border opacity-50'
                    }`}
                  >
                    <div className="font-medium capitalize mb-1">{tier}</div>
                    <ul className="text-muted-foreground space-y-0.5">
                      {features.map((f) => (
                        <li key={f}>• {f}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="text-4xl">{agent.avatar}</div>
              <div>
                <div className="font-bold text-lg">${tokenSymbol}</div>
                <div className="text-sm text-muted-foreground">{tokenName}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="flex items-center gap-1 text-primary">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-mono">Bonding Curve</span>
                </div>
                <div className="text-xs text-muted-foreground">Powered by nad.fun</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleLaunch}
            disabled={!isConnected || isLaunching || !tokenName || !tokenSymbol}
            className="flex-1 gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            {isLaunching ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Launch on nad.fun
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
