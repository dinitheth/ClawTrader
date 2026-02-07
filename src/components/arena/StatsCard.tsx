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
        return 'border-primary/30 bg-primary/5';
      case 'secondary':
        return 'border-secondary/30 bg-secondary/5';
      case 'accent':
        return 'border-accent/30 bg-accent/5';
      default:
        return 'border-border';
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary/20 text-primary';
      case 'secondary':
        return 'bg-secondary/20 text-secondary';
      case 'accent':
        return 'bg-accent/20 text-accent';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Card className={`card-glow ${getVariantStyles()}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-display font-bold">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
            {trend && (
              <p className={`text-xs font-medium ${trend.isPositive ? 'text-success' : 'text-destructive'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from last hour
              </p>
            )}
          </div>
          <div className={`p-2.5 rounded-lg ${getIconStyles()}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
