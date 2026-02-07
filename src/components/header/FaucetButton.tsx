import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Droplets, Loader2, CheckCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { profileService } from '@/lib/api';

const FAUCET_AMOUNT = 1000;

export function FaucetButton() {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const handleClaim = async () => {
    if (!isConnected || !address) {
      toast({
        title: 'Connect Wallet',
        description: 'Please connect your wallet to claim USDC',
        variant: 'destructive',
      });
      return;
    }

    setIsClaiming(true);

    try {
      // Get or create profile
      const profile = await profileService.getOrCreateByWallet(address);
      
      if (!profile) {
        throw new Error('Failed to get profile');
      }

      // Call the faucet edge function
      const { data, error } = await supabase.functions.invoke('claim-usdc-faucet', {
        body: { 
          walletAddress: address,
          profileId: profile.id 
        },
      });

      if (error) {
        // Check for specific error types
        if (error.message?.includes('cooldown') || error.message?.includes('429')) {
          toast({
            title: 'Please Wait',
            description: 'You can claim again in 1 hour',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      if (data?.success) {
        setClaimed(true);
        toast({
          title: 'USDC Claimed!',
          description: `${FAUCET_AMOUNT} USDC has been added to your balance`,
        });

        // Reset claimed state after 5 seconds
        setTimeout(() => setClaimed(false), 5000);
      } else {
        throw new Error(data?.error || 'Claim failed');
      }
    } catch (err) {
      console.error('Faucet error:', err);
      toast({
        title: 'Claim Failed',
        description: 'Unable to claim USDC. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Button
      onClick={handleClaim}
      disabled={isClaiming || claimed}
      variant="outline"
      size="sm"
      className="rounded-full h-9 px-3 gap-1.5 border-accent/50 text-accent hover:bg-accent/10"
    >
      {isClaiming ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="hidden sm:inline">Claiming...</span>
        </>
      ) : claimed ? (
        <>
          <CheckCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Claimed!</span>
        </>
      ) : (
        <>
          <Droplets className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Faucet</span>
        </>
      )}
    </Button>
  );
}
