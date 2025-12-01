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

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  netflix: { bg: 'bg-red-900', text: 'text-red-100', label: 'N' },
  spotify: { bg: 'bg-green-900', text: 'text-green-100', label: 'S' },
  hbo: { bg: 'bg-purple-900', text: 'text-purple-100', label: 'H' },
  disney: { bg: 'bg-blue-900', text: 'text-blue-100', label: 'D' },
  prime: { bg: 'bg-blue-800', text: 'text-blue-100', label: 'P' },
  youtube: { bg: 'bg-red-800', text: 'text-red-100', label: 'Y' },
  ai: { bg: 'bg-teal-900', text: 'text-teal-100', label: 'AI' },
  other: { bg: 'bg-slate-800', text: 'text-slate-100', label: '?' },
};

export function ProductCard({ product, onBuyClick }: ProductCardProps) {
  const { t } = useLanguage();
  const style = CATEGORY_STYLES[product.category] || CATEGORY_STYLES.other;

  // Mock tags based on description or category
  const tags = ['4K HDR', '5 Perfiles', 'Sin Anuncios'].slice(0, 2);

  return (
    <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group bg-white dark:bg-slate-900 rounded-3xl">
      {/* Colored Header */}
      <div className={`h-32 ${style.bg} relative flex items-center justify-center`}>
        <Badge className="absolute top-3 right-3 bg-green-100 text-green-700 hover:bg-green-200 border-none font-bold text-[10px] uppercase tracking-wider">
          STOCK ONLINE
        </Badge>
        <div className="text-6xl font-black text-white opacity-90">
          {style.label}
        </div>
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

        {/* Duration Selector Mock */}
        <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl mb-4 w-fit">
          <button className="px-3 py-1 bg-white dark:bg-slate-700 shadow-sm rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400">1M</button>
          <button className="px-3 py-1 text-slate-400 dark:text-slate-500 text-xs font-medium hover:text-slate-600 dark:hover:text-slate-300">6M</button>
          <button className="px-3 py-1 text-slate-400 dark:text-slate-500 text-xs font-medium hover:text-slate-600 dark:hover:text-slate-300">12M</button>
        </div>

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
