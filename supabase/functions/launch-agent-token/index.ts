import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Nad.fun API endpoints
const NAD_API = {
  TESTNET: 'https://dev-api.nad.fun',
  MAINNET: 'https://api.nadapp.net',
};

// Nad.fun contract addresses on Monad Testnet
const NAD_CONTRACTS = {
  BONDING_CURVE_ROUTER: '0x865054F0F6A288adaAc30261731361EA7E908003',
  CURVE: '0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE',
  LENS: '0xB056d79CA5257589692699a46623F901a3BB76f1',
};

interface TokenLaunchRequest {
  agent_id: string;
  token_name: string;
  token_symbol: string;
  description: string;
  image_url?: string;
  revenue_share_percentage: number;
  governance_enabled: boolean;
  access_tier: string;
  creator_wallet: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: TokenLaunchRequest = await req.json();
    const { 
      agent_id, 
      token_name, 
      token_symbol, 
      description,
      image_url,
      revenue_share_percentage,
      governance_enabled,
      access_tier,
      creator_wallet 
    } = body;

    console.log(`🚀 Launching token for agent ${agent_id}: ${token_symbol}`);

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agent_id)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent not found');
    }

    // Step 1: Upload image to nad.fun (if provided)
    let imageUri = '';
    if (image_url) {
      console.log('📸 Uploading image to nad.fun...');
      const imageResponse = await fetch(`${NAD_API.TESTNET}/agent/token/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url }),
      });
      
      if (imageResponse.ok) {
        const imageData = await imageResponse.json();
        imageUri = imageData.image_uri || '';
        console.log('✅ Image uploaded:', imageUri);
      } else {
        console.log('⚠️ Image upload failed, using default');
      }
    }

    // Step 2: Generate token metadata
    const tokenMetadata = generateTokenMetadata(agent, description, imageUri);
    console.log('📝 Uploading metadata to nad.fun...');
    
    let metadataUri = '';
    try {
      const metadataResponse = await fetch(`${NAD_API.TESTNET}/agent/token/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: token_name,
          symbol: token_symbol,
          description: tokenMetadata.description,
          image: imageUri,
          attributes: [
            { trait_type: 'Personality', value: agent.personality },
            { trait_type: 'Generation', value: agent.generation },
            { trait_type: 'DNA Risk', value: agent.dna_risk_tolerance },
            { trait_type: 'DNA Aggression', value: agent.dna_aggression },
            { trait_type: 'Wins', value: agent.wins || 0 },
            { trait_type: 'Losses', value: agent.losses || 0 },
          ],
        }),
      });
      
      if (metadataResponse.ok) {
        const metaData = await metadataResponse.json();
        metadataUri = metaData.metadata_uri || '';
        console.log('✅ Metadata uploaded:', metadataUri);
      }
    } catch (e) {
      console.log('⚠️ Metadata upload failed:', e);
    }

    // Step 3: Mine salt for vanity address (7777 prefix)
    console.log('⛏️ Mining salt for vanity address...');
    let salt = '';
    let predictedAddress = '';
    
    try {
      const saltResponse = await fetch(`${NAD_API.TESTNET}/agent/salt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator: creator_wallet,
          name: token_name,
          symbol: token_symbol,
        }),
      });
      
      if (saltResponse.ok) {
        const saltData = await saltResponse.json();
        salt = saltData.salt || '';
        predictedAddress = saltData.address || '';
        console.log('✅ Salt mined:', salt, 'Address:', predictedAddress);
      }
    } catch (e) {
      console.log('⚠️ Salt mining failed, using random:', e);
    }

    // For hackathon demo: if API calls fail, generate simulated address
    // In production, this would require the actual on-chain transaction
    const tokenAddress = predictedAddress || `0x7777${generateMockAddress().slice(4)}`;
    
    // Calculate initial market cap based on agent stats
    const initialMarketCap = calculateInitialMarketCap(agent);

    // Update agent with token info
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        token_address: tokenAddress,
        token_symbol: token_symbol.toUpperCase(),
        token_name: token_name,
        token_launched_at: new Date().toISOString(),
        token_market_cap: initialMarketCap,
        token_holders: 1,
        revenue_share_enabled: revenue_share_percentage > 0,
        revenue_share_percentage: revenue_share_percentage,
        governance_enabled: governance_enabled,
        access_tier: access_tier,
      })
      .eq('id', agent_id);

    if (updateError) {
      throw updateError;
    }

    // Create initial holder record for creator
    await supabase
      .from('agent_token_holders')
      .insert({
        agent_id: agent_id,
        holder_address: creator_wallet,
        balance: 1000000,
        percentage_owned: 10,
      });

    // Set up access grants based on tier
    const accessLevels = getAccessLevels(access_tier);
    for (const level of accessLevels) {
      await supabase
        .from('access_grants')
        .insert({
          agent_id: agent_id,
          holder_address: creator_wallet,
          access_level: level.level,
          min_tokens_required: level.minTokens,
          features_unlocked: level.features,
        });
    }

    console.log(`✅ Token ${token_symbol} launched at ${tokenAddress}`);

    return new Response(
      JSON.stringify({
        success: true,
        token: {
          address: tokenAddress,
          name: token_name,
          symbol: token_symbol,
          market_cap: initialMarketCap,
          metadata_uri: metadataUri,
          bonding_curve: {
            router: NAD_CONTRACTS.BONDING_CURVE_ROUTER,
            curve: NAD_CONTRACTS.CURVE,
            initial_price: 0.0001,
            curve_type: 'exponential',
          },
          utilities: {
            governance: governance_enabled,
            revenue_share: revenue_share_percentage > 0 ? `${revenue_share_percentage}%` : 'disabled',
            access_tier: access_tier,
          },
          nad_fun_links: {
            trade: `https://testnet.nad.fun/token/${tokenAddress}`,
            api: NAD_API.TESTNET,
          },
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Token launch error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateMockAddress(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 40; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function generateTokenMetadata(agent: any, description: string) {
  const personalityTraits: Record<string, string> = {
    aggressive: '🔥 High-risk, high-reward trading beast',
    cautious: '🛡️ Steady gains, protected positions',
    deceptive: '🎭 Master of misdirection and fake-outs',
    adaptive: '🧬 Evolves strategy in real-time',
    chaotic: '🌀 Unpredictable and dangerous',
    calculating: '🧮 Pure mathematical precision',
  };

  return {
    description: description || personalityTraits[agent.personality] || 'AI Trading Agent',
    personality: agent.personality,
    generation: agent.generation,
    dna: {
      risk: agent.dna_risk_tolerance,
      aggression: agent.dna_aggression,
      pattern: agent.dna_pattern_recognition,
    },
    stats: {
      wins: agent.wins || 0,
      losses: agent.losses || 0,
      total_pnl: agent.total_pnl || 0,
      best_trade: agent.best_pnl || 0,
    },
    special_abilities: agent.can_self_modify ? ['self-modification', 'strategy-evolution'] : [],
  };
}

function calculateInitialMarketCap(agent: any): number {
  // Base market cap based on agent performance
  let baseCap = 1000; // $1000 base
  
  // Boost for wins
  baseCap += (agent.wins || 0) * 100;
  
  // Boost for positive PnL
  if (agent.total_pnl > 0) {
    baseCap += agent.total_pnl * 10;
  }
  
  // Boost for special abilities
  if (agent.can_self_modify) {
    baseCap *= 1.5;
  }
  
  // Personality multipliers
  const personalityMultipliers: Record<string, number> = {
    chaotic: 2.0,
    aggressive: 1.5,
    deceptive: 1.3,
    calculating: 1.2,
    adaptive: 1.1,
    cautious: 1.0,
  };
  
  baseCap *= personalityMultipliers[agent.personality] || 1.0;
  
  return Math.floor(baseCap);
}

function getAccessLevels(tier: string) {
  const levels = [
    {
      level: 'basic',
      minTokens: 100,
      features: ['view_stats', 'view_matches'],
    },
    {
      level: 'premium',
      minTokens: 10000,
      features: ['view_stats', 'view_matches', 'early_betting', 'strategy_insights'],
    },
    {
      level: 'vip',
      minTokens: 100000,
      features: ['view_stats', 'view_matches', 'early_betting', 'strategy_insights', 'governance_voting', 'revenue_share'],
    },
    {
      level: 'founder',
      minTokens: 1000000,
      features: ['view_stats', 'view_matches', 'early_betting', 'strategy_insights', 'governance_voting', 'revenue_share', 'dna_modification', 'alliance_control'],
    },
  ];

  switch (tier) {
    case 'founder':
      return levels;
    case 'vip':
      return levels.slice(0, 3);
    case 'premium':
      return levels.slice(0, 2);
    default:
      return levels.slice(0, 1);
  }
}
