/**
 * CoinGecko Price Service
 * Fetches real-time crypto prices with rate limiting (1 call/60s)
 * 
 * Free API rate limit: 10-30 calls/minute
 * We use 1 call/60s to be safe and cache results
 */

import { CONTRACTS } from './contracts';

// CoinGecko IDs for tokens
const COINGECKO_IDS = {
    tBTC: 'bitcoin',
    tETH: 'ethereum',
    tSOL: 'solana',
} as const;

// Cached prices with timestamps
interface PriceCache {
    prices: Record<string, number>;
    lastUpdate: number;
}

// Cache duration: 60 seconds
const CACHE_DURATION_MS = 60 * 1000;

let priceCache: PriceCache = {
    prices: {
        tBTC: 97000, // Default fallback prices
        tETH: 2700,
        tSOL: 203,
    },
    lastUpdate: 0,
};

/**
 * Fetch prices from CoinGecko API
 * Rate limited to 1 call per 60 seconds
 */
export async function fetchPrices(): Promise<Record<string, number>> {
    const now = Date.now();

    // Return cached prices if still valid
    if (now - priceCache.lastUpdate < CACHE_DURATION_MS) {
        console.log('[PriceService] Using cached prices');
        return priceCache.prices;
    }

    try {
        const ids = Object.values(COINGECKO_IDS).join(',');
        const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
            {
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            console.warn('[PriceService] API error, using cached prices');
            return priceCache.prices;
        }

        const data = await response.json();

        // Update cache
        priceCache = {
            prices: {
                tBTC: data.bitcoin?.usd ?? priceCache.prices.tBTC,
                tETH: data.ethereum?.usd ?? priceCache.prices.tETH,
                tSOL: data.solana?.usd ?? priceCache.prices.tSOL,
            },
            lastUpdate: now,
        };

        console.log('[PriceService] Updated prices:', priceCache.prices);
        return priceCache.prices;
    } catch (error) {
        console.error('[PriceService] Fetch error:', error);
        return priceCache.prices;
    }
}

/**
 * Get the current price for a token symbol
 */
export function getPrice(symbol: 'tBTC' | 'tETH' | 'tSOL'): number {
    return priceCache.prices[symbol];
}

/**
 * Get all current prices
 */
export function getAllPrices(): Record<string, number> {
    return { ...priceCache.prices };
}

/**
 * Convert price to USDC format for SimpleDEX (6 decimals)
 * Price is in USDC per 1 whole token
 */
export function priceToUSDC(price: number): bigint {
    return BigInt(Math.floor(price * 1_000_000)); // 6 decimals
}

/**
 * Get token addresses and prices for contract calls
 */
export function getTokenPricesForContract(): {
    tokens: `0x${string}`[];
    prices: bigint[];
} {
    return {
        tokens: [
            CONTRACTS.TEST_BTC.address,
            CONTRACTS.TEST_ETH.address,
            CONTRACTS.TEST_SOL.address,
        ],
        prices: [
            priceToUSDC(priceCache.prices.tBTC),
            priceToUSDC(priceCache.prices.tETH),
            priceToUSDC(priceCache.prices.tSOL),
        ],
    };
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
    if (price >= 1000) {
        return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Token info with current prices
 */
export interface TokenInfo {
    symbol: string;
    name: string;
    address: `0x${string}`;
    decimals: number;
    price: number;
    priceFormatted: string;
}

export function getTokensWithPrices(): TokenInfo[] {
    return [
        {
            symbol: 'tBTC',
            name: 'Test Bitcoin',
            address: CONTRACTS.TEST_BTC.address,
            decimals: CONTRACTS.TEST_BTC.decimals,
            price: priceCache.prices.tBTC,
            priceFormatted: formatPrice(priceCache.prices.tBTC),
        },
        {
            symbol: 'tETH',
            name: 'Test Ethereum',
            address: CONTRACTS.TEST_ETH.address,
            decimals: CONTRACTS.TEST_ETH.decimals,
            price: priceCache.prices.tETH,
            priceFormatted: formatPrice(priceCache.prices.tETH),
        },
        {
            symbol: 'tSOL',
            name: 'Test Solana',
            address: CONTRACTS.TEST_SOL.address,
            decimals: CONTRACTS.TEST_SOL.decimals,
            price: priceCache.prices.tSOL,
            priceFormatted: formatPrice(priceCache.prices.tSOL),
        },
    ];
}
