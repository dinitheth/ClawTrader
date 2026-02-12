import { useReadContract, useAccount } from 'wagmi';
import { CONTRACTS, AGENT_VAULT_ABI, uuidToBytes32, isContractConfigured } from '@/lib/contracts';

interface UseAgentVaultBalanceOptions {
    agentId: string | null;
    /** Enable automatic refetching */
    refetchInterval?: number;
}

interface UseAgentVaultBalanceResult {
    /** Balance in USDC (already converted from 6 decimals) */
    balance: number;
    /** Raw balance from contract (in smallest unit) */
    rawBalance: bigint | undefined;
    /** Whether the balance is loading */
    isLoading: boolean;
    /** Whether there was an error fetching the balance */
    isError: boolean;
    /** Error message if any */
    error: Error | null;
    /** Whether the contract is configured (not placeholder address) */
    isContractReady: boolean;
    /** Refetch the balance */
    refetch: () => void;
}

/**
 * Hook to read agent balance from the AgentVault smart contract
 * 
 * @example
 * ```tsx
 * const { balance, isLoading, refetch } = useAgentVaultBalance({ 
 *   agentId: 'abc-123-def',
 *   refetchInterval: 10000 // refresh every 10s
 * });
 * ```
 */
export function useAgentVaultBalance({
    agentId,
    refetchInterval = 10000
}: UseAgentVaultBalanceOptions): UseAgentVaultBalanceResult {
    const { address, isConnected } = useAccount();

    // Check if the AgentVault contract is configured
    const isContractReady = isContractConfigured('AGENT_VAULT');

    // Convert UUID to bytes32 for contract call
    const agentIdBytes32 = agentId ? uuidToBytes32(agentId) : undefined;

    // Read balance from AgentVault contract
    const {
        data: rawBalance,
        isLoading,
        isError,
        error,
        refetch
    } = useReadContract({
        address: CONTRACTS.AGENT_VAULT.address,
        abi: AGENT_VAULT_ABI,
        functionName: 'getUserAgentBalance',
        args: address && agentIdBytes32 ? [address, agentIdBytes32] : undefined,
        query: {
            // Only enable if wallet connected, agent selected, and contract configured
            enabled: !!address && !!agentId && isContractReady && isConnected,
            // Refetch at specified interval
            refetchInterval: refetchInterval,
            // Refetch when window regains focus
            refetchOnWindowFocus: true,
        },
    });

    // Convert raw balance (6 decimals) to human-readable USDC amount
    const balance = rawBalance
        ? Number(rawBalance) / 10 ** CONTRACTS.USDC.decimals
        : 0;

    return {
        balance,
        rawBalance,
        isLoading,
        isError,
        error: error as Error | null,
        isContractReady,
        refetch,
    };
}
