import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EnhancedStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'danger';
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  showTrend?: boolean;
  chartData?: { value: number }[];
}

const variantStyles = {
  default: {
    light: 'bg-gradient-to-br from-slate-50 to-slate-100',
    dark: 'dark:bg-gradient-to-br dark:from-slate-900/50 dark:to-slate-800/50',
    icon: 'text-slate-600 dark:text-slate-400',
  },
  success: {
    light: 'bg-gradient-to-br from-green-50 to-emerald-100',
    dark: 'dark:bg-gradient-to-br dark:from-green-950/30 dark:to-emerald-900/30',
    icon: 'text-green-600 dark:text-green-400',
  },
  warning: {
    light: 'bg-gradient-to-br from-yellow-50 to-orange-100',
    dark: 'dark:bg-gradient-to-br dark:from-yellow-950/30 dark:to-orange-900/30',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  info: {
    light: 'bg-gradient-to-br from-blue-50 to-cyan-100',
    dark: 'dark:bg-gradient-to-br dark:from-blue-950/30 dark:to-cyan-900/30',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  danger: {
    light: 'bg-gradient-to-br from-red-50 to-rose-100',
    dark: 'dark:bg-gradient-to-br dark:from-red-950/30 dark:to-rose-900/30',
    icon: 'text-red-600 dark:text-red-400',
  },
};

export function EnhancedStatsCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading = false,
  variant = 'default',
  trend,
  showTrend = false,
  chartData,
}: EnhancedStatsCardProps) {
  const styles = variantStyles[variant];

  if (isLoading) {
    return (
      <Card className="transition-all duration-300 hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'transition-all duration-300',
        'hover:shadow-lg hover:-translate-y-1',
        'border-0 shadow-sm',
        styles.light,
        styles.dark
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn('p-2 rounded-lg bg-white/50 dark:bg-black/20', 'transition-transform duration-200 hover:scale-110')}>
          <Icon className={cn('h-4 w-4', styles.icon)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>

        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}

        {showTrend && trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.direction === 'up' ? (
              <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
            )}
            <span
              className={cn(
                'text-xs font-medium',
                trend.direction === 'up'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {trend.value}
            </span>
          </div>
        )}

        {chartData && chartData.length > 0 && (
          <div className="h-[40px] w-full mt-3 opacity-50">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={false}
                  className={styles.icon}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
