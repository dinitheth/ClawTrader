import { useEffect, useRef, memo, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface TradingViewChartProps {
  symbol?: string;
  interval?: string;
  theme?: 'light' | 'dark';
  height?: number;
  autosize?: boolean;
}

function TradingViewChartComponent({
  symbol = 'BINANCE:BTCUSDT',
  interval = '15',
  theme = 'dark',
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string>(`tradingview_${Math.random().toString(36).substring(7)}`);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);
    setError(null);

    // Clear previous widget
    containerRef.current.innerHTML = '';

    // Create container div with unique ID
    const widgetContainer = document.createElement('div');
    widgetContainer.id = widgetIdRef.current;
    widgetContainer.style.height = '100%';
    widgetContainer.style.width = '100%';
    containerRef.current.appendChild(widgetContainer);

    // Create script element
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    
    // Widget configuration - use container_id properly
    const config = {
      autosize: true,
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      withdateranges: true,
      details: true,
      studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
      container_id: widgetIdRef.current,
    };
    
    script.innerHTML = JSON.stringify(config);

    script.onload = () => {
      setIsLoading(false);
    };

    script.onerror = () => {
      setError('Unable to load chart. Please refresh.');
      setIsLoading(false);
    };

    widgetContainer.appendChild(script);

    // Timeout fallback
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 8000);

    return () => {
      clearTimeout(timeout);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, interval, theme]);

  return (
    <div className="tradingview-widget-container rounded-lg overflow-hidden border border-border relative h-full w-full min-h-[300px]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">Loading chart...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10 gap-2">
          <AlertCircle className="w-6 h-6 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}
      <div 
        ref={containerRef} 
        className="h-full w-full"
        style={{ minHeight: '300px' }}
      />
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartComponent);
