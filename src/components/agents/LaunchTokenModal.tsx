import { useState } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Rocket, Coins, Vote, Users, Sparkles, TrendingUp, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  CONTRACTS,
  AGENT_FACTORY_ABI,
  BONDING_CURVE_ROUTER_ABI,
  CURVE_CREATE_EVENT_ABI,
  uuidToBytes32,
} from '@/lib/contracts';
import { NAD_CONTRACTS } from '@/lib/wagmi';
import { decodeEventLog } from 'viem';

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

type TxStep = 'idle' | 'creating' | 'confirming' | 'linking' | 'linking-confirm' | 'saving' | 'done';

const STEP_LABELS: Record<TxStep, string> = {
  idle: '',
  creating: 'Sign token creation in wallet...',
  confirming: 'Confirming on Monad blockchain...',
  linking: 'Linking token to agent on-chain...',
  'linking-confirm': 'Confirming link transaction...',
  saving: 'Saving to database...',
  done: 'Token launched!',
};

export function LaunchTokenModal({ open, onOpenChange, agent, onSuccess }: LaunchTokenModalProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { toast } = useToast();

  const [isLaunching, setIsLaunching] = useState(false);
  const [txStep, setTxStep] = useState<TxStep>('idle');

  const [tokenName, setTokenName] = useState(`${agent.name} Token`);
  const [tokenSymbol, setTokenSymbol] = useState(agent.name.replace(/\s/g, '').slice(0, 5).toUpperCase());
  const [description, setDescription] = useState('');
  const [revenueShare, setRevenueShare] = useState([10]);
  const [governanceEnabled, setGovernanceEnabled] = useState(true);
  const [accessTier, setAccessTier] = useState<'public' | 'premium' | 'vip' | 'founder'>('premium');

  const FACTORY_ADDRESS = CONTRACTS.AGENT_FACTORY.address;
  const ROUTER_ADDRESS = NAD_CONTRACTS.BONDING_CURVE_ROUTER as `0x${string}`;
  const agentIdBytes32 = uuidToBytes32(agent.id);

  const handleLaunch = async () => {
    if (!isConnected || !address) {
      toast({ title: 'Wallet not connected', description: 'Please connect your wallet to launch a token', variant: 'destructive' });
      return;
    }
    if (!tokenName.trim() || !tokenSymbol.trim()) {
      toast({ title: 'Missing fields', description: 'Token name and symbol are required', variant: 'destructive' });
      return;
    }

    setIsLaunching(true);
    let tokenAddress: `0x${string}` | null = null;

    try {
      // ═══ nad.fun Official 4-Step Token Creation Flow ═══
      // Ref: https://nad.fun/create.md

      const NAD_API_URL = 'https://dev-api.nad.fun'; // testnet API

      // ═══ Step 1: Generate & upload token image to nad.fun API ═══
      setTxStep('creating');
      console.log('Step 1: Generating token image from agent avatar...');

      // Generate a 512x512 PNG from the agent's emoji avatar
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Dark gradient background
      const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 360);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#0f0f23');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);

      // Draw emoji avatar large and centered
      ctx.font = '200px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(agent.avatar || '🦞', 256, 240);

      // Draw token symbol below
      ctx.font = 'bold 48px sans-serif';
      ctx.fillStyle = '#00ff88';
      ctx.fillText(`$${tokenSymbol}`, 256, 420);

      // Convert canvas to PNG blob
      const imageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/png');
      });

      console.log('Uploading image to nad.fun API...');
      const imageRes = await fetch(`${NAD_API_URL}/agent/token/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        body: imageBlob,
      });

      if (!imageRes.ok) {
        const errText = await imageRes.text();
        throw new Error(`Image upload failed: ${errText}`);
      }

      const { image_uri } = await imageRes.json();
      console.log('Image URI:', image_uri);

      // ═══ Step 2: Upload metadata to nad.fun API ═══
      console.log('Step 2: Uploading metadata to nad.fun API...');

      const metadataPayload = {
        image_uri,
        name: tokenName,
        symbol: tokenSymbol,
        description: description || `AI Trading Agent token for ${agent.name}`,
      };

      const metadataRes = await fetch(`${NAD_API_URL}/agent/token/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadataPayload),
      });

      if (!metadataRes.ok) {
        const errText = await metadataRes.text();
        throw new Error(`Metadata upload failed: ${errText}`);
      }

      const { metadata_uri } = await metadataRes.json();
      console.log('Metadata URI:', metadata_uri);

      // ═══ Step 3: Mine salt via nad.fun API ═══
      console.log('Step 3: Mining salt...');

      const saltRes = await fetch(`${NAD_API_URL}/agent/salt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator: address,
          name: tokenName,
          symbol: tokenSymbol,
          metadata_uri,
        }),
      });

      if (!saltRes.ok) {
        const errText = await saltRes.text();
        throw new Error(`Salt mining failed: ${errText}`);
      }

      const { salt, address: predictedAddress } = await saltRes.json();
      console.log('Salt:', salt, 'Predicted token address:', predictedAddress);

      // ═══ Step 4: Get deploy fee from Curve contract ═══
      console.log('Step 4: Fetching deploy fee from Curve contract...');

      const CURVE_ADDRESS = NAD_CONTRACTS.CURVE as `0x${string}`;
      let deployFeeAmount: bigint;

      try {
        if (publicClient) {
          const feeConfig = await publicClient.readContract({
            address: CURVE_ADDRESS,
            abi: [{
              name: 'feeConfig',
              type: 'function',
              stateMutability: 'view',
              inputs: [],
              outputs: [
                { name: 'deployFeeAmount', type: 'uint256' },
                { name: 'graduateFeeAmount', type: 'uint256' },
                { name: 'protocolFee', type: 'uint24' },
              ],
            }],
            functionName: 'feeConfig',
          });
          deployFeeAmount = (feeConfig as any)[0] as bigint;
          console.log('Deploy fee from contract:', deployFeeAmount.toString());
        } else {
          // Fallback: testnet deploy fee = 10 MON (verified via RPC)
          deployFeeAmount = BigInt('10000000000000000000');
          console.log('Using fallback deploy fee: 10 MON');
        }
      } catch (feeErr) {
        console.warn('Could not read feeConfig, using fallback:', feeErr);
        deployFeeAmount = BigInt('10000000000000000000');
      }

      // ═══ Step 4: Create token on-chain via BondingCurveRouter ═══
      console.log('Step 4: Creating token on-chain...');

      const createTxHash = await writeContractAsync({
        address: ROUTER_ADDRESS,
        abi: BONDING_CURVE_ROUTER_ABI,
        functionName: 'create',
        args: [{
          name: tokenName,
          symbol: tokenSymbol,
          tokenURI: metadata_uri,
          amountOut: BigInt(0), // No initial buy
          salt: salt as `0x${string}`,
          actionId: 1, // Must be 1 for token creation (per nad.fun docs)
        }],
        value: deployFeeAmount,
      });

      console.log('Create tx hash:', createTxHash);

      // ═══ Step 2: Wait for confirmation & parse CurveCreate event ═══
      setTxStep('confirming');
      let receipt: any = null;
      if (publicClient) {
        receipt = await publicClient.waitForTransactionReceipt({ hash: createTxHash });
        console.log('Token creation receipt:', receipt);
        console.log('Receipt status:', receipt.status);
        console.log('Receipt logs count:', receipt.logs.length);

        // Check if the transaction reverted
        if (receipt.status === 'reverted') {
          throw new Error('Transaction reverted on-chain. The deploy fee may be insufficient or the salt/params are invalid. Check the tx on explorer: ' + createTxHash);
        }

        // Strategy 1: Parse CurveCreate event from ANY log (event may come from BondingCurve, not Router)
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: CURVE_CREATE_EVENT_ABI,
              data: log.data,
              topics: log.topics,
              strict: false,
            });
            if (decoded.eventName === 'CurveCreate' && decoded.args) {
              tokenAddress = (decoded.args as any).token as `0x${string}`;
              console.log('Token address from CurveCreate event:', tokenAddress);
              break;
            }
          } catch {
            // Not a CurveCreate event, skip
          }
        }

        // Strategy 2: Look for logs with indexed token address (topic[2] in CurveCreate)
        if (!tokenAddress) {
          for (const log of receipt.logs) {
            // CurveCreate has 3 topics: event sig, creator (indexed), token (indexed)
            if (log.topics && log.topics.length >= 3) {
              const possibleAddr = `0x${log.topics[2]?.slice(26)}` as `0x${string}`;
              // Validate it looks like an address (not zero address)
              if (possibleAddr && possibleAddr !== '0x0000000000000000000000000000000000000000') {
                tokenAddress = possibleAddr;
                console.log('Token address from topic[2]:', tokenAddress);
                break;
              }
            }
          }
        }

        // Strategy 3: Check for Transfer events (token minting creates a Transfer from 0x0)
        if (!tokenAddress) {
          for (const log of receipt.logs) {
            if (log.topics && log.topics.length >= 1) {
              // Transfer event signature: Transfer(address,address,uint256)
              const transferSig = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
              if (log.topics[0] === transferSig && log.topics[1]?.endsWith('0'.repeat(40))) {
                // This is a mint Transfer — the log.address is the new token contract
                tokenAddress = log.address as `0x${string}`;
                console.log('Token address from Transfer mint event:', tokenAddress);
                break;
              }
            }
          }
        }
      }

      // Fallback: Use predicted address from salt mining
      if (!tokenAddress && predictedAddress) {
        tokenAddress = predictedAddress as `0x${string}`;
        console.log('Using predicted address from salt mining:', tokenAddress);
      }

      if (!tokenAddress) {
        throw new Error('Could not determine token address from transaction. Check tx: ' + createTxHash);
      }

      // ═══ Step 3: Link token to agent on AgentFactory ═══
      setTxStep('linking');
      const linkTxHash = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: AGENT_FACTORY_ABI,
        functionName: 'setAgentToken',
        args: [agentIdBytes32, tokenAddress],
      });

      setTxStep('linking-confirm');
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: linkTxHash });
      }

      // ═══ Step 4: Save to Supabase ═══
      setTxStep('saving');
      const { error: dbError } = await supabase
        .from('agents')
        .update({
          token_address: tokenAddress,
          token_name: tokenName,
          token_symbol: tokenSymbol,
          token_market_cap: 0,
          token_holders: 1,
          revenue_share_enabled: revenueShare[0] > 0,
          revenue_share_percentage: revenueShare[0],
          governance_enabled: governanceEnabled,
          access_tier: accessTier,
        })
        .eq('id', agent.id);

      if (dbError) {
        console.error('DB update error (token was created on-chain):', dbError);
      }

      // Also add creator as first token holder
      await supabase.from('agent_token_holders').upsert({
        agent_id: agent.id,
        holder_address: address,
        balance: 1000000,
        percentage: 100,
      }, { onConflict: 'agent_id,holder_address' }).select();

      setTxStep('done');

      toast({
        title: '🚀 Token Launched On-Chain!',
        description: `$${tokenSymbol} is live on nad.fun at ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
      });

      onSuccess?.();

      // Small delay so user sees 'done' state
      setTimeout(() => {
        onOpenChange(false);
        setTxStep('idle');
      }, 1500);

    } catch (error: any) {
      console.error('Token launch error:', error);
      const msg = error?.message?.includes('User rejected') || error?.message?.includes('denied')
        ? 'Transaction rejected by wallet'
        : error?.message?.includes('Token already set')
          ? 'This agent already has a token linked'
          : error?.message?.includes('insufficient')
            ? 'Insufficient MON balance. You need ~10 MON for deployment.'
            : error?.message || 'Token launch failed. Please try again.';
      toast({ title: 'Launch Failed', description: msg, variant: 'destructive' });
      setTxStep('idle');
    } finally {
      setIsLaunching(false);
    }
  };

  const accessTierFeatures = {
    public: ['View stats', 'Watch matches'],
    premium: ['Early betting', 'Strategy insights'],
    vip: ['Governance voting', 'Revenue share'],
    founder: ['DNA modification', 'Alliance control'],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto glass border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="w-5 h-5 text-primary" />
            Launch Token on nad.fun
          </DialogTitle>
          <DialogDescription>
            Create a tradeable token for {agent.avatar} {agent.name} on the Monad blockchain via nad.fun bonding curve.
          </DialogDescription>
        </DialogHeader>

        {/* ═══ Horizontal 2-column layout ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">

          {/* LEFT COLUMN: Token Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Token Details</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tokenName" className="text-xs">Token Name</Label>
                <Input
                  id="tokenName"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="My Agent Token"
                  className="bg-background/50 h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tokenSymbol" className="text-xs">Symbol</Label>
                <Input
                  id="tokenSymbol"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="AGENT"
                  className="bg-background/50 h-9 text-sm"
                  maxLength={6}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what makes this agent special..."
                className="bg-background/50 min-h-[70px] text-sm"
              />
            </div>

            {/* Preview Card */}
            <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{agent.avatar}</div>
                <div>
                  <div className="font-bold">${tokenSymbol}</div>
                  <div className="text-xs text-muted-foreground">{tokenName}</div>
                </div>
                <div className="ml-auto text-right">
                  <div className="flex items-center gap-1 text-primary text-sm">
                    <TrendingUp className="w-3 h-3" />
                    <span className="font-mono text-xs">Bonding Curve</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">Powered by nad.fun</div>
                </div>
              </div>
            </div>

            {/* Deployment Info */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deploy Cost</span>
                <span className="font-mono">~10 MON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span>Monad Testnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Router</span>
                <span className="font-mono">{ROUTER_ADDRESS.slice(0, 6)}...{ROUTER_ADDRESS.slice(-4)}</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Token Utilities */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Token Utilities
            </h3>

            {/* Revenue Share */}
            <div className="p-3 rounded-lg bg-background/30 border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Revenue Share</span>
                </div>
                <Badge variant="outline" className="text-primary text-xs">
                  {revenueShare[0]}% to holders
                </Badge>
              </div>
              <Slider
                value={revenueShare}
                onValueChange={setRevenueShare}
                min={0}
                max={50}
                step={5}
                className="py-1"
              />
              <p className="text-[10px] text-muted-foreground">
                Token holders receive a share of your agent's match winnings
              </p>
            </div>

            {/* Governance */}
            <div className="p-3 rounded-lg bg-background/30 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4 text-secondary" />
                  <div>
                    <span className="text-sm font-medium">Governance</span>
                    <p className="text-[10px] text-muted-foreground">Holders can vote on strategy changes</p>
                  </div>
                </div>
                <Switch
                  checked={governanceEnabled}
                  onCheckedChange={setGovernanceEnabled}
                />
              </div>
            </div>

            {/* Access Tier */}
            <div className="p-3 rounded-lg bg-background/30 border border-border space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">Access Tiers</span>
              </div>

              <Select value={accessTier} onValueChange={(v: any) => setAccessTier(v)}>
                <SelectTrigger className="bg-background/50 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public - Basic access</SelectItem>
                  <SelectItem value="premium">Premium - Tiered benefits</SelectItem>
                  <SelectItem value="vip">VIP - Exclusive perks</SelectItem>
                  <SelectItem value="founder">Founder - Full control</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(accessTierFeatures).map(([tier, features]) => (
                  <div
                    key={tier}
                    className={`p-1.5 rounded border text-[10px] ${tier === accessTier
                      ? 'border-primary bg-primary/10'
                      : 'border-border opacity-50'
                      }`}
                  >
                    <div className="font-medium capitalize mb-0.5">{tier}</div>
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
        </div>

        {/* ═══ Transaction Progress ═══ */}
        {isLaunching && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {txStep === 'done' ? (
                <CheckCircle2 className="w-4 h-4 text-accent" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              )}
              {STEP_LABELS[txStep]}
            </div>
            <div className="flex gap-1">
              {(['creating', 'confirming', 'linking', 'linking-confirm', 'saving', 'done'] as TxStep[]).map((step, i) => (
                <div
                  key={step}
                  className={`h-1 flex-1 rounded-full ${(['creating', 'confirming', 'linking', 'linking-confirm', 'saving', 'done'] as TxStep[]).indexOf(txStep) >= i
                    ? 'bg-primary'
                    : 'bg-muted/30'
                    }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ═══ Action Buttons ═══ */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLaunching} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleLaunch}
            disabled={!isConnected || isLaunching || !tokenName || !tokenSymbol}
            className="flex-1 gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            {!isConnected ? (
              'Connect Wallet'
            ) : isLaunching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Launch on nad.fun (10 MON)
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
