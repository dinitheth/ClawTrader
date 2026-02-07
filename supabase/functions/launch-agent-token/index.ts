import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Nad.fun contract addresses on Monad Testnet
const NAD_CONTRACTS = {
  DEX_ROUTER: '0x5D4a4f430cA3B1b2dB86B9cFE48a5316800F5fb2',
  BONDING_CURVE_ROUTER: '0x865054F0F6A288adaAc30261731361EA7E908003',
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

    // Generate token metadata based on agent personality
    const tokenMetadata = generateTokenMetadata(agent, description);

    // For hackathon demo: simulate token creation on nad.fun
    // In production, this would call the actual nad.fun SDK
    const simulatedTokenAddress = `0x${generateMockAddress()}`;
    
    // Calculate initial bonding curve parameters based on agent stats
    const initialMarketCap = calculateInitialMarketCap(agent);

    // Update agent with token info
    const { error: updateError } = await supabase
      .from('agents')
      .update({
        token_address: simulatedTokenAddress,
        token_symbol: token_symbol.toUpperCase(),
        token_name: token_name,
        token_launched_at: new Date().toISOString(),
        token_market_cap: initialMarketCap,
        token_holders: 1, // Creator is first holder
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
        balance: 1000000, // 1M tokens for creator (10%)
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

    console.log(`✅ Token ${token_symbol} launched at ${simulatedTokenAddress}`);

    return new Response(
      JSON.stringify({
        success: true,
        token: {
          address: simulatedTokenAddress,
          name: token_name,
          symbol: token_symbol,
          market_cap: initialMarketCap,
          metadata: tokenMetadata,
          bonding_curve: {
            router: NAD_CONTRACTS.BONDING_CURVE_ROUTER,
            initial_price: 0.0001,
            curve_type: 'exponential',
          },
          utilities: {
            governance: governance_enabled,
            revenue_share: revenue_share_percentage > 0 ? `${revenue_share_percentage}%` : 'disabled',
            access_tier: access_tier,
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
