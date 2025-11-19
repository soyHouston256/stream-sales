import { Badge } from '@/components/ui/badge';
import { DisputeStatus } from '@/types/conciliator';

interface DisputeStatusBadgeProps {
  status: DisputeStatus;
}

export function DisputeStatusBadge({ status }: DisputeStatusBadgeProps) {
  const getStatusConfig = (status: DisputeStatus) => {
    switch (status) {
      case 'open':
        return {
          label: 'Open',
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
        };
      case 'under_review':
        return {
          label: 'Under Review',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
        };
      case 'resolved':
        return {
          label: 'Resolved',
          className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
        };
      case 'closed':
        return {
          label: 'Closed',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge className={config.className} variant="outline">
      {config.label}
    </Badge>
  );
}
