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
  height = 400,
  autosize = true,
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsLoading(true);
    setError(null);

    // Clear previous widget
    containerRef.current.innerHTML = '';

    // Create wrapper div for TradingView widget
    const widgetWrapper = document.createElement('div');
    widgetWrapper.className = 'tradingview-widget-container__widget';
    widgetWrapper.style.height = '100%';
    widgetWrapper.style.width = '100%';
    containerRef.current.appendChild(widgetWrapper);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
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
      studies: [
        'RSI@tv-basicstudies',
        'MASimple@tv-basicstudies',
        'MACD@tv-basicstudies',
      ],
      container_id: widgetWrapper.id,
    });

    script.onload = () => {
      setIsLoading(false);
    };

    script.onerror = () => {
      setError('Unable to load chart. Please refresh the page.');
      setIsLoading(false);
    };

    widgetWrapper.appendChild(script);

    // Timeout fallback
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => {
      clearTimeout(timeout);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, interval, theme]);

  return (
    <div className="tradingview-widget-container rounded-lg overflow-hidden border border-border relative" style={{ height: height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
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
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartComponent);
