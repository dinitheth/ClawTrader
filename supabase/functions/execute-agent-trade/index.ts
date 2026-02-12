import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "https://esm.sh/ethers@6.9.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Execute Agent Trade V2 - REAL ON-CHAIN via AgentVaultV2
 * 
 * This edge function handles autonomous trading:
 * 1. Fetches agent DNA and portfolio balance
 * 2. Fetches agent's current token positions from AgentVaultV2
 * 3. Gets comprehensive market data (24h + 7d trends)
 * 4. Calls AI with deep trading knowledge and position awareness
 * 5. Returns decision for on-chain execution via trading server
 */

// Contract addresses (Monad Testnet)
const CONTRACTS = {
  USDC: '0xE5C0a7AB54002FeDfF0Ca7082d242F9D04265f3b',
  AGENT_VAULT_V2: '0x50646200817C52BFa61a5398b3C6dcf217b606Cf',
  SIMPLE_DEX: '0x7f09C84a42A5f881d8cebC3c319DC108c20eE762',
  TEST_BTC: '0x8C56E4d502C544556b76bbC4b8f7E7Fc58511c87',
  TEST_ETH: '0x3809C6E3512c409Ded482240Bd1005c1c40fE5e4',
  TEST_SOL: '0xD02dB25175f69A1b1A03d6F6a8d4A566a99061Af',
};

// Token info with decimals
const TOKENS: Record<string, { address: string; decimals: number; symbol: string }> = {
  bitcoin: { address: CONTRACTS.TEST_BTC, decimals: 8, symbol: 'tBTC' },
  ethereum: { address: CONTRACTS.TEST_ETH, decimals: 18, symbol: 'tETH' },
  solana: { address: CONTRACTS.TEST_SOL, decimals: 9, symbol: 'tSOL' },
};

// AgentVaultV2 ABI for reading positions
const AGENT_VAULT_V2_ABI = [
  'function getUserAgentBalance(address user, bytes32 agentId) external view returns (uint256)',
  'function getUserAgentTokenBalance(address user, bytes32 agentId, address token) external view returns (uint256)',
];

interface TradeRequest {
  agentId: string;
  symbol?: string;
  userAddress?: string;
}

interface TradingDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  suggestedAmount: number;
  stopLoss?: number;
  takeProfit?: number;
  technicalAnalysis: string;
  riskAssessment: string;
}

