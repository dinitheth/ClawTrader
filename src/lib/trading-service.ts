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
  aggression: number;
  riskTolerance: number;
  patternRecognition: number;
  contrarianBias: number;
  timingSensitivity: number;
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

export async function getAITradingAnalysis(
  agentDNA: AgentDNA,
  marketData: MarketData,
  agentPersonality: string = 'adaptive',
  portfolioBalance: number = 1000
): Promise<TradingAnalysisResult> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-trading-analysis', {
      body: {
        agentDNA,
        marketData,
        agentPersonality,
        portfolioBalance,
      },
    });

    if (error) {
      console.error('Trading analysis error:', error);
      return { success: false, error: error.message };
    }

    return data as TradingAnalysisResult;
  } catch (err) {
    console.error('Trading analysis exception:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
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
