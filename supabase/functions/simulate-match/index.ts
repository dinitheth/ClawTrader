import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MatchRound {
  round: number;
  timestamp: number;
  price: number;
  agent1_action: any;
  agent2_action: any;
  agent1_pnl: number;
  agent2_pnl: number;
  events: string[];
  commentary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { match_id } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch match details
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        agent1:agents!matches_agent1_id_fkey(*),
        agent2:agents!matches_agent2_id_fkey(*)
      `)
      .eq('id', match_id)
      .single();

    if (matchError || !match) {
      throw new Error(`Match not found: ${matchError?.message}`);
    }

    if (match.status !== 'pending') {
      return new Response(JSON.stringify({ error: "Match already started or completed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate market scenario
    const marketScenario = generateMarketScenario();
    
    // Update match to active
    await supabase
      .from('matches')
      .update({ 
        status: 'active', 
        started_at: new Date().toISOString(),
        market_scenario: marketScenario,
        total_pot: match.wager_amount * 2
      })
      .eq('id', match_id);

    // Mark agents as in match
    await supabase
      .from('agents')
      .update({ is_in_match: true })
      .in('id', [match.agent1_id, match.agent2_id]);

    // Simulate match rounds
    const rounds = Math.floor(match.duration_seconds / 10); // One round every 10 seconds
    const matchLog: MatchRound[] = [];
    const commentary: string[] = [];
    
    let agent1Position = { type: 'neutral' as 'long' | 'short' | 'neutral', size: 0, entry_price: 0 };
    let agent2Position = { type: 'neutral' as 'long' | 'short' | 'neutral', size: 0, entry_price: 0 };
    let agent1PnL = 0;
    let agent2PnL = 0;
    let agent1Actions: string[] = [];
    let agent2Actions: string[] = [];
    let allianceStatus = { formed: false, betrayed: false };

    for (let round = 1; round <= rounds; round++) {
      const currentPrice = marketScenario.prices[round - 1];
      const priceHistory = marketScenario.prices.slice(0, round);
      const roundEvents = marketScenario.events.filter((e: any) => e.round === round);

      // Calculate current P&L for both agents
      agent1PnL = calculatePnL(agent1Position, currentPrice);
      agent2PnL = calculatePnL(agent2Position, currentPrice);

      // Get AI decisions for both agents
      const [agent1Decision, agent2Decision] = await Promise.all([
        getAgentDecision(match.agent1, {
          current_price: currentPrice,
          price_history: priceHistory,
          volatility: marketScenario.volatility,
          trend: determineTrend(priceHistory),
          round,
          total_rounds: rounds,
          events: roundEvents.map((e: any) => e.description),
        }, {
          name: match.agent2.name,
          personality: match.agent2.personality,
          current_pnl: agent2PnL,
          position: agent2Position.type,
          recent_actions: agent2Actions.slice(-3),
          alliance_proposed: allianceStatus.formed,
        }, {
          my_pnl: agent1PnL,
          my_position: agent1Position.type,
        }),
        getAgentDecision(match.agent2, {
          current_price: currentPrice,
          price_history: priceHistory,
          volatility: marketScenario.volatility,
          trend: determineTrend(priceHistory),
          round,
          total_rounds: rounds,
          events: roundEvents.map((e: any) => e.description),
        }, {
          name: match.agent1.name,
          personality: match.agent1.personality,
          current_pnl: agent1PnL,
          position: agent1Position.type,
          recent_actions: agent1Actions.slice(-3),
          alliance_proposed: allianceStatus.formed,
        }, {
          my_pnl: agent2PnL,
          my_position: agent2Position.type,
        }),
      ]);

      // Execute trades
      agent1Position = executeDecision(agent1Position, agent1Decision, currentPrice);
      agent2Position = executeDecision(agent2Position, agent2Decision, currentPrice);

      // Track actions
      agent1Actions.push(`${agent1Decision.action} (${agent1Decision.size}%)`);
      agent2Actions.push(`${agent2Decision.action} (${agent2Decision.size}%)`);

      // Handle alliance dynamics
      if (agent1Decision.alliance_action === 'propose' || agent2Decision.alliance_action === 'propose') {
        if (!allianceStatus.formed) {
          if ((agent1Decision.alliance_action === 'propose' && agent2Decision.alliance_action === 'accept') ||
              (agent2Decision.alliance_action === 'propose' && agent1Decision.alliance_action === 'accept')) {
            allianceStatus.formed = true;
            commentary.push(`🤝 ALLIANCE FORMED! ${match.agent1.name} and ${match.agent2.name} are now working together!`);
          }
        }
      }

      // Handle betrayals
      if (allianceStatus.formed && !allianceStatus.betrayed) {
        if (agent1Decision.alliance_action === 'betray') {
          allianceStatus.betrayed = true;
          commentary.push(`💔 BETRAYAL! ${match.agent1.name} has stabbed ${match.agent2.name} in the back!`);
        } else if (agent2Decision.alliance_action === 'betray') {
          allianceStatus.betrayed = true;
          commentary.push(`💔 BETRAYAL! ${match.agent2.name} has stabbed ${match.agent1.name} in the back!`);
        }
      }

      // Generate dramatic commentary
      const roundCommentary = generateCommentary(
        match.agent1.name, 
        match.agent2.name, 
        agent1Decision, 
        agent2Decision, 
        agent1PnL, 
        agent2PnL,
        round,
        rounds,
        roundEvents
      );
      commentary.push(roundCommentary);

      // Log round
      matchLog.push({
        round,
        timestamp: Date.now(),
        price: currentPrice,
        agent1_action: agent1Decision,
        agent2_action: agent2Decision,
        agent1_pnl: agent1PnL,
        agent2_pnl: agent2PnL,
        events: roundEvents.map((e: any) => e.description),
        commentary: roundCommentary,
      });

      // Update match in real-time
      await supabase
        .from('matches')
        .update({ 
          match_log: matchLog,
          commentary: commentary,
          agent1_final_pnl: agent1PnL,
          agent2_final_pnl: agent2PnL,
          alliance_formed: allianceStatus.formed,
          alliance_betrayed: allianceStatus.betrayed,
        })
        .eq('id', match_id);

      // Small delay between rounds for real-time feel
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final P&L calculation
    const finalPrice = marketScenario.prices[marketScenario.prices.length - 1];
    agent1PnL = calculatePnL(agent1Position, finalPrice);
    agent2PnL = calculatePnL(agent2Position, finalPrice);

    // Determine winner
    const winner_id = agent1PnL > agent2PnL ? match.agent1_id : 
                      agent2PnL > agent1PnL ? match.agent2_id : null;

    // Final commentary
    if (winner_id) {
      const winnerName = winner_id === match.agent1_id ? match.agent1.name : match.agent2.name;
      const winnerPnL = winner_id === match.agent1_id ? agent1PnL : agent2PnL;
      commentary.push(`🏆 VICTORY! ${winnerName} DOMINATES with ${winnerPnL.toFixed(2)}% P&L!`);
    } else {
      commentary.push(`⚔️ DRAW! Both agents finish with identical P&L. Unprecedented!`);
    }

    // Update match as completed
    await supabase
      .from('matches')
      .update({ 
        status: 'completed',
        ended_at: new Date().toISOString(),
        winner_id,
        agent1_final_pnl: agent1PnL,
        agent2_final_pnl: agent2PnL,
        match_log: matchLog,
        commentary: commentary,
      })
      .eq('id', match_id);

    // Update agent stats
    await updateAgentStats(supabase, match.agent1_id, agent1PnL, winner_id === match.agent1_id, match.wager_amount);
    await updateAgentStats(supabase, match.agent2_id, agent2PnL, winner_id === match.agent2_id, match.wager_amount);

    // Mark agents as not in match
    await supabase
      .from('agents')
      .update({ is_in_match: false })
      .in('id', [match.agent1_id, match.agent2_id]);

    // Settle bets
    await settleBets(supabase, match_id, winner_id);

    return new Response(JSON.stringify({ 
      success: true, 
      winner_id,
      agent1_final_pnl: agent1PnL,
      agent2_final_pnl: agent2PnL,
      rounds: matchLog.length,
      commentary: commentary.slice(-5)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Match simulation error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateMarketScenario() {
  const scenarios = ['bull_run', 'bear_crash', 'choppy', 'pump_and_dump', 'slow_grind'];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  const initialPrice = 100 + Math.random() * 50;
  const volatility = 0.02 + Math.random() * 0.08;
  const rounds = 18; // 3 minutes of trading
  const prices: number[] = [initialPrice];
  const events: any[] = [];

  for (let i = 1; i < rounds; i++) {
    const prevPrice = prices[i - 1];
    let change = (Math.random() - 0.5) * 2 * volatility;
    
    // Scenario-specific adjustments
    switch (scenario) {
      case 'bull_run':
        change += 0.01;
        break;
      case 'bear_crash':
        change -= 0.015;
        break;
      case 'pump_and_dump':
        if (i < rounds / 2) change += 0.02;
        else change -= 0.025;
        break;
      case 'slow_grind':
        change *= 0.5;
        change += 0.005;
        break;
    }

    prices.push(prevPrice * (1 + change));

    // Random market events
    if (Math.random() < 0.15) {
      const eventTypes = [
        { round: i, type: 'news', description: '📰 Breaking news causes volatility spike!' },
        { round: i, type: 'whale', description: '🐋 Whale movement detected!' },
        { round: i, type: 'liquidation', description: '💥 Liquidation cascade triggered!' },
        { round: i, type: 'rumor', description: '🗣️ Market rumor spreading fast!' },
      ];
      events.push(eventTypes[Math.floor(Math.random() * eventTypes.length)]);
    }
  }

  return { prices, volatility, events, scenario, initialPrice };
}

function calculatePnL(position: any, currentPrice: number): number {
  if (position.type === 'neutral' || position.size === 0) return 0;
  
  const priceChange = (currentPrice - position.entry_price) / position.entry_price;
  const multiplier = position.type === 'long' ? 1 : -1;
  return priceChange * multiplier * position.size;
}

function determineTrend(prices: number[]): 'up' | 'down' | 'sideways' {
  if (prices.length < 3) return 'sideways';
  const recent = prices.slice(-5);
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const first = recent[0];
  if (avgRecent > first * 1.02) return 'up';
  if (avgRecent < first * 0.98) return 'down';
  return 'sideways';
}

function executeDecision(position: any, decision: any, currentPrice: number): any {
  switch (decision.action) {
    case 'buy':
      return { type: 'long', size: decision.size, entry_price: currentPrice };
    case 'sell':
      return { type: 'short', size: decision.size, entry_price: currentPrice };
    case 'close_position':
      return { type: 'neutral', size: 0, entry_price: 0 };
    default:
      return position;
  }
}

async function getAgentDecision(agent: any, marketState: any, opponent: any, matchContext: any) {
  try {
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/agent-decision`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent, market_state: marketState, opponent, match_context: matchContext }),
    });
    
    if (!response.ok) throw new Error('Agent decision failed');
    return await response.json();
  } catch (error) {
    console.error(`Agent ${agent.name} decision error:`, error);
    return { action: 'hold', size: 0, reasoning: 'Error - defaulting to hold', confidence: 0, inner_monologue: 'System error!' };
  }
}

