import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { TradingViewChart, SymbolSelector, IntervalSelector } from '@/components/trading';
import { FundAgentModal } from '@/components/trading/FundAgentModal';
import { AgentPortfolio } from '@/components/trading/AgentPortfolio';
import { ExecuteTradeModal } from '@/components/trading/ExecuteTradeModal';
import { LatestDecisionCard } from '@/components/trading/LatestDecisionCard';
import { CryptoNewsCard } from '@/components/trading/CryptoNewsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Brain, TrendingUp, TrendingDown, Loader2, Zap, Clock, Activity, Wallet, Play, Square, AlertCircle, ExternalLink, DollarSign } from 'lucide-react';
import { useAccount, useReadContract } from 'wagmi';
import { agentService } from '@/lib/api';
import { getAITradingAnalysis, fetchMarketData, getCoinGeckoId, type TradingDecision, type AgentDNA } from '@/lib/trading-service';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/theme/ThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { USDC_CONFIG, ERC20_ABI, formatUSDC } from '@/lib/usdc-config';

interface Trade {
  id: string;
  action: 'BUY' | 'SELL';
  symbol: string;
  amount: number;
  price: number;
  timestamp: string;
  pnl?: number;
  txHash?: string;
}

const Trading = () => {
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const { theme } = useTheme();

  const [symbol, setSymbol] = useState('BINANCE:BTCUSDT');
  const [chartInterval, setChartInterval] = useState('15');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(searchParams.get('agent'));
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [decision, setDecision] = useState<TradingDecision | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [agentBalance, setAgentBalance] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<Array<{
    timestamp: string;
    symbol: string;
    decision: TradingDecision;
    agentName: string;
  }>>([]);

  // Read wallet USDC balance
  const { data: walletUSDCBalance } = useReadContract({
    address: USDC_CONFIG.contractAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && USDC_CONFIG.contractAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  useEffect(() => {
    loadAgents();
  }, [address]);

  const loadAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const allAgents = await agentService.getAll();
      setAgents(allAgents);
      if (allAgents.length > 0 && !selectedAgentId) {
        setSelectedAgentId(allAgents[0].id);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // Update balance when agent changes
  useEffect(() => {
    if (selectedAgent) {
      setAgentBalance(Number(selectedAgent.balance) || 0);
    }
  }, [selectedAgent]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedAgent) {
      toast({ title: 'Select an Agent', description: 'Choose an agent to analyze the market', variant: 'destructive' });
      return null;
    }

    setIsAnalyzing(true);

    try {
      const coinId = getCoinGeckoId(symbol);
      const marketData = await fetchMarketData(coinId);

      if (!marketData) {
        throw new Error('Failed to fetch market data');
      }

      const agentDNA: AgentDNA = {
        aggression: Number(selectedAgent.dna_aggression) * 100,
        riskTolerance: Number(selectedAgent.dna_risk_tolerance) * 100,
        patternRecognition: Number(selectedAgent.dna_pattern_recognition) * 100,
        contrarianBias: Number(selectedAgent.dna_contrarian_bias) * 100,
        timingSensitivity: Number(selectedAgent.dna_timing_sensitivity) * 100,
      };

      const result = await getAITradingAnalysis(
        agentDNA,
        marketData,
        selectedAgent.personality,
        agentBalance
      );

      if (result.success && result.decision) {
        setDecision(result.decision);
        setAnalysisHistory(prev => [{
          timestamp: new Date().toISOString(),
          symbol: symbol.split(':')[1],
          decision: result.decision!,
          agentName: selectedAgent.name,
        }, ...prev.slice(0, 9)]);

        return { decision: result.decision, marketData };
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({ 
        title: 'Analysis Failed', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedAgent, symbol, agentBalance, toast]);

  // Track last trade time for cooldown
  const lastTradeTime = useRef<number>(0);
  const TRADE_COOLDOWN = 30000; // 30 seconds

  // Autonomous trading loop using backend edge function
  useEffect(() => {
    if (!isAutoTrading || !selectedAgent || agentBalance <= 0) return;

    let intervalId: ReturnType<typeof setInterval> | undefined;

    const runAutonomousTrade = async () => {
      // Check cooldown
      const now = Date.now();
      if (now - lastTradeTime.current < TRADE_COOLDOWN) return;
      lastTradeTime.current = now;

      try {
        setIsAnalyzing(true);
        
        // Get CoinGecko ID for the symbol
        const coinId = getCoinGeckoId(symbol);
        
        // Call the edge function
        const { data, error } = await supabase.functions.invoke('execute-agent-trade', {
          body: {
            agentId: selectedAgent.id,
            symbol: coinId,
          },
        });

        if (error) {
          console.error('Autonomous trade error:', error);
          toast({ 
            title: 'Trade Error', 
            description: error.message,
            variant: 'destructive' 
          });
          return;
        }

        if (data.success) {
          const { decision: tradeDecision, trade } = data;
          setDecision(tradeDecision);
          
          if (trade.executed) {
            // Update local balance
            setAgentBalance(trade.newBalance);
            
            // Add to trades list
            const newTrade: Trade = {
              id: crypto.randomUUID(),
              action: tradeDecision.action,
              symbol: trade.symbol,
              amount: trade.previousBalance * (tradeDecision.suggestedAmount / 100),
              price: trade.marketPrice,
              timestamp: new Date().toISOString(),
              pnl: trade.pnl,
            };
            setTrades(prev => [newTrade, ...prev]);

            // Show notification
            const pnlText = trade.pnl >= 0 ? `+${trade.pnl.toFixed(2)}` : trade.pnl.toFixed(2);
            toast({
              title: `${tradeDecision.action} Executed!`,
              description: `${selectedAgent.avatar} ${selectedAgent.name}: ${pnlText} USDC (${tradeDecision.confidence}% confidence)`,
            });
          }

          // Add to analysis history
          setAnalysisHistory(prev => [{
            timestamp: new Date().toISOString(),
            symbol: trade.symbol,
            decision: tradeDecision,
            agentName: selectedAgent.name,
          }, ...prev.slice(0, 9)]);
        }
      } catch (err) {
        console.error('Autonomous trade exception:', err);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // Initial trade
    runAutonomousTrade();

    // Run every 30 seconds
    intervalId = setInterval(runAutonomousTrade, TRADE_COOLDOWN);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoTrading, selectedAgent?.id, agentBalance, symbol, toast]);

  const handleFundAgent = (amount: number) => {
    setAgentBalance(prev => prev + amount);
  };

  const handleTradeComplete = (txHash: string, success: boolean) => {
    if (success && decision) {
      const tradeAmount = (agentBalance * decision.suggestedAmount) / 100;
      const trade: Trade = {
        id: crypto.randomUUID(),
        action: decision.action as 'BUY' | 'SELL',
        symbol: symbol.split(':')[1],
        amount: tradeAmount,
        price: 0,
        timestamp: new Date().toISOString(),
        txHash,
      };
      setTrades(prev => [trade, ...prev]);
      
      toast({
        title: 'Trade Executed On-Chain!',
        description: `${selectedAgent?.avatar} ${selectedAgent?.name} ${decision.action === 'BUY' ? 'bought' : 'sold'} ${tradeAmount.toFixed(2)} USDC`,
      });
    }
  };

  const toggleAutoTrading = () => {
    if (!isAutoTrading && agentBalance <= 0) {
      toast({ 
        title: 'Fund Your Agent First', 
        description: 'Add USDC to your agent\'s balance before starting autonomous trading',
        variant: 'destructive' 
      });
      setShowFundModal(true);
      return;
    }
    setIsAutoTrading(!isAutoTrading);
    if (!isAutoTrading) {
      toast({ 
        title: 'Autonomous Trading Started', 
        description: `${selectedAgent?.avatar} ${selectedAgent?.name} will now analyze and trade automatically` 
      });
    }
  };

  // Format wallet balance
  const formattedWalletBalance = walletUSDCBalance 
    ? formatUSDC(walletUSDCBalance as bigint)
    : '0.00';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-display font-bold">AUTONOMOUS TRADING</h1>
            </div>
            <p className="text-muted-foreground">
              Fund your agent with USDC and let AI trade autonomously
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <SymbolSelector value={symbol} onValueChange={setSymbol} />
            <IntervalSelector value={chartInterval} onValueChange={setChartInterval} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Chart + Latest AI Decision + News */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart */}
            <Card className="overflow-hidden">
              <div className="h-[400px]">
                <TradingViewChart
                  symbol={symbol}
                  interval={chartInterval}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                  height={400}
                  autosize={false}
                />
              </div>
            </Card>

            {/* Latest AI Decision Card - Below Chart */}
            <LatestDecisionCard
              decision={decision}
              agentName={selectedAgent?.name}
              timestamp={analysisHistory[0]?.timestamp}
            />

            {/* Crypto News Headlines - Below Decision */}
            <CryptoNewsCard />
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Wallet USDC Balance */}
            {isConnected && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-primary" />
                      <span className="text-sm text-muted-foreground">Wallet USDC</span>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-mono font-bold">{formattedWalletBalance}</p>
                      <p className="text-xs text-muted-foreground">USDC</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Agent Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Select Trading Agent
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAgents ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : agents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No agents created yet. Create one to start trading!
                  </p>
                ) : (
                  <Select value={selectedAgentId || ''} onValueChange={setSelectedAgentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <span className="flex items-center gap-2">
                            <span>{agent.avatar}</span>
                            <span>{agent.name}</span>
                            <Badge variant="outline" className="text-xs capitalize ml-2">
                              {agent.personality}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedAgent && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedAgent.avatar}</span>
                      <div>
                        <p className="font-medium">{selectedAgent.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{selectedAgent.personality}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-1 text-center">
                      <div>
                        <div className="text-xs text-muted-foreground">AGR</div>
                        <div className="text-sm font-mono">{Math.round(Number(selectedAgent.dna_aggression) * 100)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">RSK</div>
                        <div className="text-sm font-mono">{Math.round(Number(selectedAgent.dna_risk_tolerance) * 100)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">PTN</div>
                        <div className="text-sm font-mono">{Math.round(Number(selectedAgent.dna_pattern_recognition) * 100)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">TMG</div>
                        <div className="text-sm font-mono">{Math.round(Number(selectedAgent.dna_timing_sensitivity) * 100)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">CTR</div>
                        <div className="text-sm font-mono">{Math.round(Number(selectedAgent.dna_contrarian_bias) * 100)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  <Button
                    onClick={() => setShowFundModal(true)}
                    disabled={!selectedAgent}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Fund Agent
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleAnalyze()}
                      disabled={!selectedAgent || isAnalyzing || isAutoTrading}
                      variant="outline"
                      className="gap-2"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4" />
                      )}
                      Analyze
                    </Button>

                    <Button
                      onClick={toggleAutoTrading}
                      disabled={!selectedAgent}
                      className={`gap-2 ${isAutoTrading ? 'bg-destructive hover:bg-destructive/90' : 'bg-gradient-to-r from-primary to-secondary'}`}
                    >
                      {isAutoTrading ? (
                        <>
                          <Square className="w-4 h-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          Auto Trade
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Auto Trading Status */}
                {isAutoTrading && (
                  <div className="mt-3 p-2 rounded-lg bg-accent/10 border border-accent/30 text-center">
                    <div className="flex items-center justify-center gap-2 text-accent text-sm">
                      <Activity className="w-4 h-4 animate-pulse" />
                      <span>Autonomous trading active</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Analyzing every 30 seconds
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agent Portfolio */}
            {selectedAgent && (
              <AgentPortfolio
                agent={{ ...selectedAgent, balance: agentBalance }}
                trades={trades}
                isTrading={isAutoTrading}
              />
            )}

            {/* Execute Trade Button (when decision exists) */}
            {decision && decision.action !== 'HOLD' && (
              <Button
                onClick={() => setShowExecuteModal(true)}
                disabled={agentBalance <= 0}
                className={`w-full gap-2 ${
                  decision.action === 'BUY' 
                    ? 'bg-gradient-to-r from-accent to-accent/80' 
                    : 'bg-gradient-to-r from-destructive to-destructive/80'
                }`}
              >
                <Zap className="w-4 h-4" />
                Execute {decision.action} on DEX
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}

            {/* No Balance Warning */}
            {selectedAgent && agentBalance <= 0 && !decision && (
              <Card className="border-warning/30 bg-warning/5">
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-warning">Fund Your Agent</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add USDC to your agent's balance to enable autonomous trading. The agent will analyze real market data and execute trades.
                      </p>
                      <Button 
                        onClick={() => setShowFundModal(true)} 
                        size="sm" 
                        className="mt-3 gap-2"
                      >
                        <Wallet className="w-4 h-4" />
                        Fund Agent Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Fund Agent Modal */}
      <FundAgentModal
        open={showFundModal}
        onOpenChange={setShowFundModal}
        agent={selectedAgent ? { ...selectedAgent, balance: agentBalance } : null}
        onFunded={handleFundAgent}
      />

      {/* Execute Trade Modal */}
      <ExecuteTradeModal
        open={showExecuteModal}
        onOpenChange={setShowExecuteModal}
        decision={decision}
        agent={selectedAgent ? { ...selectedAgent, balance: agentBalance } : null}
        symbol={symbol}
        onTradeComplete={handleTradeComplete}
      />
    </Layout>
  );
};

export default Trading;
