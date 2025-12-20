import { LucideIcon, Inbox, Search, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: 'default' | 'search' | 'error';
  className?: string;
}

const variantConfig = {
  default: {
    icon: Inbox,
    iconColor: 'text-muted-foreground',
    containerClass: '',
  },
  search: {
    icon: Search,
    iconColor: 'text-blue-500/60',
    containerClass: '',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-destructive/60',
    containerClass: '',
  },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}: EmptyStateProps) {
  // eslint-disable-next-line security/detect-object-injection
  const config = variantConfig[variant];
  const Icon = icon || config.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        'transition-opacity duration-300 animate-in fade-in-50',
        config.containerClass,
        className
      )}
    >
      <div
        className={cn(
          'mb-4 rounded-full p-3 bg-muted/50',
          'transition-transform duration-300 hover:scale-105'
        )}
      >
        <Icon className={cn('h-12 w-12', config.iconColor)} />
      </div>

      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>

      {action && (
        <Button
          onClick={action.onClick}
          className="transition-transform duration-200 hover:scale-105"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
