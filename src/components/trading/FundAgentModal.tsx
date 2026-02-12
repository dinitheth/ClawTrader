import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, ArrowRight, Loader2, AlertCircle, DollarSign, CheckCircle } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { CONTRACTS, USDC_ABI, AGENT_VAULT_ABI, uuidToBytes32, formatUSDC, parseUSDC, isContractConfigured } from '@/lib/contracts';
import { useAgentVaultBalance } from '@/hooks/useAgentVaultBalance';

interface FundAgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: {
    id: string;
    name: string;
    avatar: string;
  } | null;
  onFunded: (amount: number) => void;
}

type FundingStep = 'idle' | 'approving' | 'approved' | 'depositing' | 'complete';

export function FundAgentModal({ open, onOpenChange, agent, onFunded }: FundAgentModalProps) {
  const [amount, setAmount] = useState('100');
  const [step, setStep] = useState<FundingStep>('idle');
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  // Check if contracts are configured
  const isUSDCConfigured = isContractConfigured('USDC');
  const isVaultConfigured = isContractConfigured('AGENT_VAULT');
  const isContractsReady = isUSDCConfigured && isVaultConfigured;

  // Get ON-CHAIN balance from AgentVault
  const { balance: onChainBalance, isLoading: isBalanceLoading, refetch: refetchVaultBalance } = useAgentVaultBalance({
    agentId: agent?.id || '',
    refetchInterval: 10000,
  });

  // Read wallet USDC balance
  const { data: walletUSDCBalance, refetch: refetchWalletBalance } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isUSDCConfigured,
    },
  });

  // Read current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.AGENT_VAULT.address] : undefined,
    query: {
      enabled: !!address && isContractsReady,
    },
  });

  // Approve USDC spending
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApproving,
    reset: resetApprove
  } = useWriteContract();

  // Deposit to vault
  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositing,
    reset: resetDeposit
  } = useWriteContract();

  // Wait for approve transaction
  const { isLoading: isWaitingApprove, isSuccess: approveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Wait for deposit transaction
  const { isLoading: isWaitingDeposit, isSuccess: depositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // Handle approve success -> proceed to deposit
  useEffect(() => {
    if (approveSuccess && step === 'approving') {
      setStep('approved');
      refetchAllowance();
      // Auto-proceed to deposit
      handleDeposit();
    }
  }, [approveSuccess, step]);

  // Handle deposit success
  useEffect(() => {
    if (depositSuccess && step === 'depositing') {
      setStep('complete');
      const amountNum = parseFloat(amount);
      onFunded(amountNum);
      refetchWalletBalance();
      toast({
        title: 'Agent Funded!',
        description: `${agent?.avatar} ${agent?.name} received ${amount} USDC on-chain!`
      });
      // Close modal after a brief moment
      setTimeout(() => {
        onOpenChange(false);
        resetModal();
      }, 1500);
    }
  }, [depositSuccess, step]);

  const resetModal = () => {
    setStep('idle');
    setAmount('100');
    resetApprove();
    resetDeposit();
  };

  const handleFund = async () => {
    if (!isConnected || !agent) {
      toast({ title: 'Connect Wallet', description: 'Please connect your wallet first', variant: 'destructive' });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ title: 'Invalid Amount', description: 'Enter a valid amount', variant: 'destructive' });
      return;
    }

    // Contracts MUST be ready for funding
    if (!isContractsReady) {
      toast({
        title: 'Contracts Not Ready',
        description: 'Please wait for contracts to load or connect your wallet',
        variant: 'destructive'
      });
      return;
    }

    const amountWei = parseUSDC(amountNum);
    const agentIdBytes32 = uuidToBytes32(agent.id);

    // Check if we need approval
    const needsApproval = !currentAllowance || currentAllowance < amountWei;

    if (needsApproval) {
      // Step 1: Approve
      setStep('approving');
      try {
        writeApprove({
          address: CONTRACTS.USDC.address,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [CONTRACTS.AGENT_VAULT.address, amountWei],
        });
      } catch (err) {
        console.error('Approve error:', err);
        toast({ title: 'Approval Failed', description: 'Failed to approve USDC spending', variant: 'destructive' });
        setStep('idle');
      }
    } else {
      // Skip approval, go directly to deposit
      handleDeposit();
    }
  };

  const handleDeposit = () => {
    if (!agent) return;

    const amountNum = parseFloat(amount);
    const amountWei = parseUSDC(amountNum);
    const agentIdBytes32 = uuidToBytes32(agent.id);

    setStep('depositing');
    try {
      writeDeposit({
        address: CONTRACTS.AGENT_VAULT.address,
        abi: AGENT_VAULT_ABI,
        functionName: 'deposit',
        args: [agentIdBytes32, amountWei],
      });
    } catch (err) {
      console.error('Deposit error:', err);
      toast({ title: 'Deposit Failed', description: 'Failed to deposit USDC to vault', variant: 'destructive' });
      setStep('idle');
    }
  };

  if (!agent) return null;

  const formattedWalletBalance = walletUSDCBalance
    ? formatUSDC(walletUSDCBalance as bigint)
    : '0.00';

  const isProcessing = step !== 'idle' && step !== 'complete';
  const showSteps = isContractsReady && step !== 'idle';

  return (
    <Dialog open={open} onOpenChange={(open) => { if (!isProcessing) onOpenChange(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Fund Agent Trading Balance
          </DialogTitle>
          <DialogDescription>
            {isContractsReady
              ? 'Deposit USDC from your wallet to the agent\'s on-chain vault.'
              : 'Add USDC to your agent\'s trading balance (demo mode until contracts are deployed).'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Agent Info */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 border border-border">
            <span className="text-4xl">{agent.avatar}</span>
            <div className="flex-1">
              <p className="font-semibold">{agent.name}</p>
              <p className="text-sm text-muted-foreground">On-Chain Balance</p>
              <p className="text-xl font-mono text-primary">
                {isBalanceLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                ) : (
                  `${onChainBalance.toFixed(2)} USDC`
                )}
              </p>
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

          {/* Transaction Steps Progress */}
          {showSteps && (
            <div className="space-y-2 p-3 rounded-lg bg-muted/30 border">
              <div className="flex items-center gap-2">
                {step === 'approving' || isWaitingApprove ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : step === 'approved' || step === 'depositing' || step === 'complete' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={step === 'approving' || isWaitingApprove ? 'text-primary' : ''}>
                  Step 1: Approve USDC
                </span>
              </div>
              <div className="flex items-center gap-2">
                {step === 'depositing' || isWaitingDeposit ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : step === 'complete' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground" />
                )}
                <span className={step === 'depositing' || isWaitingDeposit ? 'text-primary' : ''}>
                  Step 2: Deposit to Vault
                </span>
              </div>
            </div>
          )}

          {/* Amount Input */}
          {!showSteps && (
            <>
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
                    disabled={isProcessing}
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
                    disabled={isProcessing}
                  >
                    {val} USDC
                  </Button>
                ))}
              </div>
            </>
          )}

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 text-sm">
            <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">
              {isContractsReady
                ? 'USDC will be transferred from your wallet to the agent\'s on-chain vault. You will need to approve two transactions.'
                : 'Contracts not deployed yet. Using simulated balance for testing.'}
            </p>
          </div>

          {/* Fund Button */}
          <Button
            onClick={handleFund}
            disabled={isProcessing || !amount || step === 'complete'}
            className="w-full gap-2 bg-gradient-to-r from-primary to-secondary"
          >
            {step === 'complete' ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Funded Successfully!
              </>
            ) : isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {step === 'approving' ? 'Approving...' : 'Depositing...'}
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

