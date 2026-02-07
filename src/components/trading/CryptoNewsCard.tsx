import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Newspaper, ExternalLink, RefreshCw, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NewsItem {
  title: string;
  url: string;
  source: string;
  date: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

interface CryptoNewsCardProps {
  onNewsLoaded?: (news: NewsItem[]) => void;
}

export function CryptoNewsCard({ onNewsLoaded }: CryptoNewsCardProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('https://free-crypto-news.vercel.app/api/news');
      
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      
      const data = await response.json();
      
      // Parse and format the news data
      const formattedNews: NewsItem[] = (data.articles || data || [])
        .slice(0, 10)
        .map((item: any) => ({
          title: item.title || item.headline || 'Untitled',
          url: item.url || item.link || '#',
          source: item.source || item.publisher || 'Unknown',
          date: item.date || item.publishedAt || new Date().toISOString(),
          sentiment: analyzeSentiment(item.title || ''),
        }));
      
      setNews(formattedNews);
      setLastUpdated(new Date());
      onNewsLoaded?.(formattedNews);
    } catch (err) {
      console.error('News fetch error:', err);
      setError('Failed to load news');
      
      // Fallback to mock data for demo
      const mockNews: NewsItem[] = [
        {
          title: 'Bitcoin Approaches New All-Time High as Institutional Interest Surges',
          url: '#',
          source: 'CryptoNews',
          date: new Date().toISOString(),
          sentiment: 'bullish',
        },
        {
          title: 'Ethereum Layer 2 Solutions See Record Transaction Volume',
          url: '#',
          source: 'DeFi Daily',
          date: new Date().toISOString(),
          sentiment: 'bullish',
        },
        {
          title: 'Market Volatility Expected Ahead of Fed Decision',
          url: '#',
          source: 'Market Watch',
          date: new Date().toISOString(),
          sentiment: 'neutral',
        },
        {
          title: 'Major Exchange Reports Technical Issues During Peak Trading',
          url: '#',
          source: 'Exchange News',
          date: new Date().toISOString(),
          sentiment: 'bearish',
        },
        {
          title: 'DeFi Protocol Launches New Staking Mechanism',
          url: '#',
          source: 'DeFi Pulse',
          date: new Date().toISOString(),
          sentiment: 'bullish',
        },
      ];
      setNews(mockNews);
      setLastUpdated(new Date());
      onNewsLoaded?.(mockNews);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple sentiment analysis based on keywords
  const analyzeSentiment = (title: string): 'bullish' | 'bearish' | 'neutral' => {
    const bullishWords = ['surge', 'high', 'rally', 'gain', 'up', 'growth', 'record', 'bullish', 'rise', 'soar', 'breakout', 'moon', 'pump'];
    const bearishWords = ['crash', 'drop', 'fall', 'down', 'loss', 'bear', 'dip', 'plunge', 'decline', 'dump', 'warning', 'risk', 'fear'];
    
    const lowerTitle = title.toLowerCase();
    
    const bullishScore = bullishWords.filter(word => lowerTitle.includes(word)).length;
    const bearishScore = bearishWords.filter(word => lowerTitle.includes(word)).length;
    
    if (bullishScore > bearishScore) return 'bullish';
    if (bearishScore > bullishScore) return 'bearish';
    return 'neutral';
  };

  useEffect(() => {
    fetchNews();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="w-3 h-3 text-accent" />;
      case 'bearish':
        return <TrendingDown className="w-3 h-3 text-destructive" />;
      default:
        return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'bullish':
        return <Badge variant="outline" className="text-xs bg-accent/10 text-accent border-accent/30">Bullish</Badge>;
      case 'bearish':
        return <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">Bearish</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Neutral</Badge>;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-primary" />
            Crypto News Headlines
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={fetchNews}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Updated {formatTimeAgo(lastUpdated.toISOString())}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && news.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : error && news.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <p>{error}</p>
            <Button variant="link" size="sm" onClick={fetchNews}>
              Retry
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {news.map((item, index) => (
                <a
                  key={index}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/20 group"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-1 flex-shrink-0">
                      {getSentimentIcon(item.sentiment)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="truncate">{item.source}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(item.date)}</span>
                        {getSentimentBadge(item.sentiment)}
                      </div>
                    </div>
                    <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
                  </div>
                </a>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {/* Sentiment Summary */}
        {news.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Market Sentiment:</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-accent">
                  <TrendingUp className="w-3 h-3" />
                  {news.filter(n => n.sentiment === 'bullish').length}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Minus className="w-3 h-3" />
                  {news.filter(n => n.sentiment === 'neutral').length}
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <TrendingDown className="w-3 h-3" />
                  {news.filter(n => n.sentiment === 'bearish').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
