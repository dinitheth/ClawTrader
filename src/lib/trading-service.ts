import { supabase } from '@/integrations/supabase/client';

export interface TradingDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  suggestedAmount: number;
  stopLoss?: number;
  takeProfit?: number;
  technicalAnalysis: string;
  riskAssessment: string;
}

export interface AgentDNA {
  aggression: number;       // 0=passive, 100=attack mode (position size, trade frequency)
  riskTolerance: number;    // 0=conservative, 100=degen (stop-loss width, leverage appetite)
  patternRecognition: number; // 0=intuitive, 100=pattern god (technical indicator weight)
  contrarianBias: number;   // 0=follow crowd, 100=always fade (inverts signals)
  timingSensitivity: number; // 0=YOLO, 100=perfect entry (waiting for confirmation)
}

export interface MarketData {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h?: number;
  high24h: number;
  low24h: number;
  rsi?: number;
  macd?: { value: number; signal: number; histogram: number };
  movingAverages?: { ma20: number; ma50: number; ma200: number };
}

export interface TradingAnalysisResult {
  success: boolean;
  decision?: TradingDecision;
  timestamp?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// DNA-Driven Decision Engine
// Each DNA value (0-100) directly influences a specific behavior:
//   100 = Maximum skill/tendency in that trait
//   50  = Medium/balanced behavior
//   0   = Minimum skill/tendency (or opposite behavior)
// ═══════════════════════════════════════════════════════════════

function computeTechnicalSignals(market: MarketData): {
  trend: number;          // -1 to 1 (bearish to bullish)
  momentum: number;       // -1 to 1
  volatility: number;     // 0 to 1 (low to high)
  rsiSignal: number;      // -1 (overbought) to 1 (oversold/buy)
  macdSignal: number;     // -1 to 1
  maSignal: number;       // -1 to 1 (below MAs to above MAs)
  pricePosition: number;  // 0 to 1 (position within daily range)
} {
  const change = market.priceChange24h || 0;
  const trend = Math.max(-1, Math.min(1, change / 10)); // Normalize to -1..1
  const momentum = Math.max(-1, Math.min(1, change / 5));

  // Volatility: how large is the daily range vs price
  const range = market.high24h - market.low24h;
  const volatility = market.currentPrice > 0 ? Math.min(1, range / market.currentPrice) : 0;

  // RSI signal: below 30 = buy (1), above 70 = sell (-1)
  let rsiSignal = 0;
  if (market.rsi !== undefined) {
    if (market.rsi < 30) rsiSignal = (30 - market.rsi) / 30;
    else if (market.rsi > 70) rsiSignal = -(market.rsi - 70) / 30;
    else rsiSignal = (50 - market.rsi) / 50 * 0.3;
  }

  // MACD signal
  let macdSignal = 0;
  if (market.macd) {
    macdSignal = Math.max(-1, Math.min(1, market.macd.histogram / Math.abs(market.macd.value || 1)));
  }

  // Moving average signal
  let maSignal = 0;
  if (market.movingAverages) {
    const { ma20, ma50, ma200 } = market.movingAverages;
    const price = market.currentPrice;
    let aboveCount = 0;
    if (price > ma20) aboveCount++;
    if (price > ma50) aboveCount++;
    if (price > ma200) aboveCount++;
    maSignal = (aboveCount / 3) * 2 - 1; // -1 to 1
  }

  // Price position within daily range (0=at low, 1=at high)
  const pricePosition = range > 0
    ? (market.currentPrice - market.low24h) / range
    : 0.5;

  return { trend, momentum, volatility, rsiSignal, macdSignal, maSignal, pricePosition };
}

export function generateLocalDecision(
  dna: AgentDNA,
  market: MarketData,
  personality: string = 'adaptive',
  portfolioBalance: number = 1000
): TradingDecision {
  const signals = computeTechnicalSignals(market);

  // ═══ DNA-weighted signal aggregation ═══

  // Pattern Recognition (0=intuitive/random, 100=relies heavily on technicals)
  const patternWeight = dna.patternRecognition / 100;
  const intuitiveWeight = 1 - patternWeight;

  // Technical score: weighted combination of all indicators
  let technicalScore =
    signals.rsiSignal * 0.3 +
    signals.macdSignal * 0.25 +
    signals.maSignal * 0.25 +
    signals.momentum * 0.2;

  // Intuitive score: simpler price action
  let intuitiveScore = signals.trend * 0.5 + (signals.pricePosition < 0.3 ? 0.3 : signals.pricePosition > 0.7 ? -0.3 : 0);

  // Combined raw signal (pattern recognition DNA determines how much we rely on technicals)
  let rawSignal = technicalScore * patternWeight + intuitiveScore * intuitiveWeight;

  // ═══ Contrarian Bias: inverts the signal ═══
  // 0=follow the crowd (use signal as-is), 100=always fade (flip the signal)
  const contrarianFactor = (dna.contrarianBias / 100) * 2 - 1; // -1 to 1
  if (dna.contrarianBias > 60) {
    // Strong contrarian: partially or fully invert
    rawSignal = rawSignal * -contrarianFactor;
  }

  // ═══ Timing Sensitivity: threshold to act ═══
  // 0=YOLO (trades on tiny signals), 100=perfect entry (needs strong confirmation)
  const actionThreshold = 0.05 + (dna.timingSensitivity / 100) * 0.4; // 0.05 to 0.45

  // ═══ Personality modifiers ═══
  let personalityBias = 0;
  let personalityNote = '';
  switch (personality) {
    case 'aggressive':
      personalityBias = 0.1;
      personalityNote = 'Aggressive personality amplifies buy signals.';
      break;
    case 'cautious':
      personalityBias = -0.05;
      personalityNote = 'Cautious personality reduces position aggressiveness.';
      break;
    case 'deceptive':
      // Deceptive agents sometimes do the opposite of what seems logical
      if (Math.random() < 0.15) {
        rawSignal = -rawSignal;
        personalityNote = 'Deceptive personality triggered contrarian play.';
      } else {
        personalityNote = 'Deceptive personality analyzing market traps.';
      }
      break;
    case 'chaotic':
      // Chaotic agents add noise
      rawSignal += (Math.random() - 0.5) * 0.3;
      personalityNote = 'Chaotic personality added entropy to decision.';
      break;
    case 'calculating':
      // Calculating agents increase threshold
      personalityNote = 'Calculating personality demands higher confirmation.';
      break;
    default: // adaptive
      personalityNote = 'Adaptive personality balances all factors.';
  }

  rawSignal += personalityBias;

  // ═══ Determine action ═══
  let action: 'BUY' | 'SELL' | 'HOLD';
  if (rawSignal > actionThreshold) {
    action = 'BUY';
  } else if (rawSignal < -actionThreshold) {
    action = 'SELL';
  } else {
    action = 'HOLD';
  }

  // ═══ Confidence calibration ═══
  // Higher pattern recognition = more confident (better skill)
  const signalStrength = Math.abs(rawSignal);
  const baseConfidence = Math.min(95, signalStrength * 100);
  const skillBonus = (dna.patternRecognition / 100) * 15; // Up to 15% bonus
  const confidence = Math.min(98, Math.max(10, baseConfidence + skillBonus));

  // ═══ Position sizing (driven by Aggression DNA) ═══
  // 0=passive (tiny positions), 100=attack mode (large positions)
  const minPosition = 5;
  const maxPosition = 50;
  const aggressionMultiplier = dna.aggression / 100;
  const basePosition = minPosition + (maxPosition - minPosition) * aggressionMultiplier;
  const suggestedAmount = Math.round(
    Math.min(maxPosition, basePosition * (confidence / 100))
  );

  // ═══ Risk management (driven by Risk Tolerance DNA) ═══
  // 0=tight stops (conservative), 100=wide stops (degen)
  const riskFactor = dna.riskTolerance / 100;
  const stopLossPercent = 2 + riskFactor * 8; // 2% to 10% stop loss
  const takeProfitPercent = 3 + (1 - riskFactor) * 12; // 3% to 15% take profit (less risk = wider TP)

  const stopLoss = action === 'BUY'
    ? Math.round(market.currentPrice * (1 - stopLossPercent / 100))
    : action === 'SELL'
      ? Math.round(market.currentPrice * (1 + stopLossPercent / 100))
      : undefined;

  const takeProfit = action === 'BUY'
    ? Math.round(market.currentPrice * (1 + takeProfitPercent / 100))
    : action === 'SELL'
      ? Math.round(market.currentPrice * (1 - takeProfitPercent / 100))
      : undefined;

  // ═══ Build reasoning ═══
  const dnaDescription = [
    `Risk: ${dna.riskTolerance >= 70 ? 'High' : dna.riskTolerance >= 40 ? 'Medium' : 'Low'} (${dna.riskTolerance}/100)`,
    `Aggression: ${dna.aggression >= 70 ? 'Attack' : dna.aggression >= 40 ? 'Balanced' : 'Passive'} (${dna.aggression}/100)`,
    `Pattern: ${dna.patternRecognition >= 70 ? 'Expert' : dna.patternRecognition >= 40 ? 'Moderate' : 'Intuitive'} (${dna.patternRecognition}/100)`,
    `Timing: ${dna.timingSensitivity >= 70 ? 'Patient' : dna.timingSensitivity >= 40 ? 'Flexible' : 'Impulsive'} (${dna.timingSensitivity}/100)`,
    `Contrarian: ${dna.contrarianBias >= 70 ? 'Fader' : dna.contrarianBias >= 40 ? 'Mixed' : 'Trend Follower'} (${dna.contrarianBias}/100)`,
  ].join('. ');

  const priceContext = `${market.symbol} at $${market.currentPrice.toLocaleString()} (${market.priceChange24h >= 0 ? '+' : ''}${market.priceChange24h.toFixed(2)}% 24h).`;

  const signalExplanation = action === 'HOLD'
    ? `Signal strength (${(signalStrength * 100).toFixed(1)}%) below action threshold (${(actionThreshold * 100).toFixed(1)}%). Waiting for stronger confirmation.`
    : `Signal strength ${(signalStrength * 100).toFixed(1)}% exceeds threshold. ${dna.contrarianBias > 60 ? 'Contrarian bias active: fading the crowd.' : 'Following technical consensus.'}`;

  const reasoning = `${priceContext} ${signalExplanation} ${personalityNote}`;

  const technicalAnalysis = [
    `Trend: ${signals.trend > 0.1 ? 'Bullish' : signals.trend < -0.1 ? 'Bearish' : 'Neutral'} (${(signals.trend * 100).toFixed(0)}%)`,
    market.rsi !== undefined ? `RSI: ${market.rsi.toFixed(0)} (${market.rsi < 30 ? 'Oversold' : market.rsi > 70 ? 'Overbought' : 'Neutral'})` : '',
    market.macd ? `MACD: ${signals.macdSignal > 0 ? 'Bullish' : 'Bearish'} (hist: ${market.macd.histogram.toFixed(2)})` : '',
    `Volatility: ${(signals.volatility * 100).toFixed(1)}%`,
    `Range position: ${(signals.pricePosition * 100).toFixed(0)}% (0=low, 100=high)`,
  ].filter(Boolean).join('. ');

  const riskAssessment = `${dnaDescription}. Stop loss: ${stopLossPercent.toFixed(1)}% (${dna.riskTolerance >= 70 ? 'wide - high risk tolerance' : dna.riskTolerance >= 40 ? 'moderate' : 'tight - conservative'}). Position size: ${suggestedAmount}% of portfolio.`;

  return {
    action,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
    suggestedAmount,
    stopLoss,
    takeProfit,
    technicalAnalysis,
    riskAssessment,
  };
}

// ═══ Main analysis function: tries Supabase Edge Function, falls back to local engine ═══
export async function getAITradingAnalysis(
  agentDNA: AgentDNA,
  marketData: MarketData,
  agentPersonality: string = 'adaptive',
  portfolioBalance: number = 1000
): Promise<TradingAnalysisResult> {
  try {
    // Try Supabase Edge Function first (if available)
    const { data, error } = await supabase.functions.invoke('ai-trading-analysis', {
      body: {
        agentDNA,
        marketData,
        agentPersonality,
        portfolioBalance,
      },
    });

    if (!error && data?.success) {
      return data as TradingAnalysisResult;
    }

    // Fall back to local DNA-driven engine
    console.log('Edge function unavailable, using local DNA engine');
    const decision = generateLocalDecision(agentDNA, marketData, agentPersonality, portfolioBalance);
    return {
      success: true,
      decision,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    // Fall back to local engine on any error
    console.log('Using local DNA-driven decision engine');
    try {
      const decision = generateLocalDecision(agentDNA, marketData, agentPersonality, portfolioBalance);
      return {
        success: true,
        decision,
        timestamp: new Date().toISOString(),
      };
    } catch (localErr) {
      return {
        success: false,
        error: localErr instanceof Error ? localErr.message : 'Decision engine error',
      };
    }
  }
}

// Fetch real market data from CoinGecko (free API)
export async function fetchMarketData(coinId: string = 'bitcoin'): Promise<MarketData | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch market data');
    }

    const data = await response.json();

    return {
      symbol: data.symbol.toUpperCase(),
      currentPrice: data.market_data.current_price.usd,
      priceChange24h: data.market_data.price_change_percentage_24h,
      volume24h: data.market_data.total_volume.usd,
      high24h: data.market_data.high_24h.usd,
      low24h: data.market_data.low_24h.usd,
    };
  } catch (error) {
    console.error('Error fetching market data:', error);
    return null;
  }
}

// Map TradingView symbols to CoinGecko IDs
export const SYMBOL_TO_COINGECKO: Record<string, string> = {
  'BINANCE:BTCUSDT': 'bitcoin',
  'BINANCE:ETHUSDT': 'ethereum',
  'BINANCE:SOLUSDT': 'solana',
  'BINANCE:AVAXUSDT': 'avalanche-2',
  'BINANCE:NEARUSDT': 'near',
  'BINANCE:ARBUSDT': 'arbitrum',
  'BINANCE:OPUSDT': 'optimism',
};

export function getCoinGeckoId(tradingViewSymbol: string): string {
  return SYMBOL_TO_COINGECKO[tradingViewSymbol] || 'bitcoin';
}
