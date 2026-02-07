import { useState, useEffect, useCallback } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Clock, Loader2, Droplets, AlertCircle } from "lucide-react";
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
    <Card className="rounded-2xl border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-primary" />
            </div>
            CLAW Faucet
          </CardTitle>
          <Badge variant="outline" className="text-xs rounded-full">
            Testnet
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Claim 1,000 CLAW tokens every hour for testing.
        </p>

        {isConnected && (
          <>
            {/* Balance Display */}
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4 border border-border">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {isContractDeployed ? "CLAW" : "MON"} Balance
                </span>
              </div>
              <span className="text-lg font-semibold tabular-nums">
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
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            {/* Countdown Display */}
            {!canClaim && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted border border-border">
                <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Next claim available in</p>
                  <p className="text-sm font-medium tabular-nums">{formatTime(countdown)}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Claim Button */}
        <Button
          onClick={handleClaim}
          disabled={!isConnected || isLoading || !canClaim || !isContractDeployed}
          className="w-full rounded-xl h-11"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : !canClaim ? (
            <>
              <Clock className="h-4 w-4 mr-2" />
              On Cooldown
            </>
          ) : (
            <>
              <Droplets className="h-4 w-4 mr-2" />
              Claim 1,000 CLAW
            </>
          )}
        </Button>

        {!isContractDeployed && isConnected && (
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-center text-xs text-muted-foreground">
              Contract not deployed. Deploy ClawToken.sol first.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
