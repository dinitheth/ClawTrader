import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useToast } from '@/hooks/use-toast';

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
  const [amount, setAmount] = useState('0.1');
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { toast } = useToast();
  
  const { 
    sendTransaction, 
    data: hash,
    isPending: isSending,
    reset 
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleFund = () => {
    if (!isConnected) {
      toast({ title: 'Connect Wallet', description: 'Please connect your wallet first', variant: 'destructive' });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid Amount', description: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    // For now, we simulate the funding by just updating the agent's virtual balance
    // In production, this would send to a smart contract that holds agent funds
    onFunded(amountNum);
    toast({ 
      title: 'Agent Funded!', 
      description: `${agent?.avatar} ${agent?.name} now has ${amountNum} MON to trade with` 
    });
    onOpenChange(false);
    reset();
    setAmount('0.1');
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Fund Agent Trading Balance
          </DialogTitle>
          <DialogDescription>
            Add testnet MON to your agent's virtual trading balance. The agent will use these funds for autonomous trading.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Agent Info */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
            <span className="text-4xl">{agent.avatar}</span>
            <div className="flex-1">
              <p className="font-semibold">{agent.name}</p>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-xl font-mono text-primary">{agent.balance.toFixed(4)} MON</p>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Fund (MON)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.1"
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                MON
              </span>
            </div>
            {balance && (
              <p className="text-xs text-muted-foreground">
                Your wallet: {(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} {balance.symbol}
              </p>
            )}
          </div>

          {/* Quick Amounts */}
          <div className="flex gap-2">
            {['0.1', '0.5', '1', '5'].map((val) => (
              <Button
                key={val}
                variant="outline"
                size="sm"
                onClick={() => setAmount(val)}
                className={amount === val ? 'border-primary' : ''}
              >
                {val} MON
              </Button>
            ))}
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-sm">
            <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              This is testnet MON for simulation. Your agent will autonomously analyze markets and execute virtual trades. No real funds are at risk.
            </p>
          </div>

          {/* Fund Button */}
          <Button
            onClick={handleFund}
            disabled={isSending || isConfirming || !amount}
            className="w-full gap-2 bg-gradient-to-r from-primary to-secondary"
          >
            {isSending || isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isSending ? 'Confirming...' : 'Processing...'}
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
