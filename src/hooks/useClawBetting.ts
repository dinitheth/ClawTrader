import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACTS } from '@/lib/contracts';

// ── BettingEscrow ABI ───────────────────────────────────────────
export const BETTING_ESCROW_ABI = [
    // Write functions
    {
        name: 'placeBet',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'matchId', type: 'uint256' },
            { name: 'teamAId', type: 'uint256' },
            { name: 'teamBId', type: 'uint256' },
            { name: 'teamId', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
    // Read functions
    {
        name: 'getMatch',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'matchId', type: 'uint256' }],
        outputs: [
            { name: 'teamAId', type: 'uint256' },
            { name: 'teamBId', type: 'uint256' },
            { name: 'teamATotal', type: 'uint256' },
            { name: 'teamBTotal', type: 'uint256' },
            { name: 'winnerTeamId', type: 'uint256' },
            { name: 'settled', type: 'bool' },
            { name: 'cancelled', type: 'bool' },
        ],
    },
    {
        name: 'getUserBet',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'matchId', type: 'uint256' },
            { name: 'user', type: 'address' },
        ],
        outputs: [
            { name: 'teamId', type: 'uint256' },
            { name: 'amount', type: 'uint256' },
        ],
    },
    {
        name: 'getTotalPool',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'matchId', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'getBetCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'matchId', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'matches',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'uint256' }],
        outputs: [
            { name: 'teamAId', type: 'uint256' },
            { name: 'teamBId', type: 'uint256' },
            { name: 'teamATotal', type: 'uint256' },
            { name: 'teamBTotal', type: 'uint256' },
            { name: 'winnerTeamId', type: 'uint256' },
            { name: 'settled', type: 'bool' },
            { name: 'cancelled', type: 'bool' },
            { name: 'exists', type: 'bool' },
        ],
    },
    // Events
    {
        name: 'BetPlaced',
        type: 'event',
        inputs: [
            { name: 'matchId', type: 'uint256', indexed: true },
            { name: 'bettor', type: 'address', indexed: true },
            { name: 'teamId', type: 'uint256', indexed: false },
            { name: 'amount', type: 'uint256', indexed: false },
        ],
    },
    {
        name: 'WinnerPaid',
        type: 'event',
        inputs: [
            { name: 'matchId', type: 'uint256', indexed: true },
            { name: 'winner', type: 'address', indexed: true },
            { name: 'payout', type: 'uint256', indexed: false },
        ],
    },
    {
        name: 'MatchSettled',
        type: 'event',
        inputs: [
            { name: 'matchId', type: 'uint256', indexed: true },
            { name: 'winnerTeamId', type: 'uint256', indexed: false },
            { name: 'totalPool', type: 'uint256', indexed: false },
            { name: 'fee', type: 'uint256', indexed: false },
        ],
    },
    {
        name: 'getMatchCount',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'matchIds',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

// CLAW approve ABI (minimal)
const CLAW_ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const;

const ESCROW_ADDRESS = CONTRACTS.BETTING_ESCROW.address;
const CLAW_ADDRESS = CONTRACTS.CLAW_TOKEN.address;

// ── Types ───────────────────────────────────────────────────────
export interface OnChainMatchData {
    teamAId: bigint;
    teamBId: bigint;
    teamATotal: bigint;
    teamBTotal: bigint;
    winnerTeamId: bigint;
    settled: boolean;
    cancelled: boolean;
    exists: boolean;
}

export interface UserBetData {
    teamId: bigint;
    amount: bigint;
}

export interface OnChainBettingStats {
    activeBets: number;
    totalWagered: number;
    totalWon: number;
    winRate: number;
    settledCount: number;
    wonCount: number;
}

// ── Hook ────────────────────────────────────────────────────────
// Monad RPC limits eth_getLogs to 100 blocks
const LOG_CHUNK_SIZE = 99;
// Contract deploy block (avoid scanning from genesis)
const CONTRACT_DEPLOY_BLOCK = 12_100_000n;

export function useClawBetting() {
    const { address, isConnected } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();
    const [isApproving, setIsApproving] = useState(false);
    const [isPlacing, setIsPlacing] = useState(false);
    const [onChainStats, setOnChainStats] = useState<OnChainBettingStats>({
        activeBets: 0, totalWagered: 0, totalWon: 0, winRate: 0, settledCount: 0, wonCount: 0,
    });
    const [statsLoading, setStatsLoading] = useState(false);
    const statsLoadedRef = useRef(false);

    // ── Read user's CLAW balance ──────────────────────────────────
    const { data: clawBalance, refetch: refetchBalance } = useReadContract({
        address: CLAW_ADDRESS,
        abi: CLAW_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: { enabled: !!address },
    });

    // ── Read user's current allowance for escrow ──────────────────
    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
        address: CLAW_ADDRESS,
        abi: CLAW_ABI,
        functionName: 'allowance',
        args: address ? [address, ESCROW_ADDRESS] : undefined,
        query: { enabled: !!address },
    });

    // ── Approve CLAW spending for escrow ──────────────────────────
    const approveClaw = useCallback(
        async (amount: bigint) => {
            if (!isConnected || !address) throw new Error('Wallet not connected');
            setIsApproving(true);
            try {
                const tx = await writeContractAsync({
                    address: CLAW_ADDRESS,
                    abi: CLAW_ABI,
                    functionName: 'approve',
                    args: [ESCROW_ADDRESS, amount],
                } as any);
                // Wait for confirmation
                if (publicClient) {
                    await publicClient.waitForTransactionReceipt({ hash: tx });
                }
                await refetchAllowance();
                return tx;
            } finally {
                setIsApproving(false);
            }
        },
        [isConnected, address, writeContractAsync, publicClient, refetchAllowance]
    );

    // ── Place a bet through escrow ────────────────────────────────
    // Handles approve + placeBet in one flow
    const placeBet = useCallback(
        async (matchId: number, teamAId: number, teamBId: number, teamId: number, amountClaw: number) => {
            if (!isConnected || !address) throw new Error('Wallet not connected');
            setIsPlacing(true);

            try {
                const amountWei = parseUnits(String(amountClaw), 18);

                // Check & approve if needed
                const allowance = currentAllowance ?? BigInt(0);
                if (allowance < amountWei) {
                    // Approve max to avoid repeated approvals
                    await approveClaw(amountWei * BigInt(10));
                }

                // Place the bet (auto-creates match on-chain if it doesn't exist)
                const tx = await writeContractAsync({
                    address: ESCROW_ADDRESS,
                    abi: BETTING_ESCROW_ABI,
                    functionName: 'placeBet',
                    args: [BigInt(matchId), BigInt(teamAId), BigInt(teamBId), BigInt(teamId), amountWei],
                } as any);

                // Wait for confirmation
                if (publicClient) {
                    await publicClient.waitForTransactionReceipt({ hash: tx });
                }

                // Refresh balances
                await refetchBalance();
                await refetchAllowance();

                return tx;
            } finally {
                setIsPlacing(false);
            }
        },
        [isConnected, address, currentAllowance, approveClaw, writeContractAsync, publicClient, refetchBalance, refetchAllowance]
    );

    // ── Read match data from chain ────────────────────────────────
    const getMatchData = useCallback(
        async (matchId: number): Promise<OnChainMatchData | null> => {
            if (!publicClient) return null;
            try {
                const data = await publicClient.readContract({
                    address: ESCROW_ADDRESS,
                    abi: BETTING_ESCROW_ABI,
                    functionName: 'matches',
                    args: [BigInt(matchId)],
                } as any);
                const [teamAId, teamBId, teamATotal, teamBTotal, winnerTeamId, settled, cancelled, exists] = data as [bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean];
                return { teamAId, teamBId, teamATotal, teamBTotal, winnerTeamId, settled, cancelled, exists };
            } catch {
                return null;
            }
        },
        [publicClient]
    );

    // ── Read user bet for a match ─────────────────────────────────
    const getUserBet = useCallback(
        async (matchId: number): Promise<UserBetData | null> => {
            if (!publicClient || !address) return null;
            try {
                const data = await publicClient.readContract({
                    address: ESCROW_ADDRESS,
                    abi: BETTING_ESCROW_ABI,
                    functionName: 'getUserBet',
                    args: [BigInt(matchId), address],
                } as any);
                const [teamId, amount] = data as [bigint, bigint];
                return { teamId, amount };
            } catch {
                return null;
            }
        },
        [publicClient, address]
    );

    // ── Read total pool for a match ───────────────────────────────
    const getTotalPool = useCallback(
        async (matchId: number): Promise<bigint> => {
            if (!publicClient) return BigInt(0);
            try {
                const data = await publicClient.readContract({
                    address: ESCROW_ADDRESS,
                    abi: BETTING_ESCROW_ABI,
                    functionName: 'getTotalPool',
                    args: [BigInt(matchId)],
                } as any);
                return data as bigint;
            } catch {
                return BigInt(0);
            }
        },
        [publicClient]
    );

    // ── Load user on-chain betting stats ──────────────────────────
    const loadOnChainStats = useCallback(
        async () => {
            if (!publicClient || !address) return;
            setStatsLoading(true);
            try {
                // 1. Get total number of matches in the contract
                const matchCountRaw = await publicClient.readContract({
                    address: ESCROW_ADDRESS,
                    abi: BETTING_ESCROW_ABI,
                    functionName: 'getMatchCount',
                    args: [],
                } as any);
                const matchCount = Number(matchCountRaw as bigint);

                if (matchCount === 0) {
                    setOnChainStats({ activeBets: 0, totalWagered: 0, totalWon: 0, winRate: 0, settledCount: 0, wonCount: 0 });
                    statsLoadedRef.current = true;
                    setStatsLoading(false);
                    return;
                }

                // 2. Enumerate all match IDs
                const allMatchIds: bigint[] = [];
                for (let i = 0; i < matchCount; i++) {
                    try {
                        const mId = await publicClient.readContract({
                            address: ESCROW_ADDRESS,
                            abi: BETTING_ESCROW_ABI,
                            functionName: 'matchIds',
                            args: [BigInt(i)],
                        } as any);
                        allMatchIds.push(mId as bigint);
                    } catch { /* skip */ }
                }

                // 3. For each match, check if the user has a bet
                let activeBets = 0;
                let totalWagered = 0;
                let totalWon = 0;
                let settledCount = 0;
                let wonCount = 0;

                for (const mId of allMatchIds) {
                    try {
                        // Get user bet on this match
                        const betData = await publicClient.readContract({
                            address: ESCROW_ADDRESS,
                            abi: BETTING_ESCROW_ABI,
                            functionName: 'getUserBet',
                            args: [mId, address],
                        } as any);
                        const [userTeamId, userAmount] = betData as [bigint, bigint];

                        // Skip if user has no bet on this match
                        if (userAmount === 0n) continue;

                        const betAmountNum = Number(formatUnits(userAmount, 18));
                        totalWagered += betAmountNum;

                        // Get match data to check settlement status
                        const matchData = await publicClient.readContract({
                            address: ESCROW_ADDRESS,
                            abi: BETTING_ESCROW_ABI,
                            functionName: 'matches',
                            args: [mId],
                        } as any);
                        const [, , teamATotal, teamBTotal, winnerTeamId, settled, cancelled] =
                            matchData as [bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean];

                        if (settled) {
                            settledCount++;
                            if (userTeamId === winnerTeamId) {
                                wonCount++;
                                // Calculate payout: (userBet / winningTotal) * winnerPool
                                const pool = teamATotal + teamBTotal;
                                const fee = (pool * 500n) / 10000n; // 5%
                                const winnerPool = pool - fee;
                                const winningTotal = winnerTeamId === (matchData as any)[0]
                                    ? teamATotal : teamBTotal;
                                if (winningTotal > 0n) {
                                    const payout = (userAmount * winnerPool) / winningTotal;
                                    totalWon += Number(formatUnits(payout, 18));
                                }
                            }
                        } else if (cancelled) {
                            settledCount++; // count cancelled as resolved
                        } else {
                            activeBets++;
                        }
                    } catch {
                        // If we can't read this match, skip it
                    }
                }

                const winRate = settledCount > 0 ? Math.round((wonCount / settledCount) * 100) : 0;

                setOnChainStats({
                    activeBets,
                    totalWagered: Math.round(totalWagered),
                    totalWon: Math.round(totalWon),
                    winRate,
                    settledCount,
                    wonCount,
                });
                statsLoadedRef.current = true;
            } catch (err) {
                console.error('Failed to load on-chain stats:', err);
            } finally {
                setStatsLoading(false);
            }
        },
        [publicClient, address]
    );

    // Auto-load stats on mount and after placing a bet
    useEffect(() => {
        if (address && publicClient && !statsLoadedRef.current) {
            loadOnChainStats();
        }
    }, [address, publicClient, loadOnChainStats]);

    return {
        // State
        isApproving,
        isPlacing,
        isBusy: isApproving || isPlacing,
        clawBalance: clawBalance ? formatUnits(clawBalance as bigint, 18) : '0',
        clawBalanceRaw: (clawBalance as bigint) ?? BigInt(0),
        currentAllowance: (currentAllowance as bigint) ?? BigInt(0),

        // On-chain stats
        onChainStats,
        statsLoading,
        refreshStats: loadOnChainStats,

        // Actions
        approveClaw,
        placeBet,

        // Reads
        getMatchData,
        getUserBet,
        getTotalPool,

        // Refetch
        refetchBalance,
        refetchAllowance,
    };
}
