import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { TradingViewChart, SymbolSelector, IntervalSelector } from '@/components/trading';
import { FundAgentModal } from '@/components/trading/FundAgentModal';
import { AgentPortfolio } from '@/components/trading/AgentPortfolio';
import { ExecuteTradeModal } from '@/components/trading/ExecuteTradeModal';
import { LatestDecisionCard } from '@/components/trading/LatestDecisionCard';
import { NewsTicker } from '@/components/trading/NewsTicker';
import { WithdrawModal } from '@/components/trading/WithdrawModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Brain, TrendingUp, TrendingDown, Loader2, Zap, Clock, Activity, Wallet, Play, Square, AlertCircle, DollarSign, ArrowDown } from 'lucide-react';
import { useAccount, useReadContract } from 'wagmi';
import { agentService } from '@/lib/api';
import { getAITradingAnalysis, fetchMarketData, getCoinGeckoId, type TradingDecision, type AgentDNA } from '@/lib/trading-service';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/theme/ThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { USDC_CONFIG, ERC20_ABI, formatUSDC } from '@/lib/usdc-config';
import { parseError, formatErrorForDisplay } from '@/lib/errors';

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
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
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
      const appError = parseError(error);
      const { title, description } = formatErrorForDisplay(appError);
      toast({ title, description, variant: 'destructive' });
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // Update balance when agent changes - use real database balance
  useEffect(() => {
    if (selectedAgent) {
      setAgentBalance(Number(selectedAgent.balance) || 0);
    }
  }, [selectedAgent]);

  // Refresh agent data periodically to get updated balance
  useEffect(() => {
    if (!selectedAgentId) return;
    
    const refreshAgent = async () => {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('*')
          .eq('id', selectedAgentId)
          .single();
        
        if (!error && data) {
          setAgentBalance(Number(data.balance) || 0);
          setAgents(prev => prev.map(a => a.id === data.id ? data : a));
        }
      } catch (err) {
        // Silent refresh failure
      }
    };

    const interval = setInterval(refreshAgent, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [selectedAgentId]);

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
        throw new Error('Unable to fetch market data. Please try again.');
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
      const appError = parseError(error);
      const { title, description } = formatErrorForDisplay(appError);
      toast({ title, description, variant: 'destructive' });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedAgent, symbol, agentBalance, toast]);

  // Track last trade time for cooldown
  const lastTradeTime = useRef<number>(0);
  const TRADE_COOLDOWN = 30000; // 30 seconds

  // Autonomous trading loop - FULLY AUTOMATIC
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
        
        const coinId = getCoinGeckoId(symbol);
        
        // Call the edge function - AUTOMATIC execution
        const { data, error } = await supabase.functions.invoke('execute-agent-trade', {
          body: {
            agentId: selectedAgent.id,
            symbol: coinId,
          },
        });

        if (error) {
          const appError = parseError(error);
          toast({ 
            title: 'Trade Error', 
            description: appError.message,
            variant: 'destructive' 
          });
          return;
        }

        if (data.success) {
          const { decision: tradeDecision, trade } = data;
          setDecision(tradeDecision);
          
          if (trade.executed) {
            // Update local balance from server response
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

    // Run every 30 seconds automatically
    intervalId = setInterval(runAutonomousTrade, TRADE_COOLDOWN);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAutoTrading, selectedAgent?.id, agentBalance, symbol, toast]);

  const handleFundAgent = async (amount: number) => {
    if (!selectedAgent) return;
    
    // Update database
    const newBalance = agentBalance + amount;
    try {
      const { error } = await supabase
        .from('agents')
        .update({ balance: newBalance })
        .eq('id', selectedAgent.id);
      
      if (error) throw error;
      setAgentBalance(newBalance);
    } catch (err) {
      toast({
        title: 'Fund Failed',
        description: 'Unable to update agent balance',
        variant: 'destructive',
      });
    }
  };

  const handleWithdraw = (amount: number) => {
    setAgentBalance(prev => Math.max(0, prev - amount));
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
        description: `${selectedAgent?.avatar} ${selectedAgent?.name} will now trade automatically every 30 seconds` 
      });
    }
  };

  // Format wallet balance
  const formattedWalletBalance = walletUSDCBalance 
    ? formatUSDC(walletUSDCBalance as bigint)
    : '0.00';

  return (
    <Layout>
      <div className="min-h-screen">
        {/* Header */}
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                  <Activity className="w-6 h-6 md:w-8 md:h-8 text-primary" />
                  <h1 className="text-xl md:text-3xl lg:text-4xl font-display font-bold">AUTONOMOUS TRADING</h1>
                </div>
                <p className="text-sm md:text-base text-muted-foreground">
                  Fund your agent with USDC and let AI trade autonomously
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <SymbolSelector value={symbol} onValueChange={setSymbol} />
                <IntervalSelector value={chartInterval} onValueChange={setChartInterval} />
              </div>
            </div>
          </div>
        </div>

        {/* News Ticker */}
        <NewsTicker />

        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Left Column: Chart + Latest AI Decision */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Chart */}
              <Card className="overflow-hidden">
                <div className="h-[300px] md:h-[400px]">
                  <TradingViewChart
                    symbol={symbol}
                    interval={chartInterval}
                    theme={theme === 'dark' ? 'dark' : 'light'}
                    height={400}
                    autosize={true}
                  />
                </div>
              </Card>

              {/* Latest AI Decision Card - Below Chart */}
              <LatestDecisionCard
                decision={decision}
                agentName={selectedAgent?.name}
                timestamp={analysisHistory[0]?.timestamp}
              />
            </div>

            {/* Right Panel */}
            <div className="space-y-4 md:space-y-6">
              {/* Wallet USDC Balance */}
              {isConnected && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
                  <CardContent className="py-3 md:py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                        <span className="text-xs md:text-sm text-muted-foreground">Wallet USDC</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg md:text-xl font-mono font-bold">{formattedWalletBalance}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">USDC</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Agent Selector */}
              <Card>
                <CardHeader className="pb-2 md:pb-3">
                  <CardTitle className="text-xs md:text-sm flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Select Trading Agent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  {isLoadingAgents ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : agents.length === 0 ? (
                    <p className="text-xs md:text-sm text-muted-foreground text-center py-4">
                      No agents created yet. Create one to start trading!
                    </p>
                  ) : (
                    <Select value={selectedAgentId || ''} onValueChange={setSelectedAgentId}>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Choose an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            <span className="flex items-center gap-2">
                              <span>{agent.avatar}</span>
                              <span className="truncate">{agent.name}</span>
                              <Badge variant="outline" className="text-[10px] capitalize ml-1">
                                {agent.personality}
                              </Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedAgent && (
                    <div className="p-2 md:p-3 rounded-lg bg-muted/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl md:text-2xl">{selectedAgent.avatar}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm md:text-base truncate">{selectedAgent.name}</p>
                          <p className="text-[10px] md:text-xs text-muted-foreground capitalize">{selectedAgent.personality}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-center">
                        {[
                          { label: 'AGR', value: selectedAgent.dna_aggression },
                          { label: 'RSK', value: selectedAgent.dna_risk_tolerance },
                          { label: 'PTN', value: selectedAgent.dna_pattern_recognition },
                          { label: 'TMG', value: selectedAgent.dna_timing_sensitivity },
                          { label: 'CTR', value: selectedAgent.dna_contrarian_bias },
                        ].map(stat => (
                          <div key={stat.label}>
                            <div className="text-[9px] md:text-xs text-muted-foreground">{stat.label}</div>
                            <div className="text-xs md:text-sm font-mono">{Math.round(Number(stat.value) * 100)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => setShowFundModal(true)}
                        disabled={!selectedAgent}
                        variant="outline"
                        className="gap-1 md:gap-2 text-xs md:text-sm"
                        size="sm"
                      >
                        <Wallet className="w-3 h-3 md:w-4 md:h-4" />
                        Fund Agent
                      </Button>
                      <Button
                        onClick={() => setShowWithdrawModal(true)}
                        disabled={!selectedAgent || agentBalance <= 0}
                        variant="outline"
                        className="gap-1 md:gap-2 text-xs md:text-sm"
                        size="sm"
                      >
                        <ArrowDown className="w-3 h-3 md:w-4 md:h-4" />
                        Withdraw
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleAnalyze()}
                        disabled={!selectedAgent || isAnalyzing || isAutoTrading}
                        variant="outline"
                        className="gap-1 md:gap-2 text-xs md:text-sm"
                        size="sm"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                        ) : (
                          <Brain className="w-3 h-3 md:w-4 md:h-4" />
                        )}
                        Analyze
                      </Button>

                      <Button
                        onClick={toggleAutoTrading}
                        disabled={!selectedAgent}
                        className={`gap-1 md:gap-2 text-xs md:text-sm ${isAutoTrading ? 'bg-destructive hover:bg-destructive/90' : 'bg-gradient-to-r from-primary to-secondary'}`}
                        size="sm"
                      >
                        {isAutoTrading ? (
                          <>
                            <Square className="w-3 h-3 md:w-4 md:h-4" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 md:w-4 md:h-4" />
                            Auto Trade
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Auto Trading Status */}
                  {isAutoTrading && (
                    <div className="p-2 rounded-lg bg-accent/10 border border-accent/30 text-center">
                      <div className="flex items-center justify-center gap-2 text-accent text-xs md:text-sm">
                        <Activity className="w-3 h-3 md:w-4 md:h-4 animate-pulse" />
                        <span>Auto trading active</span>
                      </div>
                      <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                        Executing every 30 seconds
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

              {/* No Balance Warning */}
              {selectedAgent && agentBalance <= 0 && !decision && (
                <Card className="border-warning/30 bg-warning/5">
                  <CardContent className="py-3 md:py-4">
                    <div className="flex items-start gap-2 md:gap-3">
                      <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-warning flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-warning text-sm md:text-base">Fund Your Agent</p>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">
                          Add USDC to your agent's vault to enable autonomous trading.
                        </p>
                        <Button 
                          onClick={() => setShowFundModal(true)} 
                          size="sm" 
                          className="mt-2 md:mt-3 gap-1 md:gap-2 text-xs md:text-sm"
                        >
                          <Wallet className="w-3 h-3 md:w-4 md:h-4" />
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
      </div>

      {/* Fund Agent Modal */}
      <FundAgentModal
        open={showFundModal}
        onOpenChange={setShowFundModal}
        agent={selectedAgent ? { ...selectedAgent, balance: agentBalance } : null}
        onFunded={handleFundAgent}
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        open={showWithdrawModal}
        onOpenChange={setShowWithdrawModal}
        agent={selectedAgent ? { ...selectedAgent, balance: agentBalance } : null}
        onWithdrawn={handleWithdraw}
      />

      {/* Execute Trade Modal - kept for manual execution */}
      <ExecuteTradeModal
        open={showExecuteModal}
        onOpenChange={setShowExecuteModal}
        decision={decision}
        agent={selectedAgent ? { ...selectedAgent, balance: agentBalance } : null}
        symbol={symbol}
        onTradeComplete={() => {}}
      />
    </Layout>
  );
};

export default Trading;
