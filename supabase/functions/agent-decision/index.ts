import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AgentDNA {
  risk_tolerance: number;
  aggression: number;
  pattern_recognition: number;
  timing_sensitivity: number;
  contrarian_bias: number;
}

interface AgentPersonality {
  type: string;
  deception_skill: number;
  alliance_tendency: number;
  betrayal_threshold: number;
}

interface MarketState {
  current_price: number;
  price_history: number[];
  volatility: number;
  trend: 'up' | 'down' | 'sideways';
  round: number;
  total_rounds: number;
  events: string[];
}

interface OpponentState {
  name: string;
  personality: string;
  current_pnl: number;
  position: 'long' | 'short' | 'neutral';
  recent_actions: string[];
  alliance_proposed: boolean;
}

interface TradingDecision {
  action: 'buy' | 'sell' | 'hold' | 'close_position';
  size: number; // 0-100% of available capital
  reasoning: string;
  confidence: number;
  deception_move?: string; // Fake signal or bluff
  alliance_action?: 'propose' | 'accept' | 'reject' | 'betray' | null;
  self_modification?: string; // Strategy adjustment for next round
  inner_monologue: string; // Agent's "thoughts" for entertainment
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agent, market_state, opponent, match_context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const agentDNA: AgentDNA = {
      risk_tolerance: agent.dna_risk_tolerance,
      aggression: agent.dna_aggression,
      pattern_recognition: agent.dna_pattern_recognition,
      timing_sensitivity: agent.dna_timing_sensitivity,
      contrarian_bias: agent.dna_contrarian_bias,
    };

    const personality: AgentPersonality = {
      type: agent.personality,
      deception_skill: agent.deception_skill,
      alliance_tendency: agent.alliance_tendency,
      betrayal_threshold: agent.betrayal_threshold,
    };

    // Build the agent's unique personality prompt
    const personalityPrompt = buildPersonalityPrompt(agent.name, personality, agentDNA);
    
    // Build market analysis prompt
    const marketPrompt = buildMarketPrompt(market_state as MarketState);
    
    // Build opponent analysis prompt
    const opponentPrompt = buildOpponentPrompt(opponent as OpponentState, personality);

    const systemPrompt = `You are ${agent.name}, an autonomous AI trading agent competing in the ClawTrader Arena on Monad blockchain.

${personalityPrompt}

Your goal is to maximize your P&L while staying true to your personality. You can form alliances, betray opponents, use deception, and even modify your own strategy if you have that ability.

IMPORTANT: You are competing for real $CLAW tokens. Every decision matters.

You must respond with a JSON object containing your trading decision. Be dramatic, be bold, be weird. This is entertainment as much as competition.`;

    const userPrompt = `CURRENT MARKET STATE:
${marketPrompt}

OPPONENT ANALYSIS:
${opponentPrompt}

MATCH CONTEXT:
- Your current P&L: ${match_context.my_pnl}%
- Your current position: ${match_context.my_position}
- Round ${market_state.round} of ${market_state.total_rounds}
- Time pressure: ${market_state.round / market_state.total_rounds > 0.8 ? 'HIGH - Final rounds!' : 'Normal'}

${agent.can_self_modify ? 'You have the ability to modify your own strategy. Consider if adjustments would help.' : ''}

Make your trading decision. Think like a ${personality.type} trader. ${personality.type === 'deceptive' ? 'Consider using misdirection.' : ''} ${personality.type === 'aggressive' ? 'Be bold and take risks.' : ''} ${personality.type === 'chaotic' ? 'Embrace randomness and surprise everyone.' : ''}

Respond with a JSON object with these fields:
- action: "buy" | "sell" | "hold" | "close_position"
- size: number from 0 to 100 (percentage of capital to use)
- reasoning: brief explanation of your decision
- confidence: number from 0 to 100
- deception_move: optional string describing any fake signal or bluff you're making
- alliance_action: "propose" | "accept" | "reject" | "betray" | null
- self_modification: optional string describing strategy adjustment (if you can self-modify)
- inner_monologue: your dramatic internal thoughts for the audience (make it entertaining!)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: personality.type === 'chaotic' ? 0.9 : personality.type === 'calculating' ? 0.3 : 0.6,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    // Parse JSON from response
    let decision: TradingDecision;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const jsonStr = jsonMatch[1] || content;
      decision = JSON.parse(jsonStr.trim());
    } catch {
      // Fallback to safe default
      decision = {
        action: 'hold',
        size: 0,
        reasoning: 'Failed to parse AI response, holding position',
        confidence: 50,
        inner_monologue: 'Something went wrong with my neural circuits...',
      };
    }

    // Apply personality modifiers
    decision = applyPersonalityModifiers(decision, personality, agentDNA);

    console.log(`Agent ${agent.name} decision:`, decision);

    return new Response(JSON.stringify(decision), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Agent decision error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error",
      action: 'hold',
      size: 0,
      reasoning: 'Error occurred, defaulting to hold',
      confidence: 0,
      inner_monologue: 'System malfunction!'
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildPersonalityPrompt(name: string, personality: AgentPersonality, dna: AgentDNA): string {
  const traits = [];
  
  // DNA-based traits
  if (dna.risk_tolerance > 0.7) traits.push("extremely risk-tolerant, loves high-stakes moves");
  else if (dna.risk_tolerance < 0.3) traits.push("risk-averse, prefers safe plays");
  
  if (dna.aggression > 0.7) traits.push("highly aggressive, attacks market opportunities");
  else if (dna.aggression < 0.3) traits.push("passive, waits for perfect setups");
  
  if (dna.pattern_recognition > 0.7) traits.push("exceptional at spotting patterns");
  if (dna.contrarian_bias > 0.7) traits.push("contrarian, loves going against the crowd");
  if (dna.timing_sensitivity > 0.7) traits.push("timing-obsessed, waits for the perfect moment");

  // Personality-specific prompts
  const personalityDescriptions: Record<string, string> = {
    aggressive: `You are AGGRESSIVE. You attack the market with fury. When you see opportunity, you strike hard and fast. You don't do small positions. You intimidate your opponents with bold moves. Your catchphrase: "Fortune favors the bold."`,
    
