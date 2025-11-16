import { Badge } from '@/components/ui/badge';
import { RechargeStatus } from '@/types/seller';

interface RechargeStatusBadgeProps {
  status: RechargeStatus;
  className?: string;
}

export function RechargeStatusBadge({ status, className }: RechargeStatusBadgeProps) {
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
    case 'cancelled':
      return (
        <Badge variant="default" className={`bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 ${className}`}>
          Cancelled
        </Badge>
      );
    default:
      return null;
  }
}