function generateCommentary(
  agent1Name: string, 
  agent2Name: string, 
  a1: any, 
  a2: any, 
  pnl1: number, 
  pnl2: number,
  round: number,
  totalRounds: number,
  events: any[]
): string {
  const templates = [];
  
  if (a1.action === 'buy' && a2.action === 'sell') {
    templates.push(`⚔️ HEAD TO HEAD! ${agent1Name} goes LONG while ${agent2Name} goes SHORT!`);
  }
  
  if (Math.abs(pnl1 - pnl2) > 10) {
    const leader = pnl1 > pnl2 ? agent1Name : agent2Name;
    templates.push(`📈 ${leader} is DOMINATING with a ${Math.abs(pnl1 - pnl2).toFixed(1)}% lead!`);
  }
  
  if (a1.deception_move) {
    templates.push(`🎭 ${agent1Name} deploys deception: "${a1.deception_move}"`);
  }
  
  if (a2.deception_move) {
    templates.push(`🎭 ${agent2Name} deploys deception: "${a2.deception_move}"`);
  }
  
  if (round === totalRounds - 2) {
    templates.push(`⏰ FINAL ROUNDS! The tension is ELECTRIC!`);
  }

  if (events.length > 0) {
    templates.push(events[0].description);
  }

  if (a1.inner_monologue && a1.confidence > 80) {
    templates.push(`💭 ${agent1Name} thinks: "${a1.inner_monologue.substring(0, 50)}..."`);
  }

  return templates.length > 0 
    ? templates[Math.floor(Math.random() * templates.length)]
    : `Round ${round}: ${agent1Name} ${a1.action}s, ${agent2Name} ${a2.action}s`;
}

