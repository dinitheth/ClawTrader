import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Target, Clock, Zap, Loader2, Tv, Gamepad2, Timer, ChevronRight, Eye, EyeOff, TrendingUp, Info, RefreshCw, Lock, AlertTriangle, Filter } from "lucide-react";
import { useAccount } from 'wagmi';
import { useClawSwap } from '@/hooks/useClawSwap';
import { useClawBetting } from '@/hooks/useClawBetting';
import SwapModal from '@/components/swap/SwapModal';
import { useToast } from '@/hooks/use-toast';
import {
  fetchRunningMatches,
  fetchUpcomingMatches,
  GAME_FILTERS,
  getBestStream,
  getTeamScore,
  getGameDisplayName,
  getGameColor,
  getSeriesInfo,
  type PandaMatch,
  type GameSlug,
} from '@/lib/pandaScore';
import { profileService, bettingService } from '@/lib/api';
import MatchDetailModal, { type PlacedBet } from '@/components/betting/MatchDetailModal';

// ── localStorage helpers ─────────────────────────────────────────
const BETS_STORAGE_KEY = 'clawtrader_esports_bets';

function loadBets(): PlacedBet[] {
  try {
    const saved = localStorage.getItem(BETS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveBets(bets: PlacedBet[]) {
  localStorage.setItem(BETS_STORAGE_KEY, JSON.stringify(bets.slice(0, 200)));
}

// ── Betting deadline helper ──────────────────────────────────────
// Betting closes at the match's scheduled start time
function getBettingDeadline(match: PandaMatch): Date {
  return new Date(match.scheduled_at);
}

function isBettingOpen(match: PandaMatch): boolean {
  const deadline = getBettingDeadline(match);
  return new Date() < deadline;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'CLOSED';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hrs = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (days > 0) return `${days}d ${hrs}h ${min}m`;
  if (hrs > 0) return `${hrs}h ${min}m ${sec}s`;
  return `${min}m ${sec}s`;
}

const Betting = () => {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const { clawBalance } = useClawSwap();
  const { onChainStats, refreshStats, placeBet: escrowPlaceBet, isBusy } = useClawBetting();

  // Swap modal (accessible from betting page too)
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  // Match data
  const [liveMatches, setLiveMatches] = useState<PandaMatch[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<PandaMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<GameSlug>('all');

  // Inline betting on cards
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Record<number, number>>({});
  const [betAmounts, setBetAmounts] = useState<Record<number, number>>({});

  // Detail modal
  const [detailMatch, setDetailMatch] = useState<PandaMatch | null>(null);

  // Bet tracking
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>(loadBets);



  // Hide closed matches filter
  const [hideClosed, setHideClosed] = useState(false);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Countdown timer — ticks every second to update deadline displays
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Derived bet stats ──────────────────────────────────────────
  const totalBetted = useMemo(() => placedBets.reduce((s, b) => s + b.amount, 0), [placedBets]);

  const getBetsForMatch = useCallback(
    (matchId: number) => placedBets.filter(b => b.matchId === matchId),
    [placedBets]
  );

  const getMatchPool = useCallback(
    (matchId: number) => getBetsForMatch(matchId).reduce((s, b) => s + b.amount, 0),
    [getBetsForMatch]
  );



  // ── Load matches ───────────────────────────────────────────────
  const [fetchError, setFetchError] = useState<string | null>(null);
  const loadMatches = useCallback(async (game?: GameSlug) => {
    const slug = game ?? activeGame;
    try {
      setFetchError(null);
      const [live, upcoming] = await Promise.all([
        fetchRunningMatches(slug),
        fetchUpcomingMatches(slug),
      ]);
      setLiveMatches(live);
      setUpcomingMatches(upcoming);
      setLastRefresh(new Date());
    } catch (error: any) {
      console.error('PandaScore error:', error);
      const errMsg = error?.message || 'Unknown error loading matches';
      setFetchError(errMsg);
      toast({ title: '⚠️ Match Load Failed', description: errMsg, variant: 'destructive' });
    } finally { setIsLoading(false); }
  }, [activeGame, toast]);

  useEffect(() => {
    setIsLoading(true);
    loadMatches();
    refreshTimerRef.current = setInterval(() => loadMatches(), 60_000);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [loadMatches]);

  const handleGameFilter = (slug: GameSlug) => {
    setActiveGame(slug);
    setIsLoading(true);
    loadMatches(slug);
  };

  // ── Generate odds ──────────────────────────────────────────────
  const generateOdds = (match: PandaMatch): [number, number] => {
    if (match.opponents.length < 2) return [1.5, 1.5];
    const s1 = getTeamScore(match, match.opponents[0].opponent.id);
    const s2 = getTeamScore(match, match.opponents[1].opponent.id);
    const t = s1 + s2 || 1;
    const o1 = s1 > s2 ? 1.3 + (s2 / t) : 1.5 + (s1 / t) * 0.8;
    const o2 = s2 > s1 ? 1.3 + (s1 / t) : 1.5 + (s2 / t) * 0.8;
    return [
      Math.max(1.1, Math.min(4.0, Number(o1.toFixed(2)))),
      Math.max(1.1, Math.min(4.0, Number(o2.toFixed(2)))),
    ];
  };

  // ── Place bet (shared) — uses on-chain BettingEscrow ────────────
  const [isBetting, setIsBetting] = useState(false);

  const handlePlaceBet = async (matchId: number, teamId: number, teamName: string, odds: number, amount?: number) => {
    if (!isConnected || !address) {
      toast({ title: 'Connect Wallet', description: 'Connect your wallet to place bets', variant: 'destructive' });
      return;
    }

    // Deadline check — prevent betting after match start
    const allMatches = [...liveMatches, ...upcomingMatches];
    const matchData = allMatches.find(m => m.id === matchId);
    if (matchData && !isBettingOpen(matchData)) {
      toast({ title: '🔒 Betting Closed', description: 'Betting deadline has passed for this match.', variant: 'destructive' });
      return;
    }

    const betAmt = amount ?? betAmounts[matchId] ?? 0;
    if (betAmt <= 0) {
      toast({ title: 'Enter Amount', description: 'Please enter a valid bet amount', variant: 'destructive' });
      return;
    }

    // Balance check
    if (betAmt > clawBalance) {
      toast({ title: 'Insufficient Balance', description: `You only have ${clawBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })} $CLAW`, variant: 'destructive' });
      return;
    }

    // On-chain escrow bet (approve + placeBet)
    setIsBetting(true);
    try {
      // Get both team IDs for auto-registration
      const teamAId = matchData?.opponents?.[0]?.opponent?.id ?? 0;
      const teamBId = matchData?.opponents?.[1]?.opponent?.id ?? 0;
      toast({ title: '⏳ Approving & Placing Bet...', description: 'Please confirm the transaction(s) in your wallet' });
      await escrowPlaceBet(matchId, teamAId, teamBId, teamId, betAmt);
    } catch (err: any) {
      setIsBetting(false);
      toast({ title: 'Transaction Failed', description: err.shortMessage || err.message || 'Failed to place bet on-chain', variant: 'destructive' });
      return;
    }
    setIsBetting(false);

    // Find match name (reuse allMatches from deadline check above)
    const match = allMatches.find(m => m.id === matchId);
    const matchName = match?.name || `Match #${matchId}`;

    const newBet: PlacedBet = {
      id: crypto.randomUUID(),
      matchId,
      teamId,
      teamName,
      amount: betAmt,
      odds,
      timestamp: new Date().toISOString(),
      matchName,
      status: 'active',
    };

    const updated = [newBet, ...placedBets];
    setPlacedBets(updated);
    saveBets(updated);

    // Clear inline bet input
    setBetAmounts(prev => ({ ...prev, [matchId]: 0 }));

    toast({
      title: '🎯 Bet Placed On-Chain!',
      description: `${betAmt} $CLAW on ${teamName} via BettingEscrow — locked until settlement`,
    });

    // Refresh on-chain stats after a short delay (let chain confirm)
    setTimeout(() => refreshStats(), 3000);
  };

  // ── Render Match Card ──────────────────────────────────────────
  const renderMatchCard = (match: PandaMatch, isLive: boolean) => {
    if (match.opponents.length < 2) return null;

    const team1 = match.opponents[0].opponent;
    const team2 = match.opponents[1].opponent;
    const score1 = getTeamScore(match, team1.id);
    const score2 = getTeamScore(match, team2.id);
    const [odds1, odds2] = generateOdds(match);
    const bestStream = getBestStream(match);
    const gameColor = getGameColor(match.videogame.slug);
    const isExpanded = expandedMatch === match.id;
    const matchPool = getMatchPool(match.id);
    const matchBetCount = getBetsForMatch(match.id).length;

    // Betting deadline
    const deadline = getBettingDeadline(match);
    const msLeft = deadline.getTime() - now;
    const bettingOpen = msLeft > 0;

    return (
      <Card
        key={match.id}
        className="border-border overflow-hidden transition-all duration-300 hover:border-primary/30 cursor-pointer"
        style={{ borderLeft: `3px solid ${gameColor}` }}
      >
        <CardContent className="p-0">
          {/* Match Header */}
          <div
            className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b border-border/50"
            onClick={() => setDetailMatch(match)}
          >
            <div className="flex items-center gap-2">
              {isLive ? (
                <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50 text-[10px] px-1.5 py-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />
                  LIVE
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-[10px] px-1.5 py-0">
                  <Clock className="w-2.5 h-2.5 mr-1" />
                  UPCOMING
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-none" style={{ backgroundColor: `${gameColor}20`, color: gameColor }}>
                {getGameDisplayName(match.videogame.slug)}
              </Badge>
              {isLive && (
                <span className="text-[10px] text-muted-foreground font-mono">{getSeriesInfo(match)}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{match.league.name}</span>
              {match.league.image_url && (
                <img src={match.league.image_url} alt="" className="w-4 h-4 rounded-sm object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
          </div>

          {/* Teams + Score (click opens detail modal) */}
          <div className="px-4 py-4 cursor-pointer" onClick={() => setDetailMatch(match)}>
            <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
              {/* Team 1 */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {team1.image_url ? (
                    <img src={team1.image_url} alt={team1.name} className="w-8 h-8 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = team1.acronym?.[0] || '?'; }} />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{team1.acronym?.[0] || '?'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{team1.acronym || team1.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{team1.name}</p>
                </div>
              </div>

              {/* Score */}
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-mono font-bold tabular-nums ${isLive && score1 > score2 ? 'text-primary' : ''}`}>
                  {isLive ? score1 : '-'}
                </span>
                <div className="flex flex-col items-center">
                  {isLive ? <Zap className="w-4 h-4 text-yellow-500" /> : <span className="text-xs text-muted-foreground font-mono">vs</span>}
                </div>
                <span className={`text-2xl font-mono font-bold tabular-nums ${isLive && score2 > score1 ? 'text-primary' : ''}`}>
                  {isLive ? score2 : '-'}
                </span>
              </div>

              {/* Team 2 */}
              <div className="flex items-center gap-3 justify-end">
                <div className="min-w-0 text-right">
                  <p className="font-semibold text-sm truncate">{team2.acronym || team2.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{team2.name}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {team2.image_url ? (
                    <img src={team2.image_url} alt={team2.name} className="w-8 h-8 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.textContent = team2.acronym?.[0] || '?'; }} />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{team2.acronym?.[0] || '?'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Game Progress Dots */}
            {isLive && match.games && match.games.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {match.games.map((game) => (
                  <div key={game.id} className={`w-2 h-2 rounded-full transition-all ${game.status === 'running' ? 'bg-yellow-500 animate-pulse w-2.5 h-2.5'
                    : game.finished
                      ? game.winner.id === team1.id ? 'bg-blue-500' : game.winner.id === team2.id ? 'bg-red-500' : 'bg-muted-foreground'
                      : 'bg-muted/50'
                    }`} />
                ))}
              </div>
            )}

            {/* Upcoming: scheduled time + betting countdown */}
            {!isLive && match.scheduled_at && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{new Date(match.scheduled_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                <span>•</span>
                <span>Best of {match.number_of_games}</span>
              </div>
            )}

            {/* Betting Countdown Timer */}
            <div className={`flex items-center justify-center gap-1.5 mt-2 text-[11px] font-mono ${bettingOpen ? 'text-yellow-400' : 'text-red-400'}`}>
              {bettingOpen ? (
                <>
                  <Timer className="w-3 h-3" />
                  <span>Betting closes in {formatCountdown(msLeft)}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" />
                  <span>Betting Closed</span>
                </>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="px-4 py-2 bg-muted/10 border-t border-border/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {bestStream && (
                <a href={bestStream.raw_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                  onClick={(e) => e.stopPropagation()}>
                  <Tv className="w-3 h-3" /> Watch
                </a>
              )}
              {/* Pool display */}
              {matchPool > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-primary font-mono">
                  <TrendingUp className="w-3 h-3" />
                  {matchPool.toLocaleString()} $CLAW
                  <span className="text-muted-foreground">({matchBetCount} bet{matchBetCount !== 1 ? 's' : ''})</span>
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setDetailMatch(match); }}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="w-3 h-3" />
                Details
              </button>
            </div>

            {bettingOpen ? (
              <button
                onClick={(e) => { e.stopPropagation(); setExpandedMatch(isExpanded ? null : match.id); }}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors font-medium"
              >
                {isExpanded ? 'Close' : 'Bet'}
                <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-red-400 font-medium">
                <Lock className="w-3 h-3" />
                Closed
              </span>
            )}
          </div>

          {/* Inline Betting Panel */}
          {isExpanded && bettingOpen && (() => {
            const picked = selectedTeam[match.id];
            const pickedOdds = picked === team1.id ? odds1 : picked === team2.id ? odds2 : 0;
            const pickedName = picked === team1.id ? (team1.acronym || team1.name) : picked === team2.id ? (team2.acronym || team2.name) : '';
            const amount = betAmounts[match.id] || 0;

            return (
              <div className="px-4 py-4 bg-muted/5 border-t border-border/50 space-y-3 animate-in slide-in-from-top-2 duration-200"
                onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground font-medium">Pick your winner</p>
                  <span className="text-[10px] font-mono text-yellow-400 flex items-center gap-1">
                    <Timer className="w-2.5 h-2.5" />
                    {formatCountdown(msLeft)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedTeam(prev => ({ ...prev, [match.id]: team1.id }))}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${picked === team1.id ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border/50 bg-muted/20 hover:border-primary/30'
                      }`}
                  >
                    <div className="w-7 h-7 rounded bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {team1.image_url ? <img src={team1.image_url} alt="" className="w-5 h-5 object-contain" />
                        : <span className="text-[10px] font-bold">{team1.acronym?.[0]}</span>}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-semibold truncate">{team1.acronym || team1.name}</p>
                      <p className="text-[10px] text-primary font-mono">{odds1.toFixed(2)}x</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedTeam(prev => ({ ...prev, [match.id]: team2.id }))}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${picked === team2.id ? 'border-secondary bg-secondary/10 ring-1 ring-secondary/30' : 'border-border/50 bg-muted/20 hover:border-secondary/30'
                      }`}
                  >
                    <div className="w-7 h-7 rounded bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {team2.image_url ? <img src={team2.image_url} alt="" className="w-5 h-5 object-contain" />
                        : <span className="text-[10px] font-bold">{team2.acronym?.[0]}</span>}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-semibold truncate">{team2.acronym || team2.name}</p>
                      <p className="text-[10px] text-secondary font-mono">{odds2.toFixed(2)}x</p>
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="$CLAW amount" value={betAmounts[match.id] || ''}
                    onChange={(e) => setBetAmounts(prev => ({ ...prev, [match.id]: Number(e.target.value) }))}
                    className="h-9 text-sm bg-background/50 flex-1" min={1} />
                  <Button size="sm" className="h-9 px-4 text-xs" disabled={!picked || !amount}
                    onClick={() => picked && handlePlaceBet(match.id, picked, pickedName, pickedOdds)}>
                    <Target className="w-3.5 h-3.5 mr-1.5" /> Place Bet
                  </Button>
                </div>

                {picked && amount > 0 && (
                  <p className="text-[11px] text-center text-muted-foreground">
                    Betting <span className="text-foreground font-mono font-semibold">{amount}</span> $CLAW on <span className="text-foreground font-semibold">{pickedName}</span> at <span className="text-primary font-mono">{pickedOdds.toFixed(2)}x</span>
                    {' → '} Win: <span className="font-mono font-bold" style={{ color: '#16c784' }}>{(amount * pickedOdds).toFixed(0)} $CLAW</span>
                  </p>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    );
  };

  // ── Main Render ────────────────────────────────────────────────
  return (
    <Layout>
      <div className="container mx-auto px-4 space-y-6 pb-8">
        {/* Header */}
        <section className="py-6 text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Gamepad2 className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-display font-bold">ESPORTS BETTING</h1>
          </div>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Bet on live esports matches with $CLAW tokens. Real-time scores powered by PandaScore.
          </p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-border bg-card/50 relative overflow-hidden">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">CLAW Balance</p>
              <p className="font-display font-bold text-lg text-primary">{Math.floor(clawBalance).toLocaleString()}</p>
              <button
                onClick={() => setSwapModalOpen(true)}
                className="flex items-center gap-1 mx-auto mt-1 text-[10px] text-orange-400 hover:text-orange-300 transition-colors font-medium"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                Get CLAW
              </button>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Active Bets</p>
              <p className="font-display font-bold text-lg">{onChainStats.activeBets}</p>
              <p className="text-[10px] text-muted-foreground">matches</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Total Wagered</p>
              <p className="font-display font-bold text-lg text-yellow-400">{onChainStats.totalWagered.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">$CLAW</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Win Rate</p>
              <p className="font-display font-bold text-lg" style={{ color: '#16c784' }}>{onChainStats.winRate}%</p>
              <p className="text-[10px] text-muted-foreground">all time</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/50">
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Total Won</p>
              <p className="font-display font-bold text-lg" style={{ color: '#16c784' }}>+{onChainStats.totalWon.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">$CLAW</p>
            </CardContent>
          </Card>
        </section>

        {/* Game Filters */}
        <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {GAME_FILTERS.map((game) => (
            <button key={game.slug} onClick={() => handleGameFilter(game.slug)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeGame === game.slug
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}>
              <span>{game.icon}</span> {game.label}
            </button>
          ))}
        </section>

        {/* Status Bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {liveMatches.length} live • {upcomingMatches.length} upcoming
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHideClosed(h => !h)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${hideClosed
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-transparent'
                }`}
            >
              {hideClosed ? <EyeOff className="w-3 h-3" /> : <Filter className="w-3 h-3" />}
              {hideClosed ? 'Showing Open Only' : 'Hide Closed'}
            </button>
            <span className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading esports matches...</p>
          </div>
        ) : (
          <>
            {/* Upcoming Matches (betting open) */}
            {upcomingMatches.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <h2 className="text-lg font-display font-bold">Upcoming Matches</h2>
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">{upcomingMatches.length}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[...upcomingMatches]
                    .sort((a, b) => {
                      const aOpen = new Date(a.scheduled_at).getTime() > now ? 1 : 0;
                      const bOpen = new Date(b.scheduled_at).getTime() > now ? 1 : 0;
                      return bOpen - aOpen;
                    })
                    .filter(m => !hideClosed || new Date(m.scheduled_at).getTime() > now)
                    .map(m => renderMatchCard(m, false))}
                </div>
              </section>
            )}

            {/* Live Matches (betting closed) */}
            {liveMatches.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <h2 className="text-lg font-display font-bold">Live Matches</h2>
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">{liveMatches.length}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[...liveMatches]
                    .sort((a, b) => {
                      const aOpen = new Date(a.scheduled_at).getTime() > now ? 1 : 0;
                      const bOpen = new Date(b.scheduled_at).getTime() > now ? 1 : 0;
                      return bOpen - aOpen;
                    })
                    .filter(m => !hideClosed || new Date(m.scheduled_at).getTime() > now)
                    .map(m => renderMatchCard(m, true))}
                </div>
              </section>
            )}

            {/* Your Recent Bets */}
            {placedBets.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  <h2 className="text-lg font-display font-bold">Your Bets</h2>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">{placedBets.length}</Badge>
                </div>
                <Card className="border-border">
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {placedBets.slice(0, 10).map((bet) => (
                        <div key={bet.id} className="flex items-center justify-between px-4 py-3 text-xs hover:bg-muted/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${bet.status === 'active' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                              : bet.status === 'won' ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                : 'bg-red-500/10 text-red-400 border-red-500/30'
                              }`}>
                              {bet.status.toUpperCase()}
                            </Badge>
                            <div>
                              <p className="font-medium">{bet.matchName}</p>
                              <p className="text-muted-foreground text-[10px]">
                                {bet.teamName} @ {bet.odds.toFixed(2)}x • {new Date(bet.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-semibold">{bet.amount} $CLAW</p>
                            <p className="text-[10px] text-primary font-mono">→ {(bet.amount * bet.odds).toFixed(0)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* No matches */}
            {liveMatches.length === 0 && upcomingMatches.length === 0 && (
              <Card className="border-dashed border-2 border-muted">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                  <Gamepad2 className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="font-display font-semibold text-xl mb-2">No Matches Available</h3>
                  <p className="text-muted-foreground text-sm">
                    No {activeGame !== 'all' ? getGameDisplayName(activeGame) : 'esports'} matches currently.
                  </p>
                  {activeGame !== 'all' && (
                    <Button variant="outline" className="mt-4" onClick={() => handleGameFilter('all')}>View All Games</Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Match Detail Modal */}
      {detailMatch && (
        <MatchDetailModal
          match={detailMatch}
          isOpen={!!detailMatch}
          onClose={() => setDetailMatch(null)}
          bets={placedBets}
          onPlaceBet={handlePlaceBet}
          generateOdds={generateOdds}
        />
      )}

      {/* Swap Modal */}
      <SwapModal isOpen={swapModalOpen} onClose={() => setSwapModalOpen(false)} />
    </Layout>
  );
};

export default Betting;
