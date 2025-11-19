import { Badge } from '@/components/ui/badge';
import { ProductStatus } from '@/types/provider';
import { cn } from '@/lib/utils';

interface ProductStatusBadgeProps {
  status: ProductStatus;
  className?: string;
}

export function ProductStatusBadge({ status, className }: ProductStatusBadgeProps) {
  const variants = {
    available: 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20',
    reserved: 'bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20 border-yellow-500/20',
    sold: 'bg-gray-500/10 text-gray-700 hover:bg-gray-500/20 border-gray-500/20',
  };

  const labels = {
    available: 'Available',
    reserved: 'Reserved',
    sold: 'Sold',
  };

  return (
    <Badge className={cn(variants[status], className)} variant="outline">
      {labels[status]}
    </Badge>
  );
}
