import { useState, useEffect, useCallback } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Clock, Loader2, Wallet, Droplets, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { monadTestnet } from "@/lib/wagmi";
import { parseError, formatErrorForDisplay, ErrorCode, createError } from "@/lib/errors";

const CLAW_TOKEN_ADDRESS = "" as const;
const FAUCET_COOLDOWN_MS = 60 * 60 * 1000;

export function ClawFaucetCard() {
  const { address, isConnected } = useAccount();
  const [countdown, setCountdown] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastClaimTime, setLastClaimTime] = useState<number | null>(null);

  const { data: nativeBalance, isError: balanceError } = useBalance({
    address,
    chainId: monadTestnet.id,
  });

  useEffect(() => {
    if (address) {
      try {
        const stored = localStorage.getItem(`claw-faucet-${address}`);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed)) {
            setLastClaimTime(parsed);
          }
        }
      } catch {
        // localStorage not available
      }
    }
  }, [address]);

  useEffect(() => {
    if (!lastClaimTime) {
      setCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const elapsed = Date.now() - lastClaimTime;
      const remaining = Math.max(0, FAUCET_COOLDOWN_MS - elapsed);
      setCountdown(Math.ceil(remaining / 1000));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [lastClaimTime]);

  const canClaim = countdown === 0;
  const isContractDeployed = CLAW_TOKEN_ADDRESS.length > 0;

  const handleClaim = useCallback(async () => {
    setError(null);

    if (!isContractDeployed) {
      const appError = createError(ErrorCode.CONTRACT_ERROR, "Contract not deployed yet");
      const { description } = formatErrorForDisplay(appError);
      setError(description);
      toast({ title: "Contract Not Deployed", description, variant: "destructive" });
      return;
    }

    if (!canClaim) {
      const appError = createError(ErrorCode.FAUCET_COOLDOWN);
      const { description } = formatErrorForDisplay(appError);
      toast({ title: "Cooldown Active", description, variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // Contract call would go here
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const now = Date.now();
      setLastClaimTime(now);
      if (address) {
        try {
          localStorage.setItem(`claw-faucet-${address}`, now.toString());
        } catch {
          // localStorage not available
        }
      }

      toast({
        title: "CLAW Tokens Claimed",
        description: "1,000 CLAW tokens have been added to your wallet.",
      });
    } catch (err) {
      const appError = parseError(err);
      const { title, description } = formatErrorForDisplay(appError);
      setError(description);
      toast({ title, description, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [address, canClaim, isContractDeployed]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader className="pb-3 px-4 md:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Droplets className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            CLAW Faucet
          </CardTitle>
          <Badge variant="outline" className="text-[10px] md:text-xs">
            Testnet
          </Badge>
        </div>
        <CardDescription className="text-xs md:text-sm">
          Claim 1,000 CLAW tokens every hour
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-4 md:pb-6">
        {!isConnected ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Wallet className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
            <p className="text-xs md:text-sm text-muted-foreground">
              Connect your wallet to claim tokens
            </p>
          </div>
        ) : (
          <>
            {/* Balance Display */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 md:p-4">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                <span className="text-xs md:text-sm text-muted-foreground">
                  {isContractDeployed ? "CLAW" : "MON"} Balance
                </span>
              </div>
              <span className="font-mono text-sm md:text-base font-medium">
                {balanceError ? (
                  <span className="text-muted-foreground">--</span>
                ) : nativeBalance ? (
                  `${parseFloat(formatEther(nativeBalance.value)).toFixed(4)}`
                ) : (
                  "0"
                )}
              </span>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            {/* Claim Button or Countdown */}
            {canClaim ? (
              <Button
                onClick={handleClaim}
                disabled={isLoading || !isContractDeployed}
                className="w-full gap-2"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Droplets className="h-4 w-4" />
                    Claim 1,000 CLAW
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button disabled className="w-full gap-2" size="lg" variant="secondary">
                  <Clock className="h-4 w-4" />
                  Next claim in {formatTime(countdown)}
                </Button>
                <p className="text-center text-[10px] md:text-xs text-muted-foreground">
                  Cooldown expires in {formatTime(countdown)}
                </p>
              </div>
            )}
          </>
        )}

        {!isContractDeployed && isConnected && (
          <div className="rounded-lg border border-muted bg-muted/30 p-3">
            <p className="text-center text-[10px] md:text-xs text-muted-foreground">
              Contract not deployed. Deploy ClawToken.sol first.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