// Convert UUID to bytes32
function uuidToBytes32(uuid: string): string {
  const hex = uuid.replace(/-/g, '');
  return '0x' + hex.padEnd(64, '0');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const monadRpcUrl = Deno.env.get('MONAD_RPC_URL') || 'https://testnet-rpc.monad.xyz';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agentId, symbol = 'bitcoin', userAddress }: TradeRequest = await req.json();

    if (!agentId) {
      return new Response(
        JSON.stringify({ error: 'Missing agentId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[execute-agent-trade] Starting trade for agent ${agentId}, symbol: ${symbol}`);

    // 1. Fetch agent data
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      console.error('Agent fetch error:', agentError);
      return new Response(
        JSON.stringify({ error: 'Agent not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch on-chain balance from AgentVaultV2 (if userAddress provided)
    let agentBalance = agent.balance || 0;
    let positions: { tokenSymbol: string; tokenAmount: number; tokenValueUSD: number; hasPosition: boolean } | null = null;

    if (userAddress) {
      try {
        const provider = new ethers.JsonRpcProvider(monadRpcUrl);
        const agentVault = new ethers.Contract(CONTRACTS.AGENT_VAULT_V2, AGENT_VAULT_V2_ABI, provider);
        const agentIdBytes32 = uuidToBytes32(agentId);

        // Fetch USDC balance
        const usdcBalance = await agentVault.getUserAgentBalance(userAddress, agentIdBytes32);
        agentBalance = parseFloat(ethers.formatUnits(usdcBalance, 6));
        console.log(`[execute-agent-trade] On-chain USDC balance: $${agentBalance}`);

        // Fetch token position for the current symbol
        const tokenInfo = TOKENS[symbol];
        if (tokenInfo) {
          const tokenBalance = await agentVault.getUserAgentTokenBalance(userAddress, agentIdBytes32, tokenInfo.address);
          const tokenAmount = parseFloat(ethers.formatUnits(tokenBalance, tokenInfo.decimals));

          positions = {
            tokenSymbol: tokenInfo.symbol,
            tokenAmount,
            tokenValueUSD: 0, // Will be calculated after fetching price
            hasPosition: tokenAmount > 0,
          };
          console.log(`[execute-agent-trade] Token position: ${tokenAmount} ${tokenInfo.symbol}`);
        }
      } catch (rpcError) {
        console.warn('[execute-agent-trade] RPC error fetching positions:', rpcError);
        // Continue with database balance
      }
    }

    if (agentBalance <= 0 && (!positions || !positions.hasPosition)) {
      return new Response(
        JSON.stringify({
          error: 'Agent has no funds',
          message: 'Fund your agent with USDC before trading'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch COMPREHENSIVE market data from CoinGecko
    console.log(`[execute-agent-trade] Fetching market data for ${symbol}`);
    const marketResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${symbol}?localization=false&tickers=false&community_data=false&developer_data=false`
    );

    if (!marketResponse.ok) {
      throw new Error('Failed to fetch market data');
    }

    const marketJson = await marketResponse.json();
    const marketData = {
      symbol: marketJson.symbol.toUpperCase(),
      currentPrice: marketJson.market_data.current_price.usd,
      priceChange24h: marketJson.market_data.price_change_percentage_24h || 0,
      priceChange7d: marketJson.market_data.price_change_percentage_7d || 0,
      priceChange30d: marketJson.market_data.price_change_percentage_30d || 0,
      volume24h: marketJson.market_data.total_volume.usd || 0,
      high24h: marketJson.market_data.high_24h.usd || 0,
      low24h: marketJson.market_data.low_24h.usd || 0,
      ath: marketJson.market_data.ath?.usd || 0,
      athChangePercentage: marketJson.market_data.ath_change_percentage?.usd || 0,
      marketCap: marketJson.market_data.market_cap?.usd || 0,
      marketCapRank: marketJson.market_cap_rank || 0,
    };

    console.log(`[execute-agent-trade] Market data:`, marketData);

    // Update position USD value with current price
    if (positions) {
      positions.tokenValueUSD = positions.tokenAmount * marketData.currentPrice;
    }

    // 4. Get AI trading decision with enhanced context
    const agentDNA = {
      aggression: agent.dna_aggression * 100,
      riskTolerance: agent.dna_risk_tolerance * 100,
      patternRecognition: agent.dna_pattern_recognition * 100,
      contrarianBias: agent.dna_contrarian_bias * 100,
      timingSensitivity: agent.dna_timing_sensitivity * 100,
    };

    const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-trading-analysis', {
      body: {
        agentDNA,
        marketData,
        agentPersonality: agent.personality,
        portfolioBalance: agentBalance,
        positions, // Pass current token holdings
      },
    });

    if (aiError || !aiData?.success) {
      console.error('AI analysis error:', aiError || aiData?.error);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed', details: aiError?.message || aiData?.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const decision: TradingDecision = aiData.decision;
    console.log(`[execute-agent-trade] AI Decision:`, decision);

    // 5. Return decision for trading server to execute
    // Note: Actual trade execution is now handled by the local trading server
    // via AgentVaultV2.executeBuy/executeSell

    return new Response(
      JSON.stringify({
        success: true,
        agentId,
        decision,
        positions, // Include position info for frontend
        trade: {
          executed: decision.action !== 'HOLD',
          action: decision.action,
          pnl: 0, // P&L calculated by trading server after execution
          previousBalance: agentBalance,
          newBalance: agentBalance, // Will be updated by trading server
          marketPrice: marketData.currentPrice,
          symbol: marketData.symbol,
          txHash: null, // Will be filled by trading server
          onChain: false, // Trading server marks as true after execution
        },
        marketData,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[execute-agent-trade] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
