import { useState, useEffect, useCallback } from "react";
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Clock, Loader2, Droplets, AlertCircle, DollarSign, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { monadTestnet } from "@/lib/wagmi";
import { supabase } from "@/integrations/supabase/client";

const FAUCET_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const USDC_AMOUNT = 1000;

export function UsdcFaucetCard() {
  const { address, isConnected } = useAccount();
  const [countdown, setCountdown] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastClaimTime, setLastClaimTime] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);

  // Load last claim time from localStorage
  useEffect(() => {
    if (address) {
      try {
        const stored = localStorage.getItem(`usdc-faucet-${address}`);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed)) {
            setLastClaimTime(parsed);
          }
        }
        // Load USDC balance from profiles
        loadUsdcBalance();
      } catch {
        // localStorage not available
      }
    }
  }, [address]);

  const loadUsdcBalance = async () => {
    if (!address) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('claw_balance')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();
      
      if (data) {
        setUsdcBalance(Number(data.claw_balance) || 0);
      }
    } catch (err) {
      console.error('Error loading USDC balance:', err);
    }
  };

  // Countdown timer
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

  const handleClaim = useCallback(async () => {
    setError(null);

    if (!canClaim) {
      toast({ title: "Cooldown Active", description: "Please wait before claiming again.", variant: "destructive" });
      return;
    }

    if (!address) {
      toast({ title: "Connect Wallet", description: "Please connect your wallet first.", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      // Call edge function to mint USDC (simulated)
      const { data, error: fnError } = await supabase.functions.invoke('claim-usdc-faucet', {
        body: {
          wallet_address: address.toLowerCase(),
          amount: USDC_AMOUNT,
        },
      });

      if (fnError) throw fnError;

      // Update local state
      const now = Date.now();
      setLastClaimTime(now);
      setUsdcBalance(prev => prev + USDC_AMOUNT);
      
      try {
        localStorage.setItem(`usdc-faucet-${address}`, now.toString());
      } catch {
        // localStorage not available
      }

      toast({
        title: "🎉 USDC Claimed!",
        description: `${USDC_AMOUNT.toLocaleString()} testnet USDC has been added to your account.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to claim USDC';
      setError(message);
      toast({ title: "Claim Failed", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [address, canClaim]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="rounded-2xl border border-border bg-gradient-to-br from-accent/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-accent" />
            </div>
            USDC Faucet
          </CardTitle>
          <Badge variant="outline" className="text-xs rounded-full bg-accent/10 text-accent border-accent/30">
            Testnet
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Claim {USDC_AMOUNT.toLocaleString()} testnet USDC every hour to fund your trading agents.
        </p>

        {isConnected && (
          <>
            {/* USDC Balance Display */}
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-4 border border-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-accent">$</span>
                </div>
                <span className="text-sm text-muted-foreground">USDC Balance</span>
              </div>
              <span className="text-lg font-semibold tabular-nums text-accent">
                {usdcBalance.toLocaleString()}
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
          disabled={!isConnected || isLoading || !canClaim}
          className="w-full rounded-xl h-11 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70"
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
              <DollarSign className="h-4 w-4 mr-2" />
              Claim {USDC_AMOUNT.toLocaleString()} USDC
            </>
          )}
        </Button>

        {isConnected && usdcBalance > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            💡 Deposit USDC to your agent to start autonomous trading
          </p>
        )}
      </CardContent>
    </Card>
  );
}
