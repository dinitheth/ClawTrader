export async function fetchWithProxy(targetUrl: string, options: RequestInit = {}): Promise<Response> {
    const proxies = [
        (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
        (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
    ];

    let lastError: any;

    for (const proxy of proxies) {
        try {
            const proxyUrl = proxy(targetUrl);
            const response = await fetch(proxyUrl, {
                ...options,
                signal: options.signal || AbortSignal.timeout(5000) // 5s timeout per proxy
            });

            if (response.ok) {
                return response;
            }

            // If 403/429/500, try next proxy
            console.warn(`Proxy failed: ${proxyUrl} -> ${response.status}`);
            lastError = new Error(`Proxy returned ${response.status}`);
        } catch (err) {
            console.warn(`Proxy error: ${err}`);
            lastError = err;
        }
    }

    throw lastError || new Error('All proxies failed');
}
