/**
 * On-Chain Leaderboard Service
 * Reads real vault USDC balances directly from the AgentVault contract on Monad Testnet.
 * Uses viem createPublicClient — no trading server dependency.
 */

import { supabase } from '@/integrations/supabase/client';
import { createPublicClient, http, formatUnits } from 'viem';
import { CONTRACTS, AGENT_VAULT_ABI } from '@/lib/contracts';

// Monad Testnet chain definition for viem
const monadTestnet = {
    id: 10143,
    name: 'Monad Testnet',
    nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
    rpcUrls: {
        default: { http: ['https://testnet-rpc.monad.xyz'] },
    },
} as const;

// Create a standalone viem client (works without wallet connection)
const publicClient = createPublicClient({
    chain: monadTestnet,
    transport: http('https://testnet-rpc.monad.xyz'),
});

/** Convert UUID string to bytes32 hex (same logic as trading server) */
function uuidToBytes32(uuid: string): `0x${string}` {
    const hex = uuid.replace(/-/g, '');
    return `0x${hex.padEnd(64, '0')}` as `0x${string}`;
}

export interface OnChainAgentData {
    id: string;
    name: string;
    avatar: string;
    generation: number;
    personality: string;
    created_at: string;
    // On-chain data
    vaultBalanceUSDC: number;
    // Supabase tracking
    totalTrades: number;
    // Computed
    pnlPercent: number;
}

/**
 * Fetch all agents from Supabase, then read their on-chain vault balances
 * directly from the AgentVault contract using getAgentTotalBalance(bytes32).
 */
export async function fetchOnChainLeaderboard(): Promise<OnChainAgentData[]> {
    // Step 1: Get all agents from Supabase
    const { data: agents, error } = await supabase
        .from('agents')
        .select('id, name, avatar, generation, personality, created_at, total_matches, balance')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to fetch agents:', error);
        throw error;
    }

    if (!agents || agents.length === 0) return [];

    // Step 2: Batch-read on-chain balances for all agents
    const results: OnChainAgentData[] = await Promise.all(
        agents.map(async (agent: any) => {
            let vaultBalanceUSDC = 0;

            try {
                const agentIdBytes32 = uuidToBytes32(agent.id);
                const rawBalance = await publicClient.readContract({
                    address: CONTRACTS.AGENT_VAULT.address,
                    abi: AGENT_VAULT_ABI,
                    functionName: 'getAgentTotalBalance',
                    args: [agentIdBytes32],
                });
                // USDC has 6 decimals
                vaultBalanceUSDC = parseFloat(formatUnits(rawBalance as bigint, 6));
            } catch (err) {
                console.warn(`Failed to read vault balance for ${agent.name}:`, err);
            }

            const totalTrades = agent.total_matches || 0;

            // P&L: compare current vault balance to initial deposit
            const initialBalance = Number(agent.balance || 0);
            let pnlPercent = 0;
            if (initialBalance > 0 && vaultBalanceUSDC > 0) {
                pnlPercent = ((vaultBalanceUSDC - initialBalance) / initialBalance) * 100;
            }

            return {
                id: agent.id,
                name: agent.name,
                avatar: agent.avatar,
                generation: agent.generation,
                personality: agent.personality,
                created_at: agent.created_at,
                vaultBalanceUSDC,
                totalTrades,
                pnlPercent,
            };
        })
    );

    // Sort by vault balance (highest first)
    return results.sort((a, b) => b.vaultBalanceUSDC - a.vaultBalanceUSDC);
}
