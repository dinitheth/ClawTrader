/**
 * React hook for fetching and using real-time token prices
 * Automatically refreshes every 60 seconds to respect CoinGecko rate limits
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchPrices, getTokensWithPrices, type TokenInfo } from '../lib/priceService';

const REFRESH_INTERVAL_MS = 60 * 1000; // 60 seconds

export function useTokenPrices() {
    const [tokens, setTokens] = useState<TokenInfo[]>(getTokensWithPrices());
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const refreshPrices = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            await fetchPrices();
            setTokens(getTokensWithPrices());
            setLastUpdate(new Date());
        } catch (err) {
            setError('Failed to fetch prices');
            console.error('[useTokenPrices] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch and periodic refresh
    useEffect(() => {
        refreshPrices();

        const interval = setInterval(refreshPrices, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [refreshPrices]);

    return {
        tokens,
        isLoading,
        lastUpdate,
        error,
        refreshPrices,
    };
}

/**
 * Get a single token's price
 */
export function useTokenPrice(symbol: 'tBTC' | 'tETH' | 'tSOL') {
    const { tokens, isLoading, error } = useTokenPrices();
    const token = tokens.find(t => t.symbol === symbol);

    return {
        price: token?.price ?? 0,
        priceFormatted: token?.priceFormatted ?? '$0',
        isLoading,
        error,
    };
}
