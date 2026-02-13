/**
 * Etherscan API Service for fetching transaction history
 * Uses Etherscan API V2 which supports Monad Testnet
 */

import { CONTRACTS } from './contracts';

// Monad Testnet chain ID
const MONAD_TESTNET_CHAIN_ID = 10143;

// Etherscan API V2 base URL
const ETHERSCAN_API_BASE = 'https://api.etherscan.io/v2/api';

// Get API key from environment
const getApiKey = () => import.meta.env.VITE_ETHERSCAN_API_KEY || '';

export interface EtherscanTransaction {
    hash: string;
    timeStamp: string;
    from: string;
    to: string;
    value: string;
    methodId?: string;
    functionName?: string;
    isError: string;
    txreceipt_status: string;
    input: string;
    blockNumber: string;
    gasUsed: string;
}

export interface ParsedTrade {
    id: string;
    action: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW';
    symbol: string;
    amount: number;
    price: number;
    timestamp: string;
    txHash: string;
    pnl: number;
}

// Method IDs for AgentVaultV2 functions
const METHOD_IDS = {
    EXECUTE_BUY: '0x', // Will be filled after checking
    EXECUTE_SELL: '0x',
    DEPOSIT: '0x',
    WITHDRAW: '0x',
};

// Token addresses to symbols
const TOKEN_SYMBOLS: Record<string, string> = {
    [CONTRACTS.TEST_BTC?.address?.toLowerCase() || '']: 'tBTC',
    [CONTRACTS.TEST_ETH?.address?.toLowerCase() || '']: 'tETH',
    [CONTRACTS.TEST_SOL?.address?.toLowerCase() || '']: 'tSOL',
};

/**
 * Fetch transactions for an address from Etherscan API V2
 */
export async function fetchTransactionHistory(
    address: string,
    contractAddress?: string
): Promise<EtherscanTransaction[]> {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.warn('Etherscan API key not configured');
        return [];
    }

    try {
        const params = new URLSearchParams({
            chainid: MONAD_TESTNET_CHAIN_ID.toString(),
            module: 'account',
            action: 'txlist',
            address: contractAddress || address,
            startblock: '0',
            endblock: '99999999',
            page: '1',
            offset: '50', // Last 50 transactions
            sort: 'desc',
            apikey: apiKey,
        });

        const response = await fetch(`${ETHERSCAN_API_BASE}?${params}`);
        const data = await response.json();

        if (data.status === '1' && Array.isArray(data.result)) {
            return data.result;
        } else if (data.message === 'No transactions found') {
            return [];
        } else {
            console.warn('Etherscan API response:', data);
            return [];
        }
    } catch (error) {
        console.error('Error fetching from Etherscan:', error);
        return [];
    }
}

/**
 * Fetch ERC20 token transfers for an address
 */
export async function fetchTokenTransfers(
    address: string
): Promise<EtherscanTransaction[]> {
    const apiKey = getApiKey();
    if (!apiKey) {
        return [];
    }

    try {
        const params = new URLSearchParams({
            chainid: MONAD_TESTNET_CHAIN_ID.toString(),
            module: 'account',
            action: 'tokentx',
            address: address,
            startblock: '0',
            endblock: '99999999',
            page: '1',
            offset: '50',
            sort: 'desc',
            apikey: apiKey,
        });

        const response = await fetch(`${ETHERSCAN_API_BASE}?${params}`);
        const data = await response.json();

        if (data.status === '1' && Array.isArray(data.result)) {
            return data.result;
        }
        return [];
    } catch (error) {
        console.error('Error fetching token transfers:', error);
        return [];
    }
}

/**
 * Parse raw transactions into readable trade format
 */
