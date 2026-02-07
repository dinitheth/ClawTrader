import { useState } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, Zap, ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { requestTestnetMON } from "@/lib/monad-faucet";

export function MonadFaucetCard() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const handleClaim = async () => {
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

    try {
      const result = await requestTestnetMON(address);

      if (result.success) {
        setLastTxHash(result.txHash || null);
        toast({
          title: "🎉 MON Tokens Requested!",
          description: result.message || "Testnet MON will arrive in 1-2 minutes.",
        });
      } else {
        toast({
          title: "Faucet Request Failed",
          description: result.error || "Please try again later.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to request tokens",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-secondary/20 bg-gradient-to-br from-card to-secondary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Zap className="h-5 w-5 text-secondary-foreground" />
            MON Faucet
          </CardTitle>
          <Badge variant="outline" className="border-secondary/40">
            Agent Faucet
          </Badge>
        </div>
        <CardDescription>
          Get testnet MON for gas fees on Monad Testnet
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Connect your wallet to claim MON
            </p>
          </div>
        ) : (
          <>
            {/* Network Info */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-sm text-muted-foreground">Monad Testnet</span>
              </div>
              <span className="font-mono text-sm">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>

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
              <div className="flex items-center justify-between rounded-lg bg-primary/10 p-3">
                <div className="flex items-center gap-2 text-primary">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">Request submitted!</span>
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

            <p className="text-center text-xs text-muted-foreground">
              Powered by agents.devnads.com
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
