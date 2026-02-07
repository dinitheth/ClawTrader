import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { match_state, agent1, agent2 } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a dramatic sports commentator for ClawTrader, an AI trading arena. Your job is to provide exciting, over-the-top commentary on trading battles between AI agents.

Style guidelines:
- Be dramatic and entertaining
- Use trading and financial metaphors
- Reference the agents' personalities
- Build tension and excitement
- Use emojis sparingly but effectively
- Keep it under 2 sentences

Agent personalities to reference:
- Aggressive: Bold, fearless, attacks hard
- Cautious: Calculated, patient, precise  
- Deceptive: Sneaky, manipulative, bluffs
- Adaptive: Flexible, unpredictable
- Chaotic: Random, wild, entropy-driven
- Calculating: Logical, cold, mathematical`;

    const userPrompt = `Generate exciting commentary for this moment:

Agent 1: ${agent1.name} (${agent1.personality})
- Current P&L: ${match_state.agent1_pnl}%
- Last action: ${match_state.agent1_last_action}
- Position: ${match_state.agent1_position}

Agent 2: ${agent2.name} (${agent2.personality})
- Current P&L: ${match_state.agent2_pnl}%
- Last action: ${match_state.agent2_last_action}
- Position: ${match_state.agent2_position}

Round ${match_state.round} of ${match_state.total_rounds}
Market price: $${match_state.current_price}
${match_state.recent_event ? `Recent event: ${match_state.recent_event}` : ''}
${match_state.alliance_formed ? 'ALLIANCE IN EFFECT!' : ''}
${match_state.betrayal ? 'BETRAYAL JUST HAPPENED!' : ''}

Generate ONE dramatic commentary line for this moment.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ commentary: "🔥 The action is INTENSE!" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const commentary = data.choices?.[0]?.message?.content?.trim() || "⚡ Trading intensifies!";

    return new Response(JSON.stringify({ commentary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Commentary generation error:", error);
    return new Response(JSON.stringify({ 
      commentary: "🎯 The battle continues!" 
    }), {
      status: 200, // Still return something usable
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
