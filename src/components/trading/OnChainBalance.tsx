import { useAgentVaultBalance } from '@/hooks/useAgentVaultBalance';
import { Loader2 } from 'lucide-react';

interface OnChainBalanceProps {
    agentId: string;
    className?: string;
    showLabel?: boolean;
}

/**
 * Displays the on-chain AgentVault balance for an agent
 * Fetches real balance from the blockchain
 */
export function OnChainBalance({ agentId, className = '', showLabel = false }: OnChainBalanceProps) {
    const { balance, isLoading, isContractReady } = useAgentVaultBalance({
        agentId,
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    if (isLoading || !isContractReady) {
        return (
            <span className={className}>
                <Loader2 className="w-3 h-3 animate-spin inline" />
            </span>
        );
    }

    return (
        <span className={className}>
            {showLabel && <span className="text-muted-foreground">Balance: </span>}
            {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-[10px] md:text-xs text-muted-foreground ml-1">USDC</span>
        </span>
    );
}
