import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, ArrowRight, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useToast } from '@/hooks/use-toast';
import { buildSwapExactETHForTokens, buildSwapExactTokensForETH, getDeadline, MONAD_DEX_CONTRACTS } from '@/lib/monad-dex';
import type { TradingDecision } from '@/lib/trading-service';

interface ExecuteTradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decision: TradingDecision | null;
  agent: {
    id: string;
    name: string;
    avatar: string;
    balance: number;
  } | null;
  symbol: string;
  onTradeComplete: (txHash: string, success: boolean) => void;
}

export function ExecuteTradeModal({ 
  open, 
  onOpenChange, 
  decision, 
  agent, 
  symbol,
  onTradeComplete 
}: ExecuteTradeModalProps) {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [step, setStep] = useState<'confirm' | 'executing' | 'success' | 'error'>('confirm');
  
  const { 
    sendTransaction, 
    data: hash,
    isPending: isSending,
    error: sendError,
    reset 
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  // Calculate trade amount based on decision
  const tradeAmount = decision && agent 
    ? (agent.balance * decision.suggestedAmount) / 100 
    : 0;

  const handleExecute = async () => {
    if (!isConnected || !address || !decision || !agent) {
      toast({ title: 'Error', description: 'Connect wallet and select an agent', variant: 'destructive' });
      return;
    }

    if (tradeAmount <= 0) {
      toast({ title: 'Insufficient Balance', description: 'Agent needs funds to trade', variant: 'destructive' });
      return;
    }

    setStep('executing');

    try {
      if (decision.action === 'BUY') {
        // Buy: Swap MON for USDC
        const swapParams = buildSwapExactETHForTokens({
          tokenIn: MONAD_DEX_CONTRACTS.WMON,
          tokenOut: MONAD_DEX_CONTRACTS.USDC,
          amountIn: parseEther(tradeAmount.toString()),
          amountOutMin: 0n, // In production, calculate slippage
          recipient: address,
          deadline: getDeadline(20),
        });

        sendTransaction({
          to: swapParams.to,
          value: swapParams.value,
          data: swapParams.data,
        });
      } else if (decision.action === 'SELL') {
        // Sell: Swap USDC for MON
        const swapParams = buildSwapExactTokensForETH({
          tokenIn: MONAD_DEX_CONTRACTS.USDC,
          tokenOut: MONAD_DEX_CONTRACTS.WMON,
          amountIn: parseEther(tradeAmount.toString()),
          amountOutMin: 0n,
          recipient: address,
          deadline: getDeadline(20),
        });

        sendTransaction({
          to: swapParams.to,
          data: swapParams.data,
        });
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      setStep('error');
    }
  };

  // Watch for transaction completion
  if (isSuccess && step === 'executing') {
    setStep('success');
    onTradeComplete(hash || '', true);
  }

  if ((isError || sendError) && step === 'executing') {
    setStep('error');
    onTradeComplete('', false);
  }

  const handleClose = () => {
    setStep('confirm');
    reset();
    onOpenChange(false);
  };

  if (!decision || !agent) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {decision.action === 'BUY' ? (
              <TrendingUp className="w-5 h-5 text-accent" />
            ) : (
              <TrendingDown className="w-5 h-5 text-destructive" />
            )}
            Execute {decision.action} on Monad DEX
          </DialogTitle>
          <DialogDescription>
            {agent.avatar} {agent.name} will execute a real swap on Monad Testnet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 'confirm' && (
            <>
              {/* Trade Summary */}
              <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Action</span>
                  <Badge className={decision.action === 'BUY' ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'}>
                    {decision.action}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-semibold">{tradeAmount.toFixed(4)} MON</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Asset</span>
                  <span>{symbol.split(':')[1]}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-mono">{decision.confidence}%</span>
                </div>
                {decision.stopLoss && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Stop Loss</span>
                    <span className="text-destructive font-mono">${decision.stopLoss.toLocaleString()}</span>
                  </div>
                )}
                {decision.takeProfit && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Take Profit</span>
                    <span className="text-accent font-mono">${decision.takeProfit.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Reasoning */}
              <div className="p-3 rounded-lg bg-primary/5 text-sm">
                <p className="text-muted-foreground mb-1">AI Reasoning:</p>
                <p className="text-xs">{decision.reasoning}</p>
              </div>

              <Button
                onClick={handleExecute}
                className="w-full gap-2 bg-gradient-to-r from-primary to-secondary"
              >
                Confirm & Execute Trade
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {step === 'executing' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary mb-4" />
              <p className="font-semibold mb-2">
                {isSending ? 'Confirm in Wallet...' : 'Executing Swap...'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSending 
                  ? 'Please confirm the transaction in your wallet'
                  : 'Waiting for blockchain confirmation...'}
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto text-accent mb-4" />
              <p className="font-semibold text-accent mb-2">Trade Executed!</p>
              <p className="text-sm text-muted-foreground mb-4">
                Successfully swapped {tradeAmount.toFixed(4)} MON
              </p>
              {hash && (
                <a
                  href={`https://testnet.monadexplorer.com/tx/${hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  View on Explorer
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <Button onClick={handleClose} className="w-full mt-4">
                Done
              </Button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
              <p className="font-semibold text-destructive mb-2">Trade Failed</p>
              <p className="text-sm text-muted-foreground mb-4">
                {sendError?.message || 'Transaction was rejected or failed'}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setStep('confirm')} variant="outline" className="flex-1">
                  Try Again
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
