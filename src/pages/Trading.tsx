import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { TradingViewChart, SymbolSelector, IntervalSelector } from '@/components/trading';
import { FundAgentModal } from '@/components/trading/FundAgentModal';
import { AgentPortfolio } from '@/components/trading/AgentPortfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Brain, TrendingUp, TrendingDown, Loader2, Zap, Clock, Activity, Wallet, Play, Square, AlertCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { agentService } from '@/lib/api';
import { getAITradingAnalysis, fetchMarketData, getCoinGeckoId, type TradingDecision, type AgentDNA } from '@/lib/trading-service';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/theme/ThemeProvider';

interface Trade {
  id: string;
  action: 'BUY' | 'SELL';
  symbol: string;
  amount: number;
  price: number;
  timestamp: string;
  pnl?: number;
}

const Trading = () => {
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const { theme } = useTheme();

  const [symbol, setSymbol] = useState('BINANCE:BTCUSDT');
  const [interval, setInterval] = useState('15');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(searchParams.get('agent'));
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAutoTrading, setIsAutoTrading] = useState(false);
  const [decision, setDecision] = useState<TradingDecision | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [agentBalance, setAgentBalance] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<Array<{
    timestamp: string;
    symbol: string;
    decision: TradingDecision;
    agentName: string;
  }>>([]);

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

  const executeVirtualTrade = useCallback((decision: TradingDecision, currentPrice: number) => {
    if (decision.action === 'HOLD' || agentBalance <= 0) return;

    const tradeAmount = (agentBalance * decision.suggestedAmount) / 100;
    
    // Simulate trade execution
    const trade: Trade = {
      id: crypto.randomUUID(),
      action: decision.action,
      symbol: symbol.split(':')[1],
      amount: tradeAmount,
      price: currentPrice,
      timestamp: new Date().toISOString(),
      // Simulate small random P&L for demo
      pnl: decision.action === 'BUY' 
        ? tradeAmount * (Math.random() * 0.1 - 0.03) 
        : tradeAmount * (Math.random() * 0.1 - 0.03),
    };

    setTrades(prev => [trade, ...prev]);
    
    // Update virtual balance with P&L
    setAgentBalance(prev => prev + (trade.pnl || 0));

    toast({
      title: `${decision.action} Executed`,
      description: `${selectedAgent?.avatar} ${selectedAgent?.name} ${decision.action === 'BUY' ? 'bought' : 'sold'} ${tradeAmount.toFixed(4)} MON`,
    });
  }, [agentBalance, symbol, selectedAgent, toast]);

  // Autonomous trading loop
  useEffect(() => {
    if (!isAutoTrading || !selectedAgent || agentBalance <= 0) return;

    let intervalId: NodeJS.Timeout | undefined;

    const runTradingCycle = async () => {
      const result = await handleAnalyze();
      if (result && result.decision && result.decision.action !== 'HOLD') {
        executeVirtualTrade(result.decision, result.marketData.currentPrice);
      }
    };

    // Initial analysis
    runTradingCycle();

    // Run every 30 seconds
    intervalId = globalThis.setInterval(() => {
      runTradingCycle();
    }, 30000);

    return () => {
      if (intervalId) globalThis.clearInterval(intervalId);
    };
  }, [isAutoTrading, selectedAgent?.id, agentBalance, handleAnalyze, executeVirtualTrade]);

  const handleFundAgent = (amount: number) => {
    setAgentBalance(prev => prev + amount);
  };

  const toggleAutoTrading = () => {
    if (!isAutoTrading && agentBalance <= 0) {
      toast({ 
        title: 'Fund Your Agent First', 
        description: 'Add MON to your agent\'s balance before starting autonomous trading',
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

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'bg-accent/20 text-accent border-accent/50';
      case 'SELL': return 'bg-destructive/20 text-destructive border-destructive/50';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'BUY': return <TrendingUp className="w-5 h-5" />;
      case 'SELL': return <TrendingDown className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

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
              Fund your agent with testnet MON and let AI trade autonomously
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <SymbolSelector value={symbol} onValueChange={setSymbol} />
            <IntervalSelector value={interval} onValueChange={setInterval} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="h-[500px]">
                <TradingViewChart
                  symbol={symbol}
                  interval={interval}
                  theme={theme === 'dark' ? 'dark' : 'light'}
                  height={500}
                  autosize={false}
                />
              </div>
            </Card>
          </div>

          {/* AI Analysis Panel */}
          <div className="space-y-6">
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
                    Fund Agent ({agentBalance.toFixed(2)} MON)
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

            {/* AI Decision */}
            {decision && (
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    Latest AI Decision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={`text-lg px-4 py-2 ${getActionColor(decision.action)}`}>
                      {getActionIcon(decision.action)}
                      <span className="ml-2">{decision.action}</span>
                    </Badge>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{decision.confidence}%</div>
                      <div className="text-xs text-muted-foreground">Confidence</div>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Reasoning</p>
                      <p className="text-xs">{decision.reasoning}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="text-center p-2 rounded bg-muted/30">
                        <p className="text-xs text-muted-foreground">Size</p>
                        <p className="font-mono">{decision.suggestedAmount}%</p>
                      </div>
                      {decision.stopLoss && (
                        <div className="text-center p-2 rounded bg-destructive/10">
                          <p className="text-xs text-destructive">Stop Loss</p>
                          <p className="font-mono text-xs">${decision.stopLoss.toLocaleString()}</p>
                        </div>
                      )}
                      {decision.takeProfit && (
                        <div className="text-center p-2 rounded bg-accent/10">
                          <p className="text-xs text-accent">Take Profit</p>
                          <p className="font-mono text-xs">${decision.takeProfit.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                        Add testnet MON to your agent's balance to enable autonomous trading. The agent will analyze real market data and make virtual trades.
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
    </Layout>
  );
};

export default Trading;
