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
  Tv,
  Key,
  Video,
  BookOpen,
  Cpu,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();

  const config: Record<ProductCategory, { label: string; icon: any; className: string }> = {
    streaming: {
      label: t('provider.wizard.categories.streaming'),
      icon: Tv,
      className: 'bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-500/20',
    },
    license: {
      label: t('provider.wizard.categories.license'),
      icon: Key,
      className: 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/20',
    },
    course: {
      label: t('provider.wizard.categories.course'),
      icon: Video,
      className: 'bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 border-purple-500/20',
    },
    ebook: {
      label: t('provider.wizard.categories.ebook'),
      icon: BookOpen,
      className: 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-500/20',
    },
    ai: {
      label: t('provider.wizard.categories.ai'),
      icon: Cpu,
      className: 'bg-teal-500/10 text-teal-700 hover:bg-teal-500/20 border-teal-500/20',
    },
    netflix: {
      label: t('provider.wizard.categories.netflix'),
      icon: Play,
      className: 'bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-500/20',
    },
    spotify: {
      label: t('provider.wizard.categories.spotify'),
      icon: Music,
      className: 'bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20',
    },
    hbo: {
      label: t('provider.wizard.categories.hbo'),
      icon: Film,
      className: 'bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 border-purple-500/20',
    },
    disney: {
      label: t('provider.wizard.categories.disney'),
      icon: Sparkles,
      className: 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/20',
    },
    prime: {
      label: t('provider.wizard.categories.prime'),
      icon: Package,
      className: 'bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20 border-cyan-500/20',
    },
    youtube: {
      label: t('provider.wizard.categories.youtube'),
      icon: Youtube,
      className: 'bg-red-500/10 text-red-700 hover:bg-red-500/20 border-red-500/20',
    },
    other: {
      label: t('provider.wizard.categories.other'),
      icon: Tag,
      className: 'bg-gray-500/10 text-gray-700 hover:bg-gray-500/20 border-gray-500/20',
    },
  };

  const { label, icon: Icon, className: variantClass } = config[category] || config.other;

  return (
    <Badge className={cn(variantClass, className)} variant="outline">
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}
