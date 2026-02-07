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
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'border-primary/20';
      case 'secondary':
        return 'border-secondary/20';
      case 'accent':
        return 'border-accent/20';
      default:
        return 'border-border';
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary/10 text-primary';
      case 'secondary':
        return 'bg-secondary/10 text-secondary';
      case 'accent':
        return 'bg-accent/10 text-accent';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className={`card-glow ${getVariantStyles()}`}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5 md:space-y-1 min-w-0 flex-1">
            <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className="text-lg md:text-2xl font-semibold tabular-nums">
              {value}
            </p>
            {subtitle && (
              <p className="text-[10px] md:text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
            {trend && (
              <p className={`text-[10px] md:text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className={`p-2 md:p-2.5 rounded-lg flex-shrink-0 ${getIconStyles()}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