export function parseTransactionsToTrades(
    transactions: EtherscanTransaction[],
    agentVaultAddress: string,
    userAddress: string
): ParsedTrade[] {
    const trades: ParsedTrade[] = [];
    const vaultLower = agentVaultAddress.toLowerCase();
    const userLower = userAddress.toLowerCase();

    for (const tx of transactions) {
        // Only include successful transactions
        if (tx.isError === '1' || tx.txreceipt_status !== '1') continue;

        // Check if transaction involves AgentVault
        if (tx.to?.toLowerCase() !== vaultLower && tx.from?.toLowerCase() !== vaultLower) continue;

        const input = tx.input || '';
        const methodId = input.slice(0, 10);

        let action: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW' = 'BUY';
        let symbol = 'USDC';

        // Parse action from function signature
        if (input.includes('executeBuy') || methodId === '0x6a627842') {
            action = 'BUY';
            symbol = 'tBTC'; // Will need to parse from logs for accurate token
        } else if (input.includes('executeSell')) {
            action = 'SELL';
            symbol = 'tBTC';
        } else if (input.includes('deposit')) {
            action = 'DEPOSIT';
            symbol = 'USDC';
        } else if (input.includes('withdraw')) {
            action = 'WITHDRAW';
            symbol = 'USDC';
        } else {
            // Try to detect from function name if available
            if (tx.functionName?.toLowerCase().includes('buy')) action = 'BUY';
            else if (tx.functionName?.toLowerCase().includes('sell')) action = 'SELL';
            else if (tx.functionName?.toLowerCase().includes('deposit')) action = 'DEPOSIT';
            else if (tx.functionName?.toLowerCase().includes('withdraw')) action = 'WITHDRAW';
            else continue; // Skip unknown transactions
        }

        trades.push({
            id: tx.hash,
            action,
            symbol,
            amount: 0, // Would need to parse from logs
            price: 0,
            timestamp: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
            txHash: tx.hash,
            pnl: 0,
        });
    }

    return trades;
}

/**
 * Get trade history for an agent from blockchain
 * Falls back to localStorage if API fails
 */
export async function getAgentTradeHistory(
    userAddress: string,
    agentId: string
): Promise<ParsedTrade[]> {
    const storageKey = `trades_${agentId}_${userAddress}`;

    try {
        // Fetch from AgentVaultV2 transactions
        const agentVaultAddress = CONTRACTS.AGENT_VAULT?.address;
        if (!agentVaultAddress) {
            throw new Error('AgentVault address not configured');
        }

        const transactions = await fetchTransactionHistory(userAddress, agentVaultAddress);
        const trades = parseTransactionsToTrades(transactions, agentVaultAddress, userAddress);

        // Also save to localStorage as backup
        if (trades.length > 0) {
            localStorage.setItem(storageKey, JSON.stringify(trades));
        }

        return trades;
    } catch (error) {
        console.error('Error fetching trade history:', error);

        // Try to load from localStorage
        const cached = localStorage.getItem(storageKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                return [];
            }
        }

        return [];
    }
}

/**
 * Save a new trade to localStorage (for immediate display before blockchain confirms)
 */
export function saveTradeToLocalStorage(
    agentId: string,
    userAddress: string,
    trade: ParsedTrade
): void {
    const storageKey = `trades_${agentId}_${userAddress}`;

    try {
        const existing = localStorage.getItem(storageKey);
        const trades: ParsedTrade[] = existing ? JSON.parse(existing) : [];

        // Add new trade at the beginning
        trades.unshift(trade);

        // Keep only last 50 trades
        const trimmed = trades.slice(0, 50);

        localStorage.setItem(storageKey, JSON.stringify(trimmed));
    } catch (error) {
        console.error('Error saving trade to localStorage:', error);
    }
}

/**
 * Load trades from localStorage
 */
export function loadTradesFromLocalStorage(
    agentId: string,
    userAddress: string
): ParsedTrade[] {
    const storageKey = `trades_${agentId}_${userAddress}`;

    try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (error) {
        console.error('Error loading trades from localStorage:', error);
    }

    return [];
}

/**
 * Get block explorer URL for a transaction
 */
export function getExplorerTxUrl(txHash: string): string {
    return `https://testnet.monadexplorer.com/tx/${txHash}`;
}
