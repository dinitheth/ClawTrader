import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { TradingViewChart, SymbolSelector, IntervalSelector } from '@/components/trading';
import { FundAgentModal } from '@/components/trading/FundAgentModal';
// AgentPortfolio removed - balance now shown in agent card
import { ExecuteTradeModal } from '@/components/trading/ExecuteTradeModal';
import { LatestDecisionCard } from '@/components/trading/LatestDecisionCard';
import { RecentTrades } from '@/components/trading/RecentTrades';
import { NewsTicker } from '@/components/trading/NewsTicker';
import { WithdrawModal } from '@/components/trading/WithdrawModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Brain, TrendingUp, TrendingDown, Loader2, Zap, Clock, Activity, Wallet, Play, Square, AlertCircle, DollarSign, ArrowDown, Trash2 } from 'lucide-react';
import { useAccount, useReadContract } from 'wagmi';
import { agentService } from '@/lib/api';
import { getAITradingAnalysis, fetchMarketData, getCoinGeckoId, type TradingDecision, type AgentDNA } from '@/lib/trading-service';
import { useToast } from '@/hooks/use-toast';
import { useAgentVaultBalance } from '@/hooks/useAgentVaultBalance';
import { useTheme } from '@/components/theme/ThemeProvider';
import { supabase } from '@/integrations/supabase/client';
import { CONTRACTS, USDC_ABI, formatUSDC, isContractConfigured } from '@/lib/contracts';
import { parseError, formatErrorForDisplay } from '@/lib/errors';
import { useSimpleDEX, type TokenSymbol } from '@/hooks/useSimpleDEX';
import { fetchPrices, getTokensWithPrices } from '@/lib/priceService';
import { loadTradesFromLocalStorage, saveTradeToLocalStorage, getExplorerTxUrl, type ParsedTrade } from '@/lib/etherscan';

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
  // Auto-trading state - restore from localStorage for persistence across refresh
  const [isAutoTrading, setIsAutoTrading] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autoTrading');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if the saved agentId matches the current one
        return parsed.isActive && parsed.agentId === searchParams.get('agent');
      }
    }
    return false;
  });
  const [decision, setDecision] = useState<TradingDecision | null>(null);
  const [showFundModal, setShowFundModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showClearTradesDialog, setShowClearTradesDialog] = useState(false);
  const [agentBalance, setAgentBalance] = useState(0);
  const [trades, setTrades] = useState<Trade[]>(() => {
    // Load persisted trades from localStorage on initial render
    if (typeof window !== 'undefined') {
      const agentId = new URLSearchParams(window.location.search).get('agent');
      const savedTrades = localStorage.getItem(`trades_${agentId}`);
      if (savedTrades) {
        try {
          return JSON.parse(savedTrades);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [analysisHistory, setAnalysisHistory] = useState<Array<{
    timestamp: string;
    symbol: string;
    decision: TradingDecision;
    agentName: string;
  }>>([]);

  // Read wallet USDC balance
  const isUSDCConfigured = isContractConfigured('USDC');
  const { data: walletUSDCBalance } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: USDC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isUSDCConfigured,
    },
  });

  // Read agent balance from on-chain vault
  const {
    balance: onChainBalance,
    isContractReady: isVaultReady,
    refetch: refetchVaultBalance
  } = useAgentVaultBalance({
    agentId: selectedAgentId,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // SimpleDEX for on-chain trading
  const { executeTrade: executeOnChainTrade, isLoading: isTradeLoading, pendingTxHash } = useSimpleDEX();

  // Map symbol to token for DEX trades
  const getTokenFromSymbol = (sym: string): TokenSymbol | null => {
    if (sym.includes('BTC')) return 'tBTC';
    if (sym.includes('ETH')) return 'tETH';
    if (sym.includes('SOL')) return 'tSOL';
    return null;
  };

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

  // Update balance: ONLY use on-chain balance from AgentVault contract
  useEffect(() => {
    if (isVaultReady) {
      // Always use on-chain balance from AgentVault contract
      setAgentBalance(onChainBalance);
    } else {
      // Contract not ready yet - show 0
      setAgentBalance(0);
    }
  }, [onChainBalance, isVaultReady]);

  // Save trades to localStorage whenever they change
  useEffect(() => {
    if (selectedAgentId && trades.length > 0) {
      localStorage.setItem(`trades_${selectedAgentId}`, JSON.stringify(trades.slice(0, 50)));
    }
  }, [trades, selectedAgentId]);

  // Load trades when agent changes
  useEffect(() => {
    if (selectedAgentId) {
      const savedTrades = localStorage.getItem(`trades_${selectedAgentId}`);
      if (savedTrades) {
        try {
          setTrades(JSON.parse(savedTrades));
        } catch {
          setTrades([]);
        }
      } else {
        setTrades([]);
      }
    }
  }, [selectedAgentId]);

  // Calculate PnL from trade history
  // Note: trade.amount = USDC value traded, trade.price = token price
  const pnlData = useMemo(() => {
    let realizedPnL = 0;
    // Track token holdings: { tokenSymbol: { tokenAmount, usdcCost } }
    const costBasis: { [symbol: string]: { tokenAmount: number; usdcCost: number } } = {};
    // Per-trade PnL: { tradeId: pnlValue }
    const tradePnLMap: { [tradeId: string]: number } = {};

    // Sort trades by timestamp (oldest first)
    const sortedTrades = [...trades].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const trade of sortedTrades) {
      const tokenSymbol = trade.symbol.replace('BINANCE:', '').replace('USDT', '').replace('/USDC', '');

      if (!costBasis[tokenSymbol]) {
        costBasis[tokenSymbol] = { tokenAmount: 0, usdcCost: 0 };
      }

      // trade.amount = USDC spent/received
      // trade.price = token price at time of trade
      const usdcValue = trade.amount || 0;
      const tokenQty = trade.price > 0 ? usdcValue / trade.price : 0;

      if (trade.action === 'BUY') {
        // Add to holdings
        costBasis[tokenSymbol].tokenAmount += tokenQty;
        costBasis[tokenSymbol].usdcCost += usdcValue;
        // BUY trades have 0 PnL (not realized yet)
        tradePnLMap[trade.id] = 0;
      } else if (trade.action === 'SELL') {
        // Calculate realized PnL
        const holding = costBasis[tokenSymbol];

        // Only calculate PnL if we have cost basis
        if (holding.tokenAmount > 0 && holding.usdcCost > 0) {
          // Cap tokens sold to what we actually hold
          const tokensToSell = Math.min(tokenQty, holding.tokenAmount);
          // Avg cost per token
          const avgCostPerToken = holding.usdcCost / holding.tokenAmount;
          // Cost of tokens sold at avg cost
          const costOfSold = tokensToSell * avgCostPerToken;
          // Actual USDC received for these tokens (proportional)
          const actualProceeds = tokensToSell === tokenQty
            ? usdcValue
            : (tokensToSell / tokenQty) * usdcValue;
          // PnL = proceeds - cost
          const tradePnL = actualProceeds - costOfSold;
          realizedPnL += tradePnL;
          tradePnLMap[trade.id] = tradePnL;

          // Reduce holdings proportionally
          const ratio = tokensToSell / holding.tokenAmount;
          holding.usdcCost -= holding.usdcCost * ratio;
          holding.tokenAmount -= tokensToSell;
        } else {
          // No cost basis = can't calculate PnL accurately
          tradePnLMap[trade.id] = 0;
        }
      }
    }

    const totalTrades = trades.length;
    const buyTrades = trades.filter(t => t.action === 'BUY').length;
    const sellTrades = trades.filter(t => t.action === 'SELL').length;

    return {
      realizedPnL,
      totalTrades,
      buyTrades,
      sellTrades,
      positions: costBasis,
      tradePnLMap // Per-trade PnL lookup
    };
  }, [trades]);

  // Restore auto-trading from localStorage when agent and balance are ready
  useEffect(() => {
    if (!selectedAgentId || agentBalance <= 0) return;

    const saved = localStorage.getItem('autoTrading');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.isActive && parsed.agentId === selectedAgentId) {
          setIsAutoTrading(true);
          toast({
            title: 'Auto Trading Resumed',
            description: 'Continuing autonomous trading from previous session'
          });
        }
      } catch (e) {
        localStorage.removeItem('autoTrading');
      }
    }
  }, [selectedAgentId, agentBalance > 0]); // Only run when agent selected and has balance

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
        const tokenSymbol = getTokenFromSymbol(symbol);

        // Call LOCAL smart trading server for AI decision + execution
        // This handles: market data, position tracking, smart decisions, and on-chain trades
        const response = await fetch('http://localhost:3001/api/smart-trade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: coinId,
            agentId: selectedAgent.id,
            userAddress: address,
            agentDNA: {
              aggression: selectedAgent.dna_aggression * 100,
              riskTolerance: selectedAgent.dna_risk_tolerance * 100,
              patternRecognition: selectedAgent.dna_pattern_recognition * 100,
              contrarianBias: selectedAgent.dna_contrarian_bias * 100,
              timingSensitivity: selectedAgent.dna_timing_sensitivity * 100,
            },
          }),
        });

        const data = await response.json();

        if (!data.success) {
          toast({
            title: 'Trade Error',
            description: data.error || 'Smart trade failed',
            variant: 'destructive'
          });
          return;
        }

        const { decision: tradeDecision, trade, positions } = data;
        setDecision(tradeDecision);

        const txHash = trade?.txHash || null;
        const onChain = trade?.executed || false;

        // Always refresh on-chain balance after any trade action
        // Add slight delay to allow blockchain state to update
        setTimeout(() => {
          refetchVaultBalance();
        }, 2000);

        // Add to trades list
        // Use actual trade amount from server if available, else calculate estimate
        const currentPrice = data.marketData?.currentPrice || 0;
        const tokensTraded = trade?.tokensTraded || 0;
        const actualUsdcAmount = tokensTraded > 0 && currentPrice > 0
          ? tokensTraded * currentPrice  // Actual trade value
          : positions?.usdcBalance * (tradeDecision.suggestedAmount / 100) || 0;  // Fallback estimate

        const newTrade: Trade = {
          id: crypto.randomUUID(),
          action: tradeDecision.action,
          symbol: tokenSymbol || data.marketData?.symbol || coinId,
          amount: actualUsdcAmount,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          pnl: 0,
          txHash: txHash || undefined,
        };

        if (tradeDecision.action !== 'HOLD') {
          setTrades(prev => [newTrade, ...prev]);
        }

        // Show notification
        const actionEmoji = tradeDecision.action === 'BUY' ? '🛒' : tradeDecision.action === 'SELL' ? '💱' : '⏸️';
        const onChainText = onChain ? '🔗 ON-CHAIN' : '';
        toast({
          title: `${actionEmoji} ${tradeDecision.action} ${onChainText}`,
          description: txHash
            ? `Tx: ${txHash.slice(0, 10)}... | ${tradeDecision.reasoning.slice(0, 50)}...`
            : `${selectedAgent.name}: ${tradeDecision.reasoning.slice(0, 60)}...`,
        });

        // Add to analysis history
        setAnalysisHistory(prev => [{
          timestamp: new Date().toISOString(),
          symbol: tokenSymbol || data.marketData?.symbol || coinId,
          decision: tradeDecision,
          agentName: selectedAgent.name,
        }, ...prev.slice(0, 9)]);
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

    const newState = !isAutoTrading;
    setIsAutoTrading(newState);

    // Persist to localStorage for page refresh survival
    if (newState && selectedAgent) {
      localStorage.setItem('autoTrading', JSON.stringify({
        isActive: true,
        agentId: selectedAgent.id
      }));
    } else {
      localStorage.removeItem('autoTrading');
    }

    if (newState) {
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
            {/* Left Column: Chart + Recent Trades */}
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

              {/* Recent Trades - Below Chart */}
              <RecentTrades trades={trades} tradePnLMap={pnlData.tradePnLMap} />
            </div>

            {/* Right Panel */}
            <div className="space-y-4 md:space-y-6">

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

                      {/* On-Chain Balance - Moved here from Agent Portfolio */}
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">On-Chain Balance</span>
                          <div className="text-right">
                            <span className="text-lg font-mono font-bold text-primary">
                              {agentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">USDC</span>
                          </div>
                        </div>
                      </div>

                      {/* Realized PnL */}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Realized PnL</span>
                        <div className="text-right">
                          <span
                            className="text-lg font-mono font-bold"
                            style={{ color: pnlData.realizedPnL >= 0 ? '#16c784' : '#ea3943' }}
                          >
                            {pnlData.realizedPnL >= 0 ? '+' : ''}{pnlData.realizedPnL.toFixed(2)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">USDC</span>
                        </div>
                      </div>

                      {/* Trade Stats */}
                      {pnlData.totalTrades > 0 && (
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>Trades: {pnlData.totalTrades}</span>
                          <span className="flex gap-2 items-center">
                            <span style={{ color: '#16c784' }}>↑{pnlData.buyTrades}</span>
                            <span style={{ color: '#ea3943' }}>↓{pnlData.sellTrades}</span>
                            <button
                              onClick={() => setShowClearTradesDialog(true)}
                              className="ml-2 p-1 rounded hover:bg-muted/30 text-muted-foreground hover:text-destructive transition-colors"
                              title="Clear trade history"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        </div>
                      )}
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

              {/* Agent Portfolio card removed - balance now shown in agent selector */}

              {/* Latest AI Decision - Under Agent Box */}
              <LatestDecisionCard
                decision={decision}
                agentName={selectedAgent?.name}
                timestamp={analysisHistory[0]?.timestamp}
              />

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
        onTradeComplete={() => { }}
      />

      {/* Clear Trade History Confirmation Dialog */}
      <AlertDialog open={showClearTradesDialog} onOpenChange={setShowClearTradesDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Clear Trade History
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all trade history for this agent.
              Your Realized PnL will reset to 0. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (selectedAgentId) {
                  localStorage.removeItem(`trades_${selectedAgentId}`);
                  setTrades([]);
                  toast({ title: '🗑️ Trade history cleared', description: 'PnL has been reset to 0' });
                }
              }}
            >
              Clear History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Trading;
