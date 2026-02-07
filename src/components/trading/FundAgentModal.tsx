import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowRight, Loader2, AlertCircle, DollarSign } from 'lucide-react';
import { useAccount, useReadContract } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { USDC_CONFIG, ERC20_ABI, formatUSDC } from '@/lib/usdc-config';

interface FundAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: {
    id: string;
    name: string;
    avatar: string;
    balance: number;
  } | null;
  onFunded: (amount: number) => void;
}

export function FundAgentModal({ open, onOpenChange, agent, onFunded }: FundAgentModalProps) {
  const [amount, setAmount] = useState('100');
  const [isProcessing, setIsProcessing] = useState(false);
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  // Read wallet USDC balance
  const { data: walletUSDCBalance } = useReadContract({
    address: USDC_CONFIG.contractAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && USDC_CONFIG.contractAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  const handleFund = async () => {
    if (!isConnected) {
      toast({ title: 'Connect Wallet', description: 'Please connect your wallet first', variant: 'destructive' });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid Amount', description: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);

    try {
      // For now, we simulate the funding by just updating the agent's virtual balance
      // In production, this would transfer USDC to the agent's smart contract wallet
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing
      
      onFunded(amountNum);
      toast({ 
        title: 'Agent Funded!', 
        description: `${agent?.avatar} ${agent?.name} now has ${(agent?.balance || 0) + amountNum} USDC to trade with` 
      });
      onOpenChange(false);
      setAmount('100');
    } catch (error) {
      console.error('Fund error:', error);
      toast({ 
        title: 'Funding Failed', 
        description: 'Failed to fund agent. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!agent) return null;

  const formattedWalletBalance = walletUSDCBalance 
    ? formatUSDC(walletUSDCBalance as bigint)
    : '0.00';

  const isContractConfigured = USDC_CONFIG.contractAddress !== '0x0000000000000000000000000000000000000000';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Fund Agent Trading Balance
          </DialogTitle>
          <DialogDescription>
            Add USDC to your agent's trading balance. The agent will use these funds for autonomous trading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Agent Info */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
            <span className="text-4xl">{agent.avatar}</span>
            <div className="flex-1">
              <p className="font-semibold">{agent.name}</p>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-xl font-mono text-primary">{agent.balance.toFixed(2)} USDC</p>
            </div>
          </div>

          {/* Wallet Balance */}
          {isConnected && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm">Your Wallet USDC</span>
              </div>
              <span className="font-mono font-semibold">{formattedWalletBalance} USDC</span>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Fund (USDC)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="1"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                USDC
              </span>
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="flex gap-2">
            {['50', '100', '500', '1000'].map((val) => (
              <Button
                key={val}
                variant="outline"
                size="sm"
                onClick={() => setAmount(val)}
                className={amount === val ? 'border-primary' : ''}
              >
                {val} USDC
              </Button>
            ))}
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-sm">
            <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              {isContractConfigured 
                ? 'USDC will be transferred from your wallet to the agent\'s trading vault. The agent will autonomously trade and manage profits.'
                : 'USDC contract not configured yet. For now, this uses virtual balance for testing. Once the USDC contract is deployed, real transfers will be enabled.'}
            </p>
          </div>

          {/* Fund Button */}
          <Button
            onClick={handleFund}
            disabled={isProcessing || !amount}
            className="w-full gap-2 bg-gradient-to-r from-primary to-secondary"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Fund Agent
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
