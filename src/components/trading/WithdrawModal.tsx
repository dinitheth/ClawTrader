import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDown, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS, AGENT_VAULT_ABI, uuidToBytes32, parseUSDC, isContractConfigured } from '@/lib/contracts';
import { useAgentVaultBalance } from '@/hooks/useAgentVaultBalance';

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: {
    id: string;
    name: string;
    avatar: string;
  } | null;
  onWithdrawn: (amount: number) => void;
}

export function WithdrawModal({ open, onOpenChange, agent, onWithdrawn }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { toast } = useToast();
  const { isConnected } = useAccount();

  // Check if contracts are configured
  const isVaultConfigured = isContractConfigured('AGENT_VAULT');

  // Get ON-CHAIN balance from AgentVault
  const { balance: onChainBalance, isLoading: isBalanceLoading, refetch: refetchBalance } = useAgentVaultBalance({
    agentId: agent?.id || '',
    refetchInterval: 10000,
  });

  // Withdraw from vault
  const {
    writeContract: writeWithdraw,
    data: withdrawHash,
    isPending: isWithdrawPending,
    reset: resetWithdraw
  } = useWriteContract();

  // Wait for withdraw transaction
  const { isLoading: isWaitingWithdraw, isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  });

  // Handle withdraw success
  useEffect(() => {
    if (withdrawSuccess && isWithdrawing) {
      const withdrawAmount = parseFloat(amount);
      onWithdrawn(withdrawAmount);
      refetchBalance(); // Refresh on-chain balance
      toast({
        title: 'Withdrawal Successful!',
        description: `Withdrew ${withdrawAmount.toFixed(2)} USDC from ${agent?.name} to your wallet`,
      });
      setAmount('');
      setIsWithdrawing(false);
      resetWithdraw();
      onOpenChange(false);
    }
  }, [withdrawSuccess, isWithdrawing]);

  const handleWithdraw = async () => {
    if (!agent) return;

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount to withdraw',
        variant: 'destructive',
      });
      return;
    }

    if (withdrawAmount > onChainBalance) {
      toast({
        title: 'Insufficient Balance',
        description: `Agent only has ${onChainBalance.toFixed(2)} USDC available on-chain`,
        variant: 'destructive',
      });
      return;
    }

    if (!isVaultConfigured || !isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to withdraw',
        variant: 'destructive',
      });
      return;
    }

    setIsWithdrawing(true);

    try {
      const amountWei = parseUSDC(withdrawAmount);
      const agentIdBytes32 = uuidToBytes32(agent.id);

      writeWithdraw({
        address: CONTRACTS.AGENT_VAULT.address,
        abi: AGENT_VAULT_ABI,
        functionName: 'withdraw',
        args: [agentIdBytes32, amountWei],
      });
    } catch (err) {
      console.error('Withdraw error:', err);
      toast({
        title: 'Withdrawal Failed',
        description: 'Failed to withdraw from vault. Please try again.',
        variant: 'destructive',
      });
      setIsWithdrawing(false);
    }
  };

  const handleMaxAmount = () => {
    setAmount(onChainBalance.toString());
  };

  const isProcessing = isWithdrawing || isWithdrawPending || isWaitingWithdraw;

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!isProcessing) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-destructive" />
            Withdraw from Agent
          </DialogTitle>
          <DialogDescription>
            Withdraw USDC from your agent's on-chain vault to your wallet
          </DialogDescription>
        </DialogHeader>

        {agent && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl">
                  {agent.avatar}
                </div>
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-muted-foreground">On-Chain Vault</p>
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">On-Chain Balance</p>
                <p className="text-2xl font-mono font-bold text-accent">
                  {isBalanceLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  ) : (
                    `${onChainBalance.toFixed(2)} USDC`
                  )}
                </p>
              </div>
            </div>

            {/* Transaction Progress */}
            {isProcessing && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border">
                {withdrawSuccess ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
                <span className="text-sm">
                  {withdrawSuccess ? 'Withdrawal complete!' : 'Processing withdrawal...'}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Withdraw Amount (USDC)</Label>
              <div className="relative">
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16"
                  min="0"
                  max={onChainBalance}
                  step="0.01"
                  disabled={isProcessing}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                  onClick={handleMaxAmount}
                  disabled={isProcessing}
                >
                  MAX
                </Button>
              </div>
            </div>

            {parseFloat(amount) > onChainBalance && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Amount exceeds available balance</span>
              </div>
            )}

            <Button
              onClick={handleWithdraw}
              disabled={isProcessing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > onChainBalance || !isConnected}
              className="w-full gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isWaitingWithdraw ? 'Confirming...' : 'Processing...'}
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4" />
                  Withdraw USDC
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
