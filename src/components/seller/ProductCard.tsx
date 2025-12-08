import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarketplaceProduct } from '@/types/seller';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProductCardProps {
  product: MarketplaceProduct;
  onBuyClick: (product: MarketplaceProduct) => void;
}

import { CATEGORY_STYLES } from '@/lib/utils/seller';

export function ProductCard({ product, onBuyClick }: ProductCardProps) {
  const { t } = useLanguage();
  const style = CATEGORY_STYLES[product.category] || CATEGORY_STYLES.other;

  // Mock tags based on description or category
  const tags = ['4K HDR', '5 Perfiles', 'Sin Anuncios'].slice(0, 2);

  return (
    <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group bg-white dark:bg-slate-900 rounded-3xl">
      {/* Product Image or Colored Header */}
      <div className={`h-32 relative flex items-center justify-center ${!product.imageUrl ? style.bg : 'bg-slate-100 dark:bg-slate-800'}`}>
        <Badge className="absolute top-3 right-3 bg-green-100 text-green-700 hover:bg-green-200 border-none font-bold text-[10px] uppercase tracking-wider z-10">
          STOCK ONLINE
        </Badge>

        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="text-6xl font-black text-white opacity-90">
            {style.label}
          </div>
        )}
      </div>

      <CardContent className="p-5">
        <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-2 line-clamp-1">{product.name}</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, i) => (
            <span key={i} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium px-2.5 py-1 rounded-md">
              {tag}
            </span>
          ))}
        </div>

        {/* Duration Badge */}
        {product.durationDays !== undefined && (
          <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl mb-4 w-fit">
            <span className="px-3 py-1 bg-white dark:bg-slate-700 shadow-sm rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {product.durationDays === 0 ? t('provider.products.durations.lifetime') :
                product.durationDays === 30 ? t('provider.products.durations.1month') :
                  product.durationDays === 90 ? t('provider.products.durations.3months') :
                    product.durationDays === 180 ? t('provider.products.durations.6months') :
                      product.durationDays === 365 ? t('provider.products.durations.1year') :
                        `${product.durationDays} ${t('common.days') || 'days'}`}
            </span>
          </div>
        )}

        <div className="flex items-end justify-between mt-2">
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            ${product.price}
          </div>
          <Button
            onClick={() => onBuyClick(product)}
            className="h-10 w-10 rounded-full p-0 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
