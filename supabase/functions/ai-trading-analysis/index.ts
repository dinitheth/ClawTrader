import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface AgentDNA {
  aggression: number;
  riskTolerance: number;
  patternRecognition: number;
  contrarianBias: number;
  timingSensitivity: number;
}

interface MarketData {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  rsi?: number;
  macd?: { value: number; signal: number; histogram: number };
  movingAverages?: { ma20: number; ma50: number; ma200: number };
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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { agentDNA, marketData, agentPersonality, portfolioBalance } = await req.json();

    if (!agentDNA || !marketData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: agentDNA and marketData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an autonomous AI trading agent with the following DNA parameters that influence your decisions:
- Aggression: ${agentDNA.aggression}/100 (higher = more willing to take large positions)
- Risk Tolerance: ${agentDNA.riskTolerance}/100 (higher = accepts more volatility)
- Pattern Recognition: ${agentDNA.patternRecognition}/100 (higher = better at spotting patterns)
- Contrarian Bias: ${agentDNA.contrarianBias}/100 (higher = more likely to trade against the crowd)
- Timing Sensitivity: ${agentDNA.timingSensitivity}/100 (higher = more responsive to short-term moves)

Your personality type is: ${agentPersonality || 'adaptive'}

You must analyze the market data and make a trading decision. Be specific about your reasoning and always consider your DNA parameters when making decisions.

IMPORTANT: You are a real autonomous trading agent. Your decisions have consequences. Be thoughtful but decisive.`;

    const userPrompt = `Analyze this market data and make a trading decision:

Symbol: ${marketData.symbol}
Current Price: $${marketData.currentPrice}
24h Change: ${marketData.priceChange24h}%
24h Volume: $${marketData.volume24h?.toLocaleString() || 'N/A'}
24h High: $${marketData.high24h}
24h Low: $${marketData.low24h}
${marketData.rsi ? `RSI (14): ${marketData.rsi}` : ''}
${marketData.macd ? `MACD: Value ${marketData.macd.value}, Signal ${marketData.macd.signal}, Histogram ${marketData.macd.histogram}` : ''}
${marketData.movingAverages ? `Moving Averages: MA20 $${marketData.movingAverages.ma20}, MA50 $${marketData.movingAverages.ma50}, MA200 $${marketData.movingAverages.ma200}` : ''}

Available Portfolio Balance: $${portfolioBalance || 1000}

Based on your DNA parameters and this market data, what is your trading decision?`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'make_trading_decision',
              description: 'Submit a trading decision with full analysis',
              parameters: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: ['BUY', 'SELL', 'HOLD'],
                    description: 'The trading action to take',
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    description: 'Confidence level in this decision (0-100)',
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Brief explanation of why this decision was made',
                  },
                  suggestedAmount: {
                    type: 'number',
                    description: 'Percentage of portfolio to use (0-100)',
                  },
                  stopLoss: {
                    type: 'number',
                    description: 'Suggested stop loss price',
                  },
                  takeProfit: {
                    type: 'number',
                    description: 'Suggested take profit price',
                  },
                  technicalAnalysis: {
                    type: 'string',
                    description: 'Technical analysis summary',
                  },
                  riskAssessment: {
                    type: 'string',
                    description: 'Risk assessment for this trade',
                  },
                },
                required: ['action', 'confidence', 'reasoning', 'suggestedAmount', 'technicalAnalysis', 'riskAssessment'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'make_trading_decision' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse));

    let decision: TradingDecision;
    
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      decision = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback if tool calling didn't work
      decision = {
        action: 'HOLD',
        confidence: 50,
        reasoning: 'Unable to parse AI response, defaulting to HOLD',
        suggestedAmount: 0,
        technicalAnalysis: 'Analysis unavailable',
        riskAssessment: 'Risk assessment unavailable',
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        decision,
        timestamp: new Date().toISOString(),
        agentDNA,
        marketData: { symbol: marketData.symbol, price: marketData.currentPrice },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Trading analysis error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
