import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for news (persists across warm function invocations)
let cachedNews: { data: any[]; timestamp: number } | null = null;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const now = Date.now();

    // Return cached news if still valid
    if (cachedNews && (now - cachedNews.timestamp) < CACHE_DURATION) {
      console.log('Returning cached news');
      return new Response(JSON.stringify({ 
        news: cachedNews.data,
        cached: true,
        cachedAt: new Date(cachedNews.timestamp).toISOString(),
        expiresIn: Math.round((CACHE_DURATION - (now - cachedNews.timestamp)) / 1000)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('NEWSDATA_API_KEY');
    if (!apiKey) {
      throw new Error('NEWSDATA_API_KEY not configured');
    }

    console.log('Fetching fresh news from NewsData.io');
    
    const response = await fetch(
      `https://newsdata.io/api/1/news?apikey=${apiKey}&q=crypto%20OR%20bitcoin%20OR%20ethereum&language=en&category=business,technology`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NewsData API error:', response.status, errorText);
      
      // If we have stale cache, return it
      if (cachedNews) {
        console.log('Returning stale cached news due to API error');
        return new Response(JSON.stringify({ 
          news: cachedNews.data,
          cached: true,
          stale: true,
          error: 'API error, returning cached data'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`NewsData API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('No news results returned');
    }

    // Extract and format news items
    const newsItems = data.results.slice(0, 10).map((item: any) => ({
      title: item.title,
      link: item.link,
      source: item.source_id || 'crypto',
      pubDate: item.pubDate,
    }));

    // Update cache
    cachedNews = { data: newsItems, timestamp: now };

    return new Response(JSON.stringify({ 
      news: newsItems,
      cached: false,
      fetchedAt: new Date(now).toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    
    // Return fallback news on error
    const fallbackNews = [
      { title: 'Bitcoin continues to show strength above key support levels', source: 'market', link: '#' },
      { title: 'Ethereum staking yields remain attractive for long-term holders', source: 'ethereum', link: '#' },
      { title: 'Institutional adoption of digital assets accelerates globally', source: 'crypto', link: '#' },
      { title: 'DeFi protocols report steady growth in total value locked', source: 'defi', link: '#' },
      { title: 'Layer 2 solutions see increased transaction volumes', source: 'technology', link: '#' },
    ];

    return new Response(JSON.stringify({ 
      news: fallbackNews,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