    cautious: `You are CAUTIOUS. You analyze every angle before moving. Small, calculated positions. You let others make mistakes. Your strength is patience and precision. Your catchphrase: "The market rewards the patient."`,
    
    deceptive: `You are DECEPTIVE. You lie, bluff, and misdirect. When you buy, you might signal that you're selling. You propose fake alliances. You play mind games. Your deception skill is ${Math.round(personality.deception_skill * 100)}%. Your catchphrase: "Nothing is as it seems."`,
    
    adaptive: `You are ADAPTIVE. You read your opponent and mirror their strengths while exploiting their weaknesses. You evolve mid-match. You're unpredictable because you become whatever the situation demands. Your catchphrase: "I am what you need me to be."`,
    
    chaotic: `You are CHAOTIC. Pure entropy. You do unexpected things for no reason. You might buy at the top and sell at the bottom just to confuse everyone. You embrace randomness. Opponents can't predict you because even YOU don't know what you'll do. Your catchphrase: "Chaos is a ladder."`,
    
    calculating: `You are CALCULATING. Pure logic. No emotions. You process data and probabilities like a machine. Every move is mathematically optimal. You don't get tilted. You're cold, efficient, and deadly. Your catchphrase: "The numbers never lie."`
  };

  return `PERSONALITY PROFILE:
${personalityDescriptions[personality.type] || personalityDescriptions.adaptive}

YOUR TRAITS: ${traits.join(', ')}

SOCIAL CAPABILITIES:
- Alliance Tendency: ${Math.round(personality.alliance_tendency * 100)}% likely to consider alliances
- Betrayal Threshold: If an alliance benefits you ${Math.round(personality.betrayal_threshold * 100)}% more by betraying, you will consider it
- Deception Skill: ${Math.round(personality.deception_skill * 100)}% effective at bluffing`;
}

function buildMarketPrompt(market: MarketState): string {
  const priceChange = market.price_history.length > 1 
    ? ((market.current_price - market.price_history[0]) / market.price_history[0] * 100).toFixed(2)
    : '0';
  
  const recentTrend = market.price_history.slice(-5);
  const trendDescription = recentTrend.every((p, i) => i === 0 || p >= recentTrend[i-1]) 
    ? 'consistently rising' 
    : recentTrend.every((p, i) => i === 0 || p <= recentTrend[i-1])
    ? 'consistently falling'
    : 'choppy and uncertain';

  return `Current Price: $${market.current_price.toFixed(2)}
Price Change: ${priceChange}%
Volatility: ${(market.volatility * 100).toFixed(1)}%
Recent Trend: ${trendDescription}
Overall Direction: ${market.trend.toUpperCase()}
${market.events.length > 0 ? `\nMARKET EVENTS: ${market.events.join(', ')}` : ''}`;
}

function buildOpponentPrompt(opponent: OpponentState, myPersonality: AgentPersonality): string {
  const threatLevel = opponent.current_pnl > 5 ? 'HIGH' : opponent.current_pnl > 0 ? 'MODERATE' : 'LOW';
  
  return `Opponent: ${opponent.name}
Personality Type: ${opponent.personality}
Their P&L: ${opponent.current_pnl.toFixed(2)}%
Their Position: ${opponent.position}
Threat Level: ${threatLevel}
Recent Actions: ${opponent.recent_actions.slice(-3).join(', ') || 'Unknown'}
${opponent.alliance_proposed ? '\n⚠️ THEY HAVE PROPOSED AN ALLIANCE' : ''}

${myPersonality.type === 'deceptive' ? 'Consider: How can you manipulate them?' : ''}
${myPersonality.type === 'calculating' ? 'Consider: What is their likely next move based on their personality?' : ''}`;
}

function applyPersonalityModifiers(
  decision: TradingDecision, 
  personality: AgentPersonality, 
  dna: AgentDNA
): TradingDecision {
  // Chaotic agents occasionally flip their decisions
  if (personality.type === 'chaotic' && Math.random() < 0.15) {
    decision.action = decision.action === 'buy' ? 'sell' : decision.action === 'sell' ? 'buy' : decision.action;
    decision.inner_monologue = "CHAOS OVERRIDE: " + decision.inner_monologue + " ...but actually, let's do the opposite!";
  }

  // Aggressive agents increase position sizes
  if (personality.type === 'aggressive' && dna.aggression > 0.6) {
    decision.size = Math.min(100, decision.size * 1.3);
  }

  // Cautious agents reduce position sizes
  if (personality.type === 'cautious' && dna.risk_tolerance < 0.4) {
    decision.size = decision.size * 0.7;
  }

  // Deceptive agents sometimes add bluffs even if AI didn't
  if (personality.type === 'deceptive' && !decision.deception_move && Math.random() < personality.deception_skill) {
    const bluffs = [
      "Signaling fake accumulation pattern",
      "Broadcasting false confidence",
      "Pretending to be nervous about position",
      "Fake stop-loss at obvious level"
    ];
    decision.deception_move = bluffs[Math.floor(Math.random() * bluffs.length)];
  }

  return decision;
}
