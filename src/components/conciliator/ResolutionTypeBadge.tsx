import { Badge } from '@/components/ui/badge';
import { ResolutionType } from '@/types/conciliator';

interface ResolutionTypeBadgeProps {
  resolutionType: ResolutionType;
  partialRefundPercentage?: number;
}

export function ResolutionTypeBadge({ resolutionType, partialRefundPercentage }: ResolutionTypeBadgeProps) {
  const getResolutionConfig = (type: ResolutionType) => {
    switch (type) {
      case 'refund_seller':
        return {
          label: 'Refund Seller',
          className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
        };
      case 'favor_provider':
        return {
          label: 'Favor Provider',
          className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
        };
      case 'partial_refund':
        return {
          label: partialRefundPercentage !== undefined
            ? `Partial Refund (${partialRefundPercentage}%)`
            : 'Partial Refund',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
        };
      case 'no_action':
        return {
          label: 'No Action',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        };
    }
  };

  const config = getResolutionConfig(resolutionType);

  return (
    <Badge className={config.className} variant="outline">
      {config.label}
    </Badge>
  );
}
