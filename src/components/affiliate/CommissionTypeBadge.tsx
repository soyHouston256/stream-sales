import { Badge } from '@/components/ui/badge';
import { CommissionType } from '@/types/affiliate';

interface CommissionTypeBadgeProps {
  type: CommissionType;
}

export function CommissionTypeBadge({ type }: CommissionTypeBadgeProps) {
  const variants = {
    registration: {
      variant: 'default' as const,
      className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      label: 'Registration',
    },
    sale: {
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      label: 'Sale',
    },
    bonus: {
      variant: 'default' as const,
      className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      label: 'Bonus',
    },
  };

  // eslint-disable-next-line security/detect-object-injection
  const config = variants[type];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
