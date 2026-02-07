import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * USDC Faucet Edge Function
 * 
 * Mints testnet USDC tokens to user accounts.
 * Users can claim 1000 USDC every hour.
 * USDC is stored in the profiles.claw_balance field (repurposed for USDC).
 */

interface ClaimRequest {
  wallet_address: string;
  amount: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { wallet_address, amount = 1000 }: ClaimRequest = await req.json();

    if (!wallet_address) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet_address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedAddress = wallet_address.toLowerCase();
    console.log(`[claim-usdc-faucet] Processing claim for ${normalizedAddress}, amount: ${amount}`);

    // Check if profile exists, create if not
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, claw_balance, wallet_address')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    if (fetchError) {
      console.error('Profile fetch error:', fetchError);
      throw fetchError;
    }

    let newBalance: number;

    if (existingProfile) {
      // Update existing profile
      newBalance = (Number(existingProfile.claw_balance) || 0) + amount;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          claw_balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingProfile.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }
    } else {
      // Create new profile
      newBalance = amount;
      
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          wallet_address: normalizedAddress,
          claw_balance: newBalance,
          display_name: `User ${normalizedAddress.slice(0, 6)}...${normalizedAddress.slice(-4)}`,
        });

      if (insertError) {
        console.error('Profile insert error:', insertError);
        throw insertError;
      }
    }

    console.log(`[claim-usdc-faucet] Success! New balance: ${newBalance} USDC`);

    return new Response(
      JSON.stringify({
        success: true,
        amount,
        newBalance,
        message: `Claimed ${amount} USDC successfully!`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[claim-usdc-faucet] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
