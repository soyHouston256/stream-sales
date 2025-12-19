import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'indigo' | 'emerald';
  description?: string;
  isLoading?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
  description,
  isLoading = false,
}: StatCardProps) {
  const colorStyles = {
    blue: "from-blue-500 to-blue-600",
    red: "from-rose-500 to-rose-600",
    green: "from-emerald-500 to-emerald-600",
    purple: "from-violet-500 to-violet-600",
    orange: "from-orange-500 to-orange-600",
    indigo: "from-indigo-500 to-indigo-600",
    emerald: "from-emerald-500 to-emerald-600",
  };

  const bgStyles = {
    blue: "bg-blue-50 dark:bg-blue-950/30",
    red: "bg-rose-50 dark:bg-rose-950/30",
    green: "bg-emerald-50 dark:bg-emerald-950/30",
    purple: "bg-violet-50 dark:bg-violet-950/30",
    orange: "bg-orange-50 dark:bg-orange-950/30",
    indigo: "bg-indigo-50 dark:bg-indigo-950/30",
    emerald: "bg-emerald-50 dark:bg-emerald-950/30",
  };

  return (
    // eslint-disable-next-line security/detect-object-injection
    <Card className={cn("relative overflow-hidden border-0 shadow-lg", bgStyles[color])}>
      {/* eslint-disable-next-line security/detect-object-injection */}
      <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 bg-gradient-to-br", colorStyles[color])} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
            {isLoading ? (
              <div className="h-9 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <h3 className="text-3xl font-black">{value}</h3>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {/* eslint-disable-next-line security/detect-object-injection */}
          <div className={cn("p-3 rounded-2xl bg-gradient-to-br shadow-lg text-white", colorStyles[color])}>
            <Icon size={24} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
