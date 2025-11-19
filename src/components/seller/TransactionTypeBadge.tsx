import { Badge } from '@/components/ui/badge';
import { ArrowDown, ArrowUp, ArrowLeftRight } from 'lucide-react';
import { WalletTransactionType } from '@/types/seller';

interface TransactionTypeBadgeProps {
  type: WalletTransactionType;
  className?: string;
}

export function TransactionTypeBadge({ type, className }: TransactionTypeBadgeProps) {
  switch (type) {
    case 'credit':
      return (
        <Badge variant="default" className={`bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ${className}`}>
          <ArrowDown className="h-3 w-3 mr-1" />
          Credit
        </Badge>
      );
    case 'debit':
      return (
        <Badge variant="default" className={`bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 ${className}`}>
          <ArrowUp className="h-3 w-3 mr-1" />
          Debit
        </Badge>
      );
    case 'transfer':
      return (
        <Badge variant="default" className={`bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ${className}`}>
          <ArrowLeftRight className="h-3 w-3 mr-1" />
          Transfer
        </Badge>
      );
    default:
      return null;
  }
}
