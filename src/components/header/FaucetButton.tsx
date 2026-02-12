import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Droplets, Loader2, CheckCircle, Clock } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { CONTRACTS, isContractConfigured } from '@/lib/contracts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const FAUCET_AMOUNT = 1000;
const COOLDOWN_DURATION = 60 * 60; // 1 hour in seconds

// TestUSDC faucet ABI
const FAUCET_ABI = [
  {
    name: 'faucet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'canClaimFaucet',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'timeUntilNextClaim',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

function formatTime(seconds: number): string {
  if (seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  }
  return `${mins}m ${secs}s`;
}

// Get remaining cooldown from localStorage
function getLocalCooldown(address: string): number {
  const key = `faucet_lastClaim_${address}`;
  const lastClaim = localStorage.getItem(key);
  if (!lastClaim) return 0;

  const lastClaimTime = parseInt(lastClaim, 10);
  const elapsed = Math.floor((Date.now() - lastClaimTime) / 1000);
  const remaining = COOLDOWN_DURATION - elapsed;
  return remaining > 0 ? remaining : 0;
}

// Save claim timestamp to localStorage
function saveClaimTimestamp(address: string) {
  const key = `faucet_lastClaim_${address}`;
  localStorage.setItem(key, Date.now().toString());
}

export function FaucetButton() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [claimed, setClaimed] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const isContractReady = isContractConfigured('USDC');

  // Initialize countdown from localStorage on mount
  useEffect(() => {
    if (address) {
      const localCooldown = getLocalCooldown(address);
      if (localCooldown > 0) {
        setCountdown(localCooldown);
      }
    }
  }, [address]);

  // Check if user can claim
  const { data: canClaim, refetch: refetchCanClaim } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: FAUCET_ABI,
    functionName: 'canClaimFaucet',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isContractReady,
      refetchInterval: 10000, // Check every 10 seconds
    },
  });

  // Get time until next claim
  const { data: timeUntilClaim, refetch: refetchTime } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: FAUCET_ABI,
    functionName: 'timeUntilNextClaim',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isContractReady && canClaim === false,
      refetchInterval: 30000,
    },
  });

  // Update countdown timer
  useEffect(() => {
    if (timeUntilClaim !== undefined) {
      setCountdown(Number(timeUntilClaim));
    }
  }, [timeUntilClaim]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          refetchCanClaim();
          refetchTime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, refetchCanClaim, refetchTime]);

  // Write contract hook for faucet call
  const {
    writeContract,
    data: hash,
    isPending: isWriting,
    error: writeError
  } = useWriteContract();

  // Wait for transaction confirmation
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({ hash });

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && address) {
      setClaimed(true);
      // Save claim time to localStorage for cooldown tracking
      saveClaimTimestamp(address);
      // Start countdown immediately
      setCountdown(COOLDOWN_DURATION);

      toast({
        title: '🎉 USDC Claimed!',
        description: `${FAUCET_AMOUNT} USDC has been added to your wallet. Next claim available in 1 hour.`,
      });
      setTimeout(() => {
        setClaimed(false);
        refetchCanClaim();
        refetchTime();
      }, 5000);
    }
  }, [isConfirmed, address, toast, refetchCanClaim, refetchTime]);

  // Handle errors
  useEffect(() => {
    if (writeError || confirmError) {
      const error = writeError || confirmError;
      const message = error?.message || 'Unknown error';

      // Check for cooldown error
      if (message.includes('cooldown') || message.includes('Faucet:')) {
        toast({
          title: '⏰ Cooldown Active',
          description: `You can claim again in ${countdown > 0 ? formatTime(countdown) : '1 hour'}`,
          variant: 'destructive',
        });
        refetchTime();
      } else {
        toast({
          title: 'Claim Failed',
          description: 'Unable to claim USDC. Please try again later.',
          variant: 'destructive',
        });
      }
      console.error('Faucet error:', error);
    }
  }, [writeError, confirmError, toast, countdown, refetchTime]);

  const handleClaim = async () => {
    if (!isConnected || !address) {
      toast({
        title: 'Connect Wallet',
        description: 'Please connect your wallet to claim USDC',
        variant: 'destructive',
      });
      return;
    }

    if (!isContractReady) {
      toast({
        title: 'Contract Not Ready',
        description: 'USDC contract is not configured',
        variant: 'destructive',
      });
      return;
    }

    if (canClaim === false) {
      toast({
        title: '⏰ Cooldown Active',
        description: `You can claim again in ${countdown > 0 ? formatTime(countdown) : 'about 1 hour'}`,
        variant: 'destructive',
      });
      return;
    }

    // Call on-chain faucet
    writeContract({
      address: CONTRACTS.USDC.address,
      abi: FAUCET_ABI,
      functionName: 'faucet',
    });
  };

  const isClaiming = isWriting || isConfirming;
  // Use countdown > 0 as primary check (from localStorage or contract)
  // Also check canClaim === false from contract as backup
  const onCooldown = countdown > 0 || canClaim === false;

  const buttonContent = (
    <Button
      onClick={handleClaim}
      disabled={isClaiming || claimed || !isConnected || onCooldown}
      variant={onCooldown ? "outline" : "default"}
      size="sm"
      className={`rounded-full h-9 px-4 gap-2 font-medium shadow-md ${onCooldown
        ? 'border-yellow-500/50 text-yellow-500'
        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
        }`}
    >
      {isClaiming ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="hidden sm:inline">{isConfirming ? 'Confirming...' : 'Claiming...'}</span>
          <span className="sm:hidden">...</span>
        </>
      ) : claimed ? (
        <>
          <CheckCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Claimed!</span>
          <span className="sm:hidden">Done</span>
        </>
      ) : onCooldown ? (
        <>
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">{formatTime(countdown)}</span>
          <span className="sm:hidden">{formatTime(countdown)}</span>
        </>
      ) : (
        <>
          <Droplets className="w-4 h-4" />
          <span className="hidden sm:inline">Get USDC</span>
          <span className="sm:hidden">USDC</span>
        </>
      )}
    </Button>
  );

  if (onCooldown) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent>
            <p>Faucet cooldown: {formatTime(countdown)} remaining</p>
            <p className="text-xs text-muted-foreground">Claim {FAUCET_AMOUNT} USDC every hour</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
}
