import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source_id: string;
}

const NEWS_API_KEY = 'pub_3208b8ccb1274bff8e17c2596d8e642a';

export function NewsTicker() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(
          `https://newsdata.io/api/1/news?apikey=${NEWS_API_KEY}&q=crypto%20OR%20bitcoin%20OR%20ethereum&language=en&category=business,technology`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch news');
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          setNews(data.results.slice(0, 10));
        } else {
          // Fallback news for demo
          setNews([
            { title: 'Bitcoin surges past key resistance levels', link: '#', pubDate: new Date().toISOString(), source_id: 'crypto' },
            { title: 'Ethereum staking rewards reach all-time high', link: '#', pubDate: new Date().toISOString(), source_id: 'ethereum' },
            { title: 'Major DeFi protocol announces expansion', link: '#', pubDate: new Date().toISOString(), source_id: 'defi' },
            { title: 'Institutional investors increase crypto holdings', link: '#', pubDate: new Date().toISOString(), source_id: 'market' },
            { title: 'New regulations boost crypto adoption globally', link: '#', pubDate: new Date().toISOString(), source_id: 'regulation' },
          ]);
        }
      } catch (err) {
        console.error('News fetch error:', err);
        // Set fallback news on error
        setNews([
          { title: 'Bitcoin surges past key resistance levels', link: '#', pubDate: new Date().toISOString(), source_id: 'crypto' },
          { title: 'Ethereum staking rewards reach all-time high', link: '#', pubDate: new Date().toISOString(), source_id: 'ethereum' },
          { title: 'Major DeFi protocol announces expansion', link: '#', pubDate: new Date().toISOString(), source_id: 'defi' },
          { title: 'Institutional investors increase crypto holdings', link: '#', pubDate: new Date().toISOString(), source_id: 'market' },
          { title: 'New regulations boost crypto adoption globally', link: '#', pubDate: new Date().toISOString(), source_id: 'regulation' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full overflow-hidden bg-muted/30 border-y border-border py-2">
        <div className="flex items-center justify-center text-xs text-muted-foreground">
          Loading crypto news...
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return null;
  }

  // Duplicate news array for seamless loop
  const duplicatedNews = [...news, ...news];

  return (
    <div className="w-full overflow-hidden bg-muted/20 border-y border-border/50 py-2">
      <div className="relative flex overflow-hidden">
        <div className="animate-marquee flex whitespace-nowrap">
          {duplicatedNews.map((item, index) => (
            <a
              key={`${item.title}-${index}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mx-6 text-xs hover:text-primary transition-colors"
            >
              <span className="text-primary mr-2">•</span>
              <span className="text-muted-foreground hover:text-foreground transition-colors">
                {item.title}
              </span>
              <span className="text-muted-foreground/50 ml-2 text-[10px]">
                {item.source_id}
              </span>
            </a>
          ))}
        </div>
        <div className="animate-marquee2 absolute top-0 flex whitespace-nowrap">
          {duplicatedNews.map((item, index) => (
            <a
              key={`${item.title}-dup-${index}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mx-6 text-xs hover:text-primary transition-colors"
            >
              <span className="text-primary mr-2">•</span>
              <span className="text-muted-foreground hover:text-foreground transition-colors">
                {item.title}
              </span>
              <span className="text-muted-foreground/50 ml-2 text-[10px]">
                {item.source_id}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
