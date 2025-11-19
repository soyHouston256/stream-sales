import { Badge } from '@/components/ui/badge';

type ReferralStatus = 'active' | 'inactive' | 'suspended';

interface ReferralStatusBadgeProps {
  status: ReferralStatus;
}

export function ReferralStatusBadge({ status }: ReferralStatusBadgeProps) {
  const variants = {
    active: {
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      label: 'Active',
    },
    inactive: {
      variant: 'default' as const,
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      label: 'Inactive',
    },
    suspended: {
      variant: 'default' as const,
      className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      label: 'Suspended',
    },
  };

  const config = variants[status];

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
