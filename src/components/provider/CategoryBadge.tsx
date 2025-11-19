import { Badge } from '@/components/ui/badge';
import { ProductCategory } from '@/types/provider';
import { cn } from '@/lib/utils';
import {
  Play,
  Music,
  Film,
  Sparkles,
  Package,
  Youtube,
  Tag,
} from 'lucide-react';

interface CategoryBadgeProps {
  category: ProductCategory;
  className?: string;
  showIcon?: boolean;
}

export function CategoryBadge({
  category,
  className,
  showIcon = true,
}: CategoryBadgeProps) {
  const config = {
    netflix: {
      label: 'Netflix',
      icon: Play,
      className: 'bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-500/20',
    },
    spotify: {
      label: 'Spotify',
      icon: Music,
      className: 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20',
    },
    hbo: {
      label: 'HBO',
      icon: Film,
      className: 'bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 border-purple-500/20',
    },
    disney: {
      label: 'Disney+',
      icon: Sparkles,
      className: 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/20',
    },
    prime: {
      label: 'Prime Video',
      icon: Package,
      className: 'bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20 border-cyan-500/20',
    },
    youtube: {
      label: 'YouTube',
      icon: Youtube,
      className: 'bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-500/20',
    },
    other: {
      label: 'Other',
      icon: Tag,
      className: 'bg-gray-500/10 text-gray-700 hover:bg-gray-500/20 border-gray-500/20',
    },
  };

  const { label, icon: Icon, className: variantClass } = config[category];

  return (
    <Badge className={cn(variantClass, className)} variant="outline">
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}
