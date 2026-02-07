import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface IntervalSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const INTERVALS = [
  { value: '1', label: '1m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '60', label: '1H' },
  { value: '240', label: '4H' },
  { value: 'D', label: '1D' },
];

export function IntervalSelector({ value, onValueChange }: IntervalSelectorProps) {
  return (
    <ToggleGroup type="single" value={value} onValueChange={(v) => v && onValueChange(v)}>
      {INTERVALS.map((interval) => (
        <ToggleGroupItem 
          key={interval.value} 
          value={interval.value}
          className="text-xs px-3"
        >
          {interval.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
