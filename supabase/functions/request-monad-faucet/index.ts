import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGENT_FAUCET_URL = 'https://agents.devnads.com/v1/faucet';

interface FaucetRequest {
  wallet_address: string;
  agent_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: FaucetRequest = await req.json();
    const { wallet_address, agent_id } = body;

    if (!wallet_address || !wallet_address.startsWith('0x')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid wallet address' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`💰 Requesting MON from faucet for wallet: ${wallet_address}`);

    // Call the agent faucet API
    const faucetResponse = await fetch(AGENT_FAUCET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: wallet_address,
        agent_id: agent_id,
      }),
    });

    if (!faucetResponse.ok) {
      const errorText = await faucetResponse.text();
      console.error('Faucet error:', errorText);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `Faucet request failed: ${faucetResponse.statusText}`,
          details: errorText,
        }),
        {
          status: faucetResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const faucetData = await faucetResponse.json();
    console.log('✅ MON tokens requested successfully:', faucetData);

    return new Response(
      JSON.stringify({
        success: true,
        txHash: faucetData.tx_hash || faucetData.txHash,
        amount: faucetData.amount || '1',
        message: 'Testnet MON tokens requested. They will arrive in 1-2 minutes.',
        ...faucetData,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error requesting tokens:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
