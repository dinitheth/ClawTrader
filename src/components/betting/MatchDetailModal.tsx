import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { CONTRACTS } from '@/lib/contracts';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    X, Tv, Trophy, Zap, Target, ExternalLink,
    Swords, Timer, TrendingUp, Wallet, Lock
} from "lucide-react";
import {
    type PandaMatch,
    getBestStream,
    getTeamScore,
    getGameDisplayName,
    getGameColor,
    getSeriesInfo,
} from '@/lib/pandaScore';

export interface PlacedBet {
    id: string;
    matchId: number;
    teamId: number;
    teamName: string;
    amount: number;
    odds: number;
    timestamp: string;
    matchName: string;
    status: 'active' | 'won' | 'lost';
}

interface MatchDetailModalProps {
    match: PandaMatch;
    isOpen: boolean;
    onClose: () => void;
    bets: PlacedBet[];
    onPlaceBet: (matchId: number, teamId: number, teamName: string, odds: number, amount: number) => void;
    generateOdds: (match: PandaMatch) => [number, number];
}

const MatchDetailModal = ({ match, isOpen, onClose, bets, onPlaceBet, generateOdds }: MatchDetailModalProps) => {
    const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
    const [betAmount, setBetAmount] = useState<number>(0);

    // Read on-chain CLAW balance
    const { address, isConnected } = useAccount();
    const { data: clawBalanceRaw } = useReadContract({
        address: CONTRACTS.CLAW_TOKEN.address,
        abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }] as const,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });
    const clawBalance = clawBalanceRaw ? Number(formatUnits(clawBalanceRaw as bigint, 18)) : 0;

    // Real-time countdown for betting deadline
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    if (!isOpen || match.opponents.length < 2) return null;

    // Betting deadline = match scheduled start time
    const deadline = new Date(match.scheduled_at).getTime();
    const msLeft = deadline - now;
    const bettingOpen = msLeft > 0;

    const fmtCountdown = (ms: number): string => {
        if (ms <= 0) return 'CLOSED';
        const totalSec = Math.floor(ms / 1000);
        const days = Math.floor(totalSec / 86400);
        const hrs = Math.floor((totalSec % 86400) / 3600);
        const min = Math.floor((totalSec % 3600) / 60);
        const sec = totalSec % 60;
        if (days > 0) return `${days}d ${hrs}h ${min}m`;
        if (hrs > 0) return `${hrs}h ${min}m ${sec}s`;
        return `${min}m ${sec}s`;
    };

    const team1 = match.opponents[0].opponent;
    const team2 = match.opponents[1].opponent;
    const score1 = getTeamScore(match, team1.id);
    const score2 = getTeamScore(match, team2.id);
    const [odds1, odds2] = generateOdds(match);
    const bestStream = getBestStream(match);
    const gameColor = getGameColor(match.videogame.slug);
    const isLive = match.status === 'running';

    // Bets for this match
    const matchBets = bets.filter(b => b.matchId === match.id);
    const totalBetAmount = matchBets.reduce((sum, b) => sum + b.amount, 0);
    const team1Bets = matchBets.filter(b => b.teamId === team1.id);
    const team2Bets = matchBets.filter(b => b.teamId === team2.id);
    const team1Total = team1Bets.reduce((sum, b) => sum + b.amount, 0);
    const team2Total = team2Bets.reduce((sum, b) => sum + b.amount, 0);

    const pickedOdds = selectedTeam === team1.id ? odds1 : selectedTeam === team2.id ? odds2 : 0;
    const pickedName = selectedTeam === team1.id ? (team1.acronym || team1.name) : selectedTeam === team2.id ? (team2.acronym || team2.name) : '';

    const handleBet = () => {
        if (!selectedTeam || betAmount <= 0) return;
        onPlaceBet(match.id, selectedTeam, pickedName, pickedOdds, betAmount);
        setBetAmount(0);
        setSelectedTeam(null);
    };

    const formatLength = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* ── Horizontal Modal ─────────────────────────────────── */}
            <div
                className="relative w-full max-w-[1100px] max-h-[85vh] rounded-xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header Bar ──────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/95 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        {isLive && (
                            <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/50 text-[10px] px-2 py-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1 animate-pulse" />
                                LIVE
                            </Badge>
                        )}
                        <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 border-none"
                            style={{ backgroundColor: `${gameColor}20`, color: gameColor }}
                        >
                            {getGameDisplayName(match.videogame.slug)}
                        </Badge>
                        <span className="text-sm font-semibold">{match.tournament.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {bestStream && (
                            <a
                                href={bestStream.raw_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                                <Tv className="w-3.5 h-3.5" />
                                Watch Live
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        )}
                        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted/50 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Two-Column Body ─────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] divide-x divide-border/50">

                    {/* ══════════ LEFT: Match Info ══════════ */}
                    <div className="overflow-y-auto max-h-[calc(85vh-52px)]">

                        {/* Teams + Score */}
                        <div className="px-6 py-5">
                            <div className="grid grid-cols-[1fr,auto,1fr] gap-8 items-center">
                                {/* Team 1 */}
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden border border-border/50 flex-shrink-0">
                                        {team1.image_url ? (
                                            <img src={team1.image_url} alt={team1.name} className="w-10 h-10 object-contain" />
                                        ) : (
                                            <span className="text-lg font-bold text-muted-foreground">{team1.acronym?.[0] || '?'}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{team1.acronym || team1.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{team1.name}</p>
                                        {team1.location && <p className="text-[10px] text-muted-foreground">📍 {team1.location}</p>}
                                    </div>
                                </div>

                                {/* Score Center */}
                                <div className="flex flex-col items-center gap-1">
                                    <div className="flex items-center gap-5">
                                        <span className={`text-4xl font-mono font-bold tabular-nums ${isLive && score1 > score2 ? 'text-primary' : ''}`}>
                                            {isLive || match.status === 'finished' ? score1 : '-'}
                                        </span>
                                        {isLive ? (
                                            <Swords className="w-5 h-5 text-yellow-500" />
                                        ) : (
                                            <Swords className="w-5 h-5 text-muted-foreground" />
                                        )}
                                        <span className={`text-4xl font-mono font-bold tabular-nums ${isLive && score2 > score1 ? 'text-primary' : ''}`}>
                                            {isLive || match.status === 'finished' ? score2 : '-'}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground font-mono">{getSeriesInfo(match)}</span>
                                </div>

                                {/* Team 2 */}
                                <div className="flex items-center gap-4 justify-end">
                                    <div className="text-right">
                                        <p className="font-semibold text-sm">{team2.acronym || team2.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{team2.name}</p>
                                        {team2.location && <p className="text-[10px] text-muted-foreground">📍 {team2.location}</p>}
                                    </div>
                                    <div className="w-14 h-14 rounded-xl bg-muted/30 flex items-center justify-center overflow-hidden border border-border/50 flex-shrink-0">
                                        {team2.image_url ? (
                                            <img src={team2.image_url} alt={team2.name} className="w-10 h-10 object-contain" />
                                        ) : (
                                            <span className="text-lg font-bold text-muted-foreground">{team2.acronym?.[0] || '?'}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Match Info Row */}
                        <div className="px-6 py-3 border-t border-border/50 bg-muted/5">
                            <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                    <p className="text-[10px] text-muted-foreground mb-0.5">League</p>
                                    <p className="text-xs font-medium truncate">{match.league.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground mb-0.5">Tournament</p>
                                    <p className="text-xs font-medium truncate">{match.tournament.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground mb-0.5">Series</p>
                                    <p className="text-xs font-medium truncate">{match.serie.full_name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground mb-0.5">Scheduled</p>
                                    <p className="text-xs font-medium">
                                        {new Date(match.scheduled_at).toLocaleString(undefined, {
                                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Games Breakdown */}
                        {match.games && match.games.length > 0 && (
                            <div className="px-6 py-4 border-t border-border/50">
                                <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                                    <Trophy className="w-3.5 h-3.5" />
                                    GAMES BREAKDOWN
                                </h3>
                                <div className="space-y-1.5">
                                    {match.games.map((game) => (
                                        <div
                                            key={game.id}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${game.status === 'running'
                                                ? 'bg-yellow-500/10 border border-yellow-500/20'
                                                : game.finished
                                                    ? 'bg-muted/20'
                                                    : 'bg-muted/5 text-muted-foreground'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-muted-foreground w-16">Game {game.position}</span>
                                                {game.status === 'running' && (
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse">
                                                        LIVE
                                                    </Badge>
                                                )}
                                                {game.finished && game.winner.id && (
                                                    <span className="text-[10px]">
                                                        Won by <span className="font-semibold text-foreground">
                                                            {game.winner.id === team1.id ? (team1.acronym || team1.name) : (team2.acronym || team2.name)}
                                                        </span>
                                                    </span>
                                                )}
                                                {!game.finished && game.status === 'not_started' && (
                                                    <span className="text-[10px] text-muted-foreground">Not started</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {game.length && (
                                                    <span className="font-mono text-muted-foreground flex items-center gap-1">
                                                        <Timer className="w-3 h-3" />
                                                        {formatLength(game.length)}
                                                    </span>
                                                )}
                                                <div className={`w-2 h-2 rounded-full ${game.status === 'running' ? 'bg-yellow-500 animate-pulse'
                                                    : game.finished
                                                        ? game.winner.id === team1.id ? 'bg-blue-500' : 'bg-red-500'
                                                        : 'bg-muted/50'
                                                    }`} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Your Bets */}
                        {matchBets.length > 0 && (
                            <div className="px-6 py-4 border-t border-border/50">
                                <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5" />
                                    YOUR BETS ({matchBets.length})
                                </h3>
                                <div className="space-y-1.5">
                                    {matchBets.map((bet) => (
                                        <div key={bet.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/15 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={`text-[9px] px-1 py-0 ${bet.status === 'active' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                                    bet.status === 'won' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                                                        'bg-red-500/10 text-red-400 border-red-500/30'
                                                    }`}>
                                                    {bet.status.toUpperCase()}
                                                </Badge>
                                                <span className="font-medium">{bet.teamName}</span>
                                                <span className="text-muted-foreground">@ {bet.odds.toFixed(2)}x</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-semibold">{bet.amount} $CLAW</span>
                                                <span className="text-muted-foreground">→</span>
                                                <span className="font-mono text-primary">{(bet.amount * bet.odds).toFixed(0)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ══════════ RIGHT: Betting Panel ══════════ */}
                    <div className="flex flex-col bg-muted/5 overflow-y-auto max-h-[calc(85vh-52px)]">

                        {/* Bet Pool */}
                        <div className="px-5 py-4 border-b border-border/50">
                            <h3 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5" />
                                BET POOL
                            </h3>
                            <div className="space-y-2">
                                <div className="p-3 rounded-lg bg-muted/20 text-center border border-border/30">
                                    <p className="text-[10px] text-muted-foreground">Total Pool</p>
                                    <p className="text-xl font-bold font-mono text-primary">{totalBetAmount.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground">$CLAW</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2.5 rounded-lg bg-blue-500/5 text-center border border-blue-500/20">
                                        <p className="text-[10px] text-muted-foreground truncate">{team1.acronym || team1.name}</p>
                                        <p className="text-base font-bold font-mono text-blue-400">{team1Total.toLocaleString()}</p>
                                        <p className="text-[10px] text-muted-foreground">{team1Bets.length} bet{team1Bets.length !== 1 ? 's' : ''}</p>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-red-500/5 text-center border border-red-500/20">
                                        <p className="text-[10px] text-muted-foreground truncate">{team2.acronym || team2.name}</p>
                                        <p className="text-base font-bold font-mono text-red-400">{team2Total.toLocaleString()}</p>
                                        <p className="text-[10px] text-muted-foreground">{team2Bets.length} bet{team2Bets.length !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                                {totalBetAmount > 0 && (
                                    <div>
                                        <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden flex">
                                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(team1Total / totalBetAmount) * 100}%` }} />
                                            <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(team2Total / totalBetAmount) * 100}%` }} />
                                        </div>
                                        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                                            <span>{Math.round((team1Total / totalBetAmount) * 100)}%</span>
                                            <span>{Math.round((team2Total / totalBetAmount) * 100)}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Place Bet */}
                        <div className="px-5 py-4 flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                    <Zap className="w-3.5 h-3.5" />
                                    PLACE A BET
                                </h3>
                                {isConnected && (
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                        <Wallet className="w-3 h-3" />
                                        <span className="font-mono font-semibold text-primary">{clawBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> $CLAW
                                    </span>
                                )}
                            </div>
                            {/* Betting deadline countdown */}
                            <div className={`flex items-center gap-1.5 text-[11px] font-mono mb-4 ${bettingOpen ? 'text-yellow-400' : 'text-red-400'}`}>
                                {bettingOpen ? (
                                    <><Timer className="w-3 h-3" /> Betting closes in {fmtCountdown(msLeft)}</>
                                ) : (
                                    <><Lock className="w-3 h-3" /> Betting Closed</>
                                )}
                            </div>

                            {bettingOpen ? (
                                <>
                                    {/* Pick Team */}
                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <button
                                            onClick={() => setSelectedTeam(team1.id)}
                                            className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all ${selectedTeam === team1.id
                                                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                                                : 'border-border/50 bg-muted/20 hover:border-primary/30'
                                                }`}
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {team1.image_url ? (
                                                    <img src={team1.image_url} alt="" className="w-7 h-7 object-contain" />
                                                ) : (
                                                    <span className="text-xs font-bold">{team1.acronym?.[0]}</span>
                                                )}
                                            </div>
                                            <div className="text-left min-w-0">
                                                <p className="text-xs font-semibold truncate">{team1.acronym || team1.name}</p>
                                                <p className="text-[10px] text-primary font-mono">{odds1.toFixed(2)}x</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => setSelectedTeam(team2.id)}
                                            className={`flex items-center gap-2.5 p-3 rounded-lg border transition-all ${selectedTeam === team2.id
                                                ? 'border-secondary bg-secondary/10 ring-1 ring-secondary/30'
                                                : 'border-border/50 bg-muted/20 hover:border-secondary/30'
                                                }`}
                                        >
                                            <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {team2.image_url ? (
                                                    <img src={team2.image_url} alt="" className="w-7 h-7 object-contain" />
                                                ) : (
                                                    <span className="text-xs font-bold">{team2.acronym?.[0]}</span>
                                                )}
                                            </div>
                                            <div className="text-left min-w-0">
                                                <p className="text-xs font-semibold truncate">{team2.acronym || team2.name}</p>
                                                <p className="text-[10px] text-secondary font-mono">{odds2.toFixed(2)}x</p>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Amount Input */}
                                    <div className="space-y-3">
                                        <Input
                                            type="number"
                                            placeholder="Enter $CLAW amount"
                                            value={betAmount || ''}
                                            onChange={(e) => {
                                                const val = Number(e.target.value);
                                                setBetAmount(val > clawBalance ? clawBalance : val);
                                            }}
                                            className="h-11 bg-background/50 text-sm"
                                            min={1}
                                            max={clawBalance}
                                        />
                                        <Button
                                            className="w-full h-11"
                                            disabled={!selectedTeam || betAmount <= 0}
                                            onClick={handleBet}
                                        >
                                            <Target className="w-4 h-4 mr-2" />
                                            Place Bet
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
                                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                                        <Lock className="w-6 h-6 text-red-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-red-400">Betting Closed</p>
                                    <p className="text-xs text-muted-foreground text-center">Betting closed when the match started.<br />Watch the match and check results later!</p>
                                </div>
                            )}

                            {/* Bet Preview */}
                            {selectedTeam && betAmount > 0 && (
                                <div className="mt-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">Bet Amount</span>
                                        <span className="font-mono font-semibold">{betAmount.toLocaleString()} $CLAW</span>
                                    </div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">Team</span>
                                        <span className="font-semibold">{pickedName}</span>
                                    </div>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-muted-foreground">Odds</span>
                                        <span className="font-mono text-primary">{pickedOdds.toFixed(2)}x</span>
                                    </div>
                                    <div className="border-t border-border/30 mt-2 pt-2 flex justify-between text-xs">
                                        <span className="text-muted-foreground">Potential Win</span>
                                        <span className="font-mono font-bold" style={{ color: '#16c784' }}>
                                            {(betAmount * pickedOdds).toLocaleString(undefined, { maximumFractionDigits: 0 })} $CLAW
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatchDetailModal;
