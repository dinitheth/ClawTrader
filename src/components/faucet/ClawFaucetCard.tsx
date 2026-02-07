import { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Clock, CheckCircle, Loader2, Wallet, Droplets } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { monadTestnet } from "@/lib/wagmi";

// Will be updated after deployment - set to empty string when not deployed
const CLAW_TOKEN_ADDRESS = "" as const;
const FAUCET_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export function ClawFaucetCard() {
  const { address, isConnected } = useAccount();
  const [countdown, setCountdown] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastClaimTime, setLastClaimTime] = useState<number | null>(null);

  // Get native balance for display when contract not deployed
  const { data: nativeBalance } = useBalance({
    address,
    chainId: monadTestnet.id,
  });

  // Check local storage for last claim time
  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`claw-faucet-${address}`);
      if (stored) {
        setLastClaimTime(parseInt(stored, 10));
      }
    }
  }, [address]);

  // Update countdown
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

  const handleClaim = async () => {
    if (!isContractDeployed) {
      toast({
        title: "Contract Not Deployed",
        description: "Deploy ClawToken.sol first, then update CLAW_TOKEN_ADDRESS.",
        variant: "destructive",
      });
      return;
    }

    if (!canClaim) {
      toast({
        title: "Cooldown Active",
        description: "Please wait for the cooldown to complete.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement actual contract call when deployed
      // For now, simulate for UI testing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Record claim time
      const now = Date.now();
      setLastClaimTime(now);
      if (address) {
        localStorage.setItem(`claw-faucet-${address}`, now.toString());
      }

      toast({
        title: "🎉 CLAW Tokens Claimed!",
        description: "1,000 CLAW tokens have been added to your wallet.",
      });
    } catch (error) {
      toast({
        title: "Claim Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-card/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Droplets className="h-5 w-5 text-primary" />
            CLAW Faucet
          </CardTitle>
          <Badge variant="outline" className="border-primary/40">
            Testnet
          </Badge>
        </div>
        <CardDescription>
          Claim 1,000 CLAW tokens every hour for testing
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Connect your wallet to claim tokens
            </p>
          </div>
        ) : (
          <>
            {/* Balance Display */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {isContractDeployed ? "CLAW Balance" : "MON Balance"}
                </span>
              </div>
              <span className="font-mono text-lg font-semibold">
                {nativeBalance
                  ? `${parseFloat(formatEther(nativeBalance.value)).toFixed(4)} ${nativeBalance.symbol}`
                  : "0"}
              </span>
            </div>

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
                <p className="text-center text-xs text-muted-foreground">
                  You can claim again once the cooldown expires
                </p>
              </div>
            )}
          </>
        )}

        {/* Contract Not Deployed Warning */}
        {!isContractDeployed && (
          <div className="rounded-lg border border-muted bg-muted/30 p-3">
            <p className="text-center text-xs text-muted-foreground">
              ⚠️ Contract not deployed yet. Deploy ClawToken.sol first.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