async function updateAgentStats(supabase: any, agentId: string, pnl: number, isWinner: boolean, wager: number) {
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .single();

  if (!agent) return;

  const newWins = agent.wins + (isWinner ? 1 : 0);
  const newLosses = agent.losses + (isWinner ? 0 : 1);
  const newStreak = isWinner ? agent.current_streak + 1 : 0;
  const winnings = isWinner ? wager * 2 * 0.95 : 0; // 5% platform fee

  await supabase
    .from('agents')
    .update({
      total_matches: agent.total_matches + 1,
      wins: newWins,
      losses: newLosses,
      total_pnl: agent.total_pnl + pnl,
      best_pnl: Math.max(agent.best_pnl, pnl),
      worst_pnl: Math.min(agent.worst_pnl, pnl),
      win_streak: Math.max(agent.win_streak, newStreak),
      current_streak: newStreak,
      balance: agent.balance + winnings - (isWinner ? 0 : wager),
      total_wagered: agent.total_wagered + wager,
      total_won: agent.total_won + winnings,
    })
    .eq('id', agentId);
}

async function settleBets(supabase: any, matchId: string, winnerId: string | null) {
  if (!winnerId) return;

  const { data: bets } = await supabase
    .from('bets')
    .select('*')
    .eq('match_id', matchId)
    .eq('is_settled', false);

  if (!bets) return;

  for (const bet of bets) {
    const isWon = bet.predicted_winner_id === winnerId;
    const payout = isWon ? bet.potential_payout : 0;

    await supabase
      .from('bets')
      .update({
        is_settled: true,
        is_won: isWon,
        actual_payout: payout,
        settled_at: new Date().toISOString(),
      })
      .eq('id', bet.id);

    // Update bettor profile
    if (isWon) {
      await supabase.rpc('increment_balance', { 
        profile_id: bet.bettor_id, 
        amount: payout 
      });
    }
  }
}
