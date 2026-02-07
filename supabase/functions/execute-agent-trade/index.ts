import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Execute Agent Trade
 * 
 * This edge function handles autonomous trading for agents:
 * 1. Fetches agent DNA and portfolio balance
 * 2. Gets real-time market data
 * 3. Calls AI for trading decision
 * 4. Records the trade in the database
 * 
 * Note: Actual on-chain execution requires a backend wallet with funds
 * to call the AgentWallet contract. For now, we record trades and
 * simulate the execution.
 */

interface TradeRequest {
  agentId: string;
  symbol?: string;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { agentId, symbol = 'bitcoin' }: TradeRequest = await req.json();

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

    // Check if agent has balance
    const agentBalance = agent.balance || 0;
    if (agentBalance <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Agent has no balance',
          message: 'Fund your agent first before trading'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch market data from CoinGecko
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
      priceChange24h: marketJson.market_data.price_change_percentage_24h,
      volume24h: marketJson.market_data.total_volume.usd,
      high24h: marketJson.market_data.high_24h.usd,
      low24h: marketJson.market_data.low_24h.usd,
    };

    console.log(`[execute-agent-trade] Market data:`, marketData);

    // 3. Get AI trading decision
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

    // 4. Execute the trade (simulate P&L for now)
    let newBalance = agentBalance;
    let pnl = 0;
    let tradeExecuted = false;

    if (decision.action !== 'HOLD' && decision.confidence >= 60) {
      const tradeAmount = (agentBalance * decision.suggestedAmount) / 100;
      
      // Simulate realistic P&L based on market volatility
      const volatility = Math.abs(marketData.priceChange24h) / 100;
      const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
      const baseReturn = volatility * randomFactor;
      
      // Adjust return based on decision quality
      const confidenceBonus = (decision.confidence - 50) / 100;
      const directionBonus = decision.action === 'BUY' 
        ? (marketData.priceChange24h > 0 ? 0.02 : -0.02)
        : (marketData.priceChange24h < 0 ? 0.02 : -0.02);
      
      const totalReturn = baseReturn + confidenceBonus * 0.01 + directionBonus;
      pnl = tradeAmount * totalReturn;
      newBalance = agentBalance + pnl;
      tradeExecuted = true;

      // 5. Update agent balance in database
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          balance: Math.max(0, newBalance),
          total_pnl: (agent.total_pnl || 0) + pnl,
          total_matches: (agent.total_matches || 0) + 1,
          wins: pnl > 0 ? (agent.wins || 0) + 1 : agent.wins,
          losses: pnl < 0 ? (agent.losses || 0) + 1 : agent.losses,
          best_pnl: pnl > (agent.best_pnl || 0) ? pnl : agent.best_pnl,
          worst_pnl: pnl < (agent.worst_pnl || 0) ? pnl : agent.worst_pnl,
        })
        .eq('id', agentId);

      if (updateError) {
        console.error('Balance update error:', updateError);
      }

      console.log(`[execute-agent-trade] Trade executed: ${decision.action} ${tradeAmount} MON, PnL: ${pnl}`);
    } else {
      console.log(`[execute-agent-trade] No trade: action=${decision.action}, confidence=${decision.confidence}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        agentId,
        decision,
        trade: {
          executed: tradeExecuted,
          action: decision.action,
          pnl,
          previousBalance: agentBalance,
          newBalance,
          marketPrice: marketData.currentPrice,
          symbol: marketData.symbol,
        },
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
