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
    iconContainer: 'bg-blue-600 text-white shadow-lg shadow-blue-500/20',
    // Subtle gradient from dark to slightly tinted dark
    background: 'bg-gradient-to-r from-[#0f111a] to-[#0f111a] hover:to-[#1e293b] border-blue-500/10',
    // Large, soft, diffused glow (Ambience)
    decorativeBlob: 'bg-blue-600/20 blur-[80px]',
  },
  success: {
    iconContainer: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20',
    background: 'bg-gradient-to-r from-[#0f111a] to-[#0f111a] hover:to-[#064e3b]/20 border-emerald-500/10',
    decorativeBlob: 'bg-emerald-500/20 blur-[80px]',
  },
  warning: {
    iconContainer: 'bg-orange-500 text-white shadow-lg shadow-orange-500/20',
    background: 'bg-gradient-to-r from-[#0f111a] to-[#0f111a] hover:to-[#431407]/20 border-orange-500/10',
    decorativeBlob: 'bg-orange-500/20 blur-[80px]',
  },
  info: {
    iconContainer: 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20',
    background: 'bg-gradient-to-r from-[#0f111a] to-[#0f111a] hover:to-[#312e81]/20 border-indigo-500/10',
    decorativeBlob: 'bg-indigo-500/20 blur-[80px]',
  },
  danger: {
    iconContainer: 'bg-red-500 text-white shadow-lg shadow-red-500/20',
    background: 'bg-gradient-to-r from-[#0f111a] to-[#0f111a] hover:to-[#450a0a]/20 border-red-500/10',
    decorativeBlob: 'bg-red-500/20 blur-[80px]',
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
  // eslint-disable-next-line security/detect-object-injection
  const styles = variantStyles[variant] || variantStyles.default;

  if (isLoading) {
    return (
      <Card className="transition-all duration-300 hover:shadow-lg bg-card/50">
        <div className="flex items-center justify-between p-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-14 w-14 rounded-2xl" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'transition-all duration-300 relative overflow-hidden group',
        'hover:shadow-lg hover:-translate-y-1',
        'backdrop-blur-sm',
        styles.background
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      {/* Decorative Blob/Shadow behind icon - Localized glow */}
      <div
        className={cn(
          "absolute -right-8 -top-8 h-32 w-32 rounded-full blur-[50px] pointer-events-none transition-opacity duration-500",
          styles.decorativeBlob
        )}
      />

      <div className="flex items-start justify-between p-6 relative z-10">
        <div className="space-y-1 z-10">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <h4 className="text-3xl font-bold tracking-tight mt-1">{value}</h4>

          {description && (
            <p className="text-xs text-muted-foreground mt-1 font-medium bg-secondary/10 px-2.5 py-1 rounded-full w-fit">
              {description}
            </p>
          )}

          {showTrend && trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <span
                className={cn(
                  'flex items-center text-xs font-semibold px-2 py-0.5 rounded-full',
                  trend.direction === 'up'
                    ? 'text-green-500 bg-green-500/10'
                    : 'text-red-500 bg-red-500/10'
                )}
              >
                {trend.direction === 'up' ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {trend.value}
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'flex items-center justify-center h-14 w-14 rounded-2xl shadow-lg transition-transform group-hover:scale-110 duration-300',
            styles.iconContainer
          )}
        >
          <Icon className={cn('h-7 w-7', styles.icon)} />
        </div>
      </div>

      {chartData && chartData.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-10 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="currentColor"
                strokeWidth={4}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
