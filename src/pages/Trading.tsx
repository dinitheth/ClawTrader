import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { TradingViewChart, SymbolSelector, IntervalSelector } from '@/components/trading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Brain, TrendingUp, TrendingDown, Loader2, Zap, AlertTriangle, CheckCircle2, Clock, Activity } from 'lucide-react';
import { useAccount } from 'wagmi';
import { agentService } from '@/lib/api';
import { getAITradingAnalysis, fetchMarketData, getCoinGeckoId, type TradingDecision, type AgentDNA } from '@/lib/trading-service';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/components/theme/ThemeProvider';

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
  const [decision, setDecision] = useState<TradingDecision | null>(null);
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

  const handleAnalyze = async () => {
    if (!selectedAgent) {
      toast({ title: 'Select an Agent', description: 'Choose an agent to analyze the market', variant: 'destructive' });
      return;
    }

    setIsAnalyzing(true);
    setDecision(null);

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
        Number(selectedAgent.balance) || 1000
      );

      if (result.success && result.decision) {
        setDecision(result.decision);
        setAnalysisHistory(prev => [{
          timestamp: new Date().toISOString(),
          symbol: symbol.split(':')[1],
          decision: result.decision!,
          agentName: selectedAgent.name,
        }, ...prev.slice(0, 9)]);
        
        toast({ 
          title: `${selectedAgent.avatar} ${selectedAgent.name} Analyzed`, 
          description: `Decision: ${result.decision.action} with ${result.decision.confidence}% confidence` 
        });
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
    } finally {
      setIsAnalyzing(false);
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
              <h1 className="text-3xl md:text-4xl font-display font-bold">TRADING</h1>
            </div>
            <p className="text-muted-foreground">
              Real-time charts with AI-powered analysis from your agents
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
                  Select Agent
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

                <Button
                  onClick={handleAnalyze}
                  disabled={!selectedAgent || isAnalyzing}
                  className="w-full mt-4 gap-2 bg-gradient-to-r from-primary to-secondary"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" />
                      Analyze Market
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* AI Decision */}
            {decision && (
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    AI Decision
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
                      <p>{decision.reasoning}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-1">Technical Analysis</p>
                      <p className="text-xs">{decision.technicalAnalysis}</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground mb-1">Risk Assessment</p>
                      <p className="text-xs">{decision.riskAssessment}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div className="text-center p-2 rounded bg-muted/30">
                        <p className="text-xs text-muted-foreground">Size</p>
                        <p className="font-mono">{decision.suggestedAmount}%</p>
                      </div>
                      {decision.stopLoss && (
                        <div className="text-center p-2 rounded bg-destructive/10">
                          <p className="text-xs text-destructive">Stop Loss</p>
                          <p className="font-mono">${decision.stopLoss.toLocaleString()}</p>
                        </div>
                      )}
                      {decision.takeProfit && (
                        <div className="text-center p-2 rounded bg-accent/10">
                          <p className="text-xs text-accent">Take Profit</p>
                          <p className="font-mono">${decision.takeProfit.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {decision.action !== 'HOLD' && (
                    <Button className="w-full gap-2" variant={decision.action === 'BUY' ? 'default' : 'destructive'}>
                      <Zap className="w-4 h-4" />
                      Execute {decision.action} on Monad DEX
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Analysis History */}
            {analysisHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Recent Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {analysisHistory.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${getActionColor(item.decision.action)}`}>
                            {item.decision.action}
                          </Badge>
                          <span className="text-muted-foreground">{item.symbol}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Trading;
