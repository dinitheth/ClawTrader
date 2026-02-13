/**
 * Robust CORS proxy fetcher with parallel racing.
 * Fires all proxies at once and returns whichever succeeds first.
 * This is MUCH faster than sequential failover.
 */

const PROXIES = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

const PROXY_TIMEOUT = 6000; // 6s max per proxy

export async function fetchWithProxy(targetUrl: string, options: RequestInit = {}): Promise<Response> {
    // Race all proxies in parallel — first successful response wins
    const proxyPromises = PROXIES.map(async (proxy, i) => {
        const proxyUrl = proxy(targetUrl);
        try {
            const response = await fetch(proxyUrl, {
                ...options,
                signal: options.signal || AbortSignal.timeout(PROXY_TIMEOUT),
            });

            if (response.ok) {
                return response;
            }
            // Non-ok response — reject so next proxy can win
            throw new Error(`proxy-${i}: ${response.status}`);
        } catch (err) {
            throw err; // Let Promise.any handle it
        }
    });

    try {
        // Promise.any resolves with the FIRST fulfilled promise
        return await Promise.any(proxyPromises);
    } catch (aggregateError) {
        // All proxies failed
        throw new Error('All CORS proxies failed. Check your network connection.');
    }
}
