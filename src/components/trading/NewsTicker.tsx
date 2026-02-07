import { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source_id: string;
}

const NEWS_API_KEY = 'pub_3208b8ccb1274bff8e17c2596d8e642a';

// Cache news in localStorage to save API credits
const CACHE_KEY = 'clawtrader_news_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes to save API credits

const getCachedNews = (): { news: NewsItem[]; timestamp: number } | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Ignore cache errors
  }
  return null;
};

const setCachedNews = (news: NewsItem[]) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ news, timestamp: Date.now() }));
  } catch {
    // Ignore cache errors
  }
};

const FALLBACK_NEWS: NewsItem[] = [
  { title: 'Bitcoin continues to show strength above key support levels', link: '#', pubDate: new Date().toISOString(), source_id: 'crypto' },
  { title: 'Ethereum staking yields remain attractive for long-term holders', link: '#', pubDate: new Date().toISOString(), source_id: 'ethereum' },
  { title: 'Institutional adoption of digital assets accelerates globally', link: '#', pubDate: new Date().toISOString(), source_id: 'market' },
  { title: 'DeFi protocols report steady growth in total value locked', link: '#', pubDate: new Date().toISOString(), source_id: 'defi' },
  { title: 'Layer 2 solutions see increased transaction volumes', link: '#', pubDate: new Date().toISOString(), source_id: 'technology' },
];

export function NewsTicker() {
  const [news, setNews] = useState<NewsItem[]>(FALLBACK_NEWS);
  const [isLoading, setIsLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Prevent multiple fetches
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchNews = async () => {
      // Check cache first to save API credits
      const cached = getCachedNews();
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setNews(cached.news);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        const response = await fetch(
          `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&q=crypto%20OR%20bitcoin%20OR%20ethereum&language=en&category=business,technology`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch news');
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const newsItems = data.results.slice(0, 8);
          setNews(newsItems);
          setCachedNews(newsItems);
        }
      } catch (err) {
        console.error('News fetch error:', err);
        // Use fallback - already set as default
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (news.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-hidden bg-muted/20 border-y border-border/50 py-2.5">
      <div className="relative flex overflow-hidden">
        <div className="animate-marquee flex whitespace-nowrap">
          {news.map((item, index) => (
            <a
              key={`${item.title}-${index}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mx-8 text-xs hover:text-primary transition-colors"
            >
              <span className="text-primary mr-2 font-bold">•</span>
              <span className="text-muted-foreground hover:text-foreground transition-colors">
                {item.title}
              </span>
              <span className="text-muted-foreground/50 ml-2 text-[10px] italic">
                {item.source_id}
              </span>
            </a>
          ))}
        </div>
        <div className="animate-marquee2 absolute top-0 flex whitespace-nowrap">
          {news.map((item, index) => (
            <a
              key={`${item.title}-dup-${index}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mx-8 text-xs hover:text-primary transition-colors"
            >
              <span className="text-primary mr-2 font-bold">•</span>
              <span className="text-muted-foreground hover:text-foreground transition-colors">
                {item.title}
              </span>
              <span className="text-muted-foreground/50 ml-2 text-[10px] italic">
                {item.source_id}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
