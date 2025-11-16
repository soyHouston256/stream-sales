import { Badge } from '@/components/ui/badge';
import { PurchaseStatus } from '@/types/seller';

interface PurchaseStatusBadgeProps {
  status: PurchaseStatus;
  className?: string;
}

export function PurchaseStatusBadge({ status, className }: PurchaseStatusBadgeProps) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="default" className={`bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 ${className}`}>
          Pending
        </Badge>
      );
    case 'completed':
      return (
        <Badge variant="default" className={`bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ${className}`}>
          Completed
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="default" className={`bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 ${className}`}>
          Failed
        </Badge>
      );
    case 'refunded':
      return (
        <Badge variant="default" className={`bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ${className}`}>
          Refunded
        </Badge>
      );
    default:
      return null;
  }
}
