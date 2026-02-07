import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface SymbolSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const TRADING_PAIRS = [
  { symbol: 'BINANCE:BTCUSDT', label: 'BTC/USDT', icon: '₿' },
  { symbol: 'BINANCE:ETHUSDT', label: 'ETH/USDT', icon: 'Ξ' },
  { symbol: 'BINANCE:SOLUSDT', label: 'SOL/USDT', icon: '◎' },
  { symbol: 'BINANCE:AVAXUSDT', label: 'AVAX/USDT', icon: '🔺' },
  { symbol: 'BINANCE:NEARUSDT', label: 'NEAR/USDT', icon: '◈' },
  { symbol: 'BINANCE:ARBUSDT', label: 'ARB/USDT', icon: '🔷' },
  { symbol: 'BINANCE:OPUSDT', label: 'OP/USDT', icon: '🔴' },
];

export function SymbolSelector({ value, onValueChange }: SymbolSelectorProps) {
  const selectedPair = TRADING_PAIRS.find(p => p.symbol === value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px] bg-background/50">
        <SelectValue>
          {selectedPair && (
            <span className="flex items-center gap-2">
              <span>{selectedPair.icon}</span>
              <span>{selectedPair.label}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {TRADING_PAIRS.map((pair) => (
          <SelectItem key={pair.symbol} value={pair.symbol}>
            <span className="flex items-center gap-2">
              <span>{pair.icon}</span>
              <span>{pair.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
