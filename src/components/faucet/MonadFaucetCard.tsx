import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, Zap, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
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
    <Card>
      <CardHeader className="pb-3 px-4 md:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Zap className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
            MON Faucet
          </CardTitle>
          <Badge variant="outline" className="text-[10px] md:text-xs">
            Agent Faucet
          </Badge>
        </div>
        <CardDescription className="text-xs md:text-sm">
          Get testnet MON for gas fees
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 md:space-y-4 px-4 md:px-6 pb-4 md:pb-6">
        {!isConnected ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Wallet className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
            <p className="text-xs md:text-sm text-muted-foreground">
              Connect your wallet to claim MON
            </p>
          </div>
        ) : (
          <>
            {/* Network Info */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 md:p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-secondary" />
                <span className="text-xs md:text-sm text-muted-foreground">Monad Testnet</span>
              </div>
              <span className="font-mono text-xs md:text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            {/* Claim Button */}
            <Button
              onClick={handleClaim}
              disabled={isLoading}
              className="w-full gap-2"
              variant="secondary"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Request Testnet MON
                </>
              )}
            </Button>

            {/* Success State */}
            {lastTxHash && (
              <div className="flex items-center justify-between rounded-lg bg-success/10 p-3">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs md:text-sm">Request submitted</span>
                </div>
                <a
                  href={`https://testnet.monadexplorer.com/tx/${lastTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-success hover:underline"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            <p className="text-center text-[10px] md:text-xs text-muted-foreground">
              Powered by agents.devnads.com
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
