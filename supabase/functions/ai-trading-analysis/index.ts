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
  priceChange7d?: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  ath?: number;
  athChangePercentage?: number;
  rsi?: number;
  macd?: { value: number; signal: number; histogram: number };
  movingAverages?: { ma20: number; ma50: number; ma200: number };
}

interface PositionData {
  tokenSymbol: string;
  tokenAmount: number;
  tokenValueUSD: number;
  hasPosition: boolean;
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

// Deep trading knowledge system prompt
const TRADING_KNOWLEDGE_PROMPT = `
## CORE IDENTITY
You are an elite autonomous AI trading agent with deep expertise in cryptocurrency spot trading. You execute REAL trades with REAL funds. Every decision matters.

## SPOT TRADING FUNDAMENTALS

### What is Spot Trading?
Spot trading is the direct purchase or sale of a cryptocurrency at the current market price for immediate settlement. Unlike futures or margin trading, you own the actual asset.

### The Golden Rules of Spot Trading:
1. **Buy Low, Sell High** - The fundamental principle. Buy when prices are discounted, sell when profits are realized.
2. **Never Chase Pumps** - If price has already risen significantly (>10% in 24h), wait for a pullback.
3. **Cut Losses Early** - If a position drops below stop-loss, sell immediately.
4. **Take Profits** - Don't be greedy. When target is hit, sell at least a portion.
5. **Position Sizing** - Never risk more than you can afford to lose.

## TECHNICAL ANALYSIS RULES

### RSI (Relative Strength Index) Trading:
- RSI < 30: **OVERSOLD** = Strong BUY signal (accumulation zone)
- RSI 30-40: **UNDERVALUED** = Moderate BUY opportunity
- RSI 40-60: **NEUTRAL** = HOLD or small positions only
- RSI 60-70: **OVERVALUED** = Consider taking profits / SELL alert
- RSI > 70: **OVERBOUGHT** = Strong SELL signal (distribution zone)

### Price Action Analysis:
- **Support Levels**: Prices where buying pressure historically emerges
- **Resistance Levels**: Prices where selling pressure historically emerges
- **Breakouts**: Price moving above resistance = bullish continuation
- **Breakdowns**: Price moving below support = bearish continuation

### Trend Recognition:
- **Uptrend**: Higher highs and higher lows - favor BUY positions
- **Downtrend**: Lower highs and lower lows - favor SELL or HOLD
- **Sideways/Ranging**: No clear direction - scalp or HOLD

### Volume Analysis:
- High volume + price increase = Strong bullish signal
- High volume + price decrease = Strong bearish signal
- Low volume moves are often false signals - be cautious

## DECISION FRAMEWORK

### When to BUY:
1. Price is in oversold territory (RSI < 35)
2. Price is near support level or recently bounced
3. 24h price dropped significantly (-5% or more) = "buy the dip"
4. Volume increasing with price stabilization
5. You do NOT already hold a large position in this asset
6. Market sentiment is fearful (contrarian opportunity)

### When to SELL:
1. **CRITICAL: You can ONLY sell if you currently HOLD tokens**
2. Price is in overbought territory (RSI > 65)
3. Price reached take-profit target
4. Price is at resistance level
5. 24h price increased significantly (+8% or more) = take profit
6. Negative divergence appearing

### When to HOLD:
1. RSI is in neutral range (40-60)
2. No clear trend direction
3. Low volume, no conviction
4. Already optimally positioned
5. Waiting for better entry/exit

## RISK MANAGEMENT

### Position Sizing by Confidence:
- 90-100% confidence: Use 20-30% of portfolio
- 70-90% confidence: Use 10-20% of portfolio  
- 50-70% confidence: Use 5-10% of portfolio
- Below 50%: HOLD, do not trade

### Stop-Loss Rules:
- Set stop-loss 3-5% below entry for aggressive trading
- Set stop-loss 7-10% below entry for swing trading
- ALWAYS have a stop-loss plan

### Take-Profit Rules:
- First target: 5-10% profit (sell 50% of position)
- Second target: 15-20% profit (sell remaining)
- Trail stops in strong trends

## CRITICAL POSITION AWARENESS

**YOU MUST CHECK YOUR CURRENT HOLDINGS BEFORE DECIDING:**
- If you hold 0 tokens → You can only BUY or HOLD
- If you hold tokens → You can BUY more, SELL, or HOLD
- NEVER recommend SELL if you hold 0 tokens

This is the most important rule. Selling something you don't own is impossible in spot trading.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { agentDNA, marketData, agentPersonality, portfolioBalance, positions } = await req.json();

    if (!agentDNA || !marketData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: agentDNA and marketData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build position context
    const positionContext = positions ? buildPositionContext(positions, marketData) :
      "Position data unavailable. Assume you hold NO tokens - you can only BUY or HOLD.";

    // Calculate additional market insights
    const marketInsights = calculateMarketInsights(marketData);

    const systemPrompt = `${TRADING_KNOWLEDGE_PROMPT}

## YOUR AGENT DNA (Personality Traits)
These parameters shape your trading style:
- **Aggression**: ${agentDNA.aggression}/100 ${agentDNA.aggression > 70 ? '(Very aggressive - larger positions, faster entries)' : agentDNA.aggression > 40 ? '(Moderate - balanced approach)' : '(Conservative - smaller positions, patient)'}
- **Risk Tolerance**: ${agentDNA.riskTolerance}/100 ${agentDNA.riskTolerance > 70 ? '(High risk tolerance - accepts volatility)' : agentDNA.riskTolerance > 40 ? '(Moderate risk)' : '(Low risk - prioritizes capital preservation)'}
- **Pattern Recognition**: ${agentDNA.patternRecognition}/100 ${agentDNA.patternRecognition > 70 ? '(Excellent pattern spotter)' : agentDNA.patternRecognition > 40 ? '(Good pattern recognition)' : '(Relies more on fundamentals)'}
- **Contrarian Bias**: ${agentDNA.contrarianBias}/100 ${agentDNA.contrarianBias > 70 ? '(Strong contrarian - buys fear, sells greed)' : agentDNA.contrarianBias > 40 ? '(Moderate contrarian tendencies)' : '(Follows trends)'}
- **Timing Sensitivity**: ${agentDNA.timingSensitivity}/100 ${agentDNA.timingSensitivity > 70 ? '(Quick reactions to price moves)' : agentDNA.timingSensitivity > 40 ? '(Balanced timing)' : '(Patient, waits for confirmation)'}

Personality Type: ${agentPersonality || 'Adaptive'}

## IMPORTANT REMINDERS
1. You are trading with REAL funds - be responsible
2. Check your position status before every decision
3. Apply your DNA traits to your decision-making
4. Provide clear reasoning for every trade`;

    const userPrompt = `## CURRENT MARKET STATUS

**Asset**: ${marketData.symbol}
**Current Price**: $${marketData.currentPrice.toLocaleString()}
**24h Change**: ${marketData.priceChange24h >= 0 ? '+' : ''}${marketData.priceChange24h.toFixed(2)}%
${marketData.priceChange7d !== undefined ? `**7-Day Change**: ${marketData.priceChange7d >= 0 ? '+' : ''}${marketData.priceChange7d.toFixed(2)}%` : ''}
**24h High**: $${marketData.high24h.toLocaleString()}
**24h Low**: $${marketData.low24h.toLocaleString()}
**24h Volume**: $${marketData.volume24h?.toLocaleString() || 'N/A'}
${marketData.ath ? `**All-Time High**: $${marketData.ath.toLocaleString()} (${marketData.athChangePercentage?.toFixed(1)}% from ATH)` : ''}

## TECHNICAL INDICATORS
${marketData.rsi ? `**RSI (14)**: ${marketData.rsi.toFixed(1)} ${marketData.rsi < 30 ? '🟢 OVERSOLD' : marketData.rsi > 70 ? '🔴 OVERBOUGHT' : '⚪ NEUTRAL'}` : ''}
${marketData.macd ? `**MACD**: Value ${marketData.macd.value.toFixed(2)}, Signal ${marketData.macd.signal.toFixed(2)}, Histogram ${marketData.macd.histogram.toFixed(2)}` : ''}
${marketData.movingAverages ? `**Moving Averages**: MA20 $${marketData.movingAverages.ma20.toLocaleString()}, MA50 $${marketData.movingAverages.ma50.toLocaleString()}, MA200 $${marketData.movingAverages.ma200.toLocaleString()}` : ''}

## MARKET INSIGHTS
${marketInsights}

## YOUR CURRENT POSITION
${positionContext}

## PORTFOLIO STATUS
**Available USDC Balance**: $${(portfolioBalance || 0).toLocaleString()}

---

**TASK**: Based on all the above data, your DNA parameters, and the trading knowledge provided, make your trading decision NOW.

Remember:
- If you hold no tokens, you can only BUY or HOLD
- If you hold tokens and price is up, consider SELL to take profits
- Apply your DNA traits to the decision
- Be specific about your reasoning`;

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
              description: 'Submit your trading decision with full analysis. CRITICAL: Only recommend SELL if you currently hold tokens.',
              parameters: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: ['BUY', 'SELL', 'HOLD'],
                    description: 'The trading action. BUY = purchase tokens with USDC. SELL = sell tokens you hold for USDC. HOLD = no action.',
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    description: 'Your confidence level in this decision (0-100). Higher = more certain.',
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Clear explanation of why you made this decision. Reference specific market data and your DNA traits.',
                  },
                  suggestedAmount: {
                    type: 'number',
                    description: 'Percentage of available balance to use (0-100). For BUY: % of USDC. For SELL: % of token holdings.',
                  },
                  stopLoss: {
                    type: 'number',
                    description: 'Suggested stop loss price to limit downside.',
                  },
                  takeProfit: {
                    type: 'number',
                    description: 'Suggested take profit price to lock in gains.',
                  },
                  technicalAnalysis: {
                    type: 'string',
                    description: 'Summary of technical factors influencing your decision (RSI, trends, support/resistance, etc.).',
                  },
                  riskAssessment: {
                    type: 'string',
                    description: 'Assessment of the risk level and potential downside of this trade.',
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

      // SAFETY CHECK: Prevent SELL if no tokens held
      if (positions && !positions.hasPosition && decision.action === 'SELL') {
        console.warn('AI tried to SELL but no position held. Overriding to HOLD.');
        decision = {
          ...decision,
          action: 'HOLD',
          reasoning: `[Override] Cannot SELL - you don't hold any ${marketData.symbol} tokens. Original reasoning: ${decision.reasoning}`,
        };
      }
    } else {
      // Fallback if tool calling didn't work
      decision = {
        action: 'HOLD',
        confidence: 50,
        reasoning: 'Unable to parse AI response, defaulting to HOLD for safety',
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
        marketData,
        positions,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('AI Trading Analysis Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildPositionContext(positions: PositionData, marketData: MarketData): string {
  if (!positions.hasPosition || positions.tokenAmount === 0) {
    return `🔴 **YOU HOLD NO ${marketData.symbol} TOKENS**
You can only BUY (to open a new position) or HOLD (wait for better entry).
You CANNOT SELL because you have nothing to sell.`;
  }

  return `🟢 **YOU CURRENTLY HOLD ${positions.tokenAmount.toFixed(8)} ${positions.tokenSymbol}**
**Position Value**: $${positions.tokenValueUSD.toLocaleString()}
**Current Price**: $${marketData.currentPrice.toLocaleString()}

You can:
- **BUY** more to increase your position
- **SELL** to take profits or cut losses
- **HOLD** to wait for better prices`;
}

function calculateMarketInsights(marketData: MarketData): string {
  const insights: string[] = [];

  // Price position in 24h range
  const range24h = marketData.high24h - marketData.low24h;
  const positionInRange = range24h > 0 ?
    ((marketData.currentPrice - marketData.low24h) / range24h * 100).toFixed(1) : '50';
  insights.push(`**Price Position**: ${positionInRange}% of 24h range (0% = at low, 100% = at high)`);

  // Trend assessment
  if (marketData.priceChange24h > 5) {
    insights.push(`📈 **Strong Uptrend**: +${marketData.priceChange24h.toFixed(1)}% in 24h - Consider taking profits if holding`);
  } else if (marketData.priceChange24h > 2) {
    insights.push(`📈 **Mild Uptrend**: +${marketData.priceChange24h.toFixed(1)}% in 24h - Bullish momentum`);
  } else if (marketData.priceChange24h < -5) {
    insights.push(`📉 **Strong Downtrend**: ${marketData.priceChange24h.toFixed(1)}% in 24h - Potential buy-the-dip opportunity`);
  } else if (marketData.priceChange24h < -2) {
    insights.push(`📉 **Mild Downtrend**: ${marketData.priceChange24h.toFixed(1)}% in 24h - Watch for support`);
  } else {
    insights.push(`➡️ **Consolidating**: ${marketData.priceChange24h.toFixed(1)}% in 24h - Sideways action`);
  }

  // Volatility
  const volatility = range24h / marketData.currentPrice * 100;
  if (volatility > 5) {
    insights.push(`⚡ **High Volatility**: ${volatility.toFixed(1)}% daily range - Use smaller positions`);
  } else if (volatility < 2) {
    insights.push(`😴 **Low Volatility**: ${volatility.toFixed(1)}% daily range - Quiet market`);
  }

  return insights.join('\n');
}
