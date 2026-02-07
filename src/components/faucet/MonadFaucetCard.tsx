import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { requestTestnetMON } from "@/lib/monad-faucet";
import { parseError, formatErrorForDisplay } from "@/lib/errors";

export function MonadFaucetCard() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClaim = useCallback(async () => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setLastTxHash(null);
    setError(null);

    try {
      const result = await requestTestnetMON(address);

      if (result.success) {
        setLastTxHash(result.txHash || null);
        toast({
          title: "MON Tokens Requested",
          description: result.message || "Testnet MON will arrive in 1-2 minutes.",
        });
      } else {
        setError(result.error || "Request failed");
        toast({
          title: "Faucet Request Failed",
          description: result.error || "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (err) {
      const appError = parseError(err);
      const { title, description } = formatErrorForDisplay(appError);
      setError(description);
      toast({ title, description, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  return (
    <Card className="rounded-2xl border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            MON Faucet
          </CardTitle>
          <Badge variant="outline" className="text-xs rounded-full">
            Agent Faucet
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Get testnet MON for gas fees on Monad Testnet.
        </p>

        {isConnected && (
          <>
            {/* Network Info */}
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 border border-border">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success" />
                <span className="text-sm text-muted-foreground">Monad Testnet</span>
              </div>
              <span className="font-medium text-sm tabular-nums">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            {/* Success State */}
            {lastTxHash && (
              <div className="flex items-center justify-between rounded-xl bg-success/5 p-3 border border-success/20">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Request submitted</span>
                </div>
                <a
                  href={`https://testnet.monadexplorer.com/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </>
        )}

        <Button
          onClick={handleClaim}
          disabled={!isConnected || isLoading}
          className="w-full rounded-xl h-11"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Requesting...
            </>
          ) : !isConnected ? (
            "Connect Wallet"
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Request Testnet MON
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Powered by agents.devnads.com
        </p>
      </CardContent>
    </Card>
  );
}
