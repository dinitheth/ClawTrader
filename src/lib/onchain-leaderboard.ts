/**
 * On-Chain Leaderboard Service
 * Fetches real on-chain vault balances for all agents from the trading server.
 * Replaces the old Supabase-only match stats with real USDC vault data.
 */

import { supabase } from '@/integrations/supabase/client';

const TRADING_SERVER_URL = import.meta.env.VITE_TRADING_SERVER_URL || 'http://96.30.205.215:3001';

export interface OnChainAgentData {
    id: string;
    name: string;
    avatar: string;
    generation: number;
    personality: string;
    created_at: string;
    owner_wallet: string | null;
    // On-chain data
    vaultBalanceUSDC: number;
    tokenBalances: Record<string, number>;
    totalValueUSDC: number;
    // Supabase trade tracking
    totalTrades: number;
    // Computed
    pnlPercent: number;
}

/**
 * Fetch all agents with owner wallet addresses from Supabase,
 * then get their on-chain vault balances from the trading server.
 */
export async function fetchOnChainLeaderboard(): Promise<OnChainAgentData[]> {
    // Step 1: Get all agents with their owner's profile (for wallet_address)
    const { data: agents, error } = await supabase
        .from('agents')
        .select(`
      id,
      name,
      avatar,
      generation,
      personality,
      created_at,
      total_matches,
      balance,
      owner_id,
      profiles:owner_id (
        wallet_address
      )
    `)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Failed to fetch agents:', error);
        throw error;
    }

    if (!agents || agents.length === 0) return [];

    // Step 2: For each agent with a wallet, fetch on-chain balances from trading server
    const results: OnChainAgentData[] = await Promise.all(
        agents.map(async (agent: any) => {
            const walletAddress = agent.profiles?.wallet_address || null;

            let vaultBalanceUSDC = 0;
            let tokenBalances: Record<string, number> = {};

            if (walletAddress) {
                try {
                    const resp = await fetch(
                        `${TRADING_SERVER_URL}/api/agent-balances/${walletAddress}/${agent.id}`,
                        { signal: AbortSignal.timeout(5000) }
                    );
                    if (resp.ok) {
                        const data = await resp.json();
                        vaultBalanceUSDC = data.usdc || 0;
                        tokenBalances = data.tokens || {};
                    }
                } catch (err) {
                    // Trading server may be down — show 0 balance gracefully
                    console.warn(`Failed to fetch on-chain balance for ${agent.name}:`, err);
                }
            }

            // Total token value is approximated — just show vault USDC for now
            // Token holdings are shown separately
            const totalValueUSDC = vaultBalanceUSDC;

            // Use total_matches from supabase as trade count (these are actual trades now)
            const totalTrades = agent.total_matches || 0;

            // P&L: compare current vault balance to initial deposit (balance field in supabase stores initial)
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
                owner_wallet: walletAddress,
                vaultBalanceUSDC,
                tokenBalances,
                totalValueUSDC,
                totalTrades,
                pnlPercent,
            };
        })
    );

    // Sort by vault balance (highest first)
    return results.sort((a, b) => b.vaultBalanceUSDC - a.vaultBalanceUSDC);
}
