import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowDown, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WithdrawModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: {
    id: string;
    name: string;
    avatar: string;
    balance: number;
  } | null;
  onWithdrawn: (amount: number) => void;
}

export function WithdrawModal({ open, onOpenChange, agent, onWithdrawn }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { toast } = useToast();

  const handleWithdraw = async () => {
    if (!agent) return;

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount to withdraw',
        variant: 'destructive',
      });
      return;
    }

    if (withdrawAmount > agent.balance) {
      toast({
        title: 'Insufficient Balance',
        description: `Agent only has ${agent.balance.toFixed(2)} USDC available`,
        variant: 'destructive',
      });
      return;
    }

    setIsWithdrawing(true);

    try {
      // Update agent balance in database
      const newBalance = agent.balance - withdrawAmount;
      const { error } = await supabase
        .from('agents')
        .update({ balance: newBalance })
        .eq('id', agent.id);

      if (error) throw error;

      toast({
        title: 'Withdrawal Successful',
        description: `Withdrew ${withdrawAmount.toFixed(2)} USDC from ${agent.name}`,
      });

      onWithdrawn(withdrawAmount);
      setAmount('');
      onOpenChange(false);
    } catch (err) {
      console.error('Withdrawal error:', err);
      toast({
        title: 'Withdrawal Failed',
        description: 'Unable to process withdrawal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleMaxAmount = () => {
    if (agent) {
      setAmount(agent.balance.toString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDown className="w-5 h-5 text-destructive" />
            Withdraw from Agent
          </DialogTitle>
          <DialogDescription>
            Withdraw USDC profits from your agent's vault
          </DialogDescription>
        </DialogHeader>

        {agent && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-2xl">
                  {agent.avatar}
                </div>
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-muted-foreground">Agent Vault</p>
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
                <p className="text-2xl font-mono font-bold text-accent">
                  {agent.balance.toFixed(2)} USDC
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Withdraw Amount (USDC)</Label>
              <div className="relative">
                <Input
                  id="withdraw-amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16"
                  min="0"
                  max={agent.balance}
                  step="0.01"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                  onClick={handleMaxAmount}
                >
                  MAX
                </Button>
              </div>
            </div>

            {parseFloat(amount) > agent.balance && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Amount exceeds available balance</span>
              </div>
            )}

            <Button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > agent.balance}
              className="w-full gap-2"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4" />
                  Withdraw USDC
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
