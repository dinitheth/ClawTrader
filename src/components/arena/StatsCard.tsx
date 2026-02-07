import { Card, CardContent } from "@/components/ui/card";
import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'secondary' | 'accent';
}

const StatsCard = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend,
  variant = 'default' 
}: StatsCardProps) => {
  const getIconStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary/10 text-primary';
      case 'secondary':
        return 'bg-secondary text-secondary-foreground';
      case 'accent':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className="rounded-2xl border border-border transition-all duration-200 hover:shadow-sm">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium truncate">
              {title}
            </p>
            <p className="text-2xl md:text-3xl font-semibold tabular-nums tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
            {trend && (
              <p className={`text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${getIconStyles()}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
