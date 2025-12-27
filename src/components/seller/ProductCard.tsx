import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MarketplaceProduct } from '@/types/seller';
import { Plus, User, Users, Package, Key } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CATEGORY_STYLES } from '@/lib/utils/seller';

interface ProductCardProps {
  product: MarketplaceProduct;
  onBuyClick: (product: MarketplaceProduct) => void;
}

export function ProductCard({ product, onBuyClick }: ProductCardProps) {
  const { t } = useLanguage();
  const style = CATEGORY_STYLES[product.category] || CATEGORY_STYLES.other;

  // Get counts from detailed fields or fallback to old fields
  const totalFullAccounts = product.totalFullAccounts ?? 0;
  const availableFullAccounts = product.availableFullAccounts ?? 0;
  const totalProfileSlots = product.totalProfileSlots ?? 0;
  const availableProfileSlots = product.availableProfileSlots ?? 0;
  const totalLicenses = product.totalLicenses ?? 0;
  const availableLicenses = product.availableLicenses ?? 0;

  // Total available for purchase
  const totalAvailable = availableFullAccounts + availableProfileSlots + availableLicenses;
  const hasFullAccounts = totalFullAccounts > 0;
  const hasProfileSlots = totalProfileSlots > 0;
  const hasLicenses = totalLicenses > 0;

  return (
    <Card className="overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group bg-white dark:bg-slate-900 rounded-3xl">
      {/* Product Image or Colored Header */}
      <div className={`h-32 relative flex items-center justify-center ${!product.imageUrl ? style.bg : 'bg-slate-100 dark:bg-slate-800'}`}>
        {/* Stock Badge */}
        <Badge className={`absolute top-3 right-3 border-none font-bold text-[10px] uppercase tracking-wider z-10 ${totalAvailable > 0
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-red-100 text-red-700 hover:bg-red-200'
          }`}>
          {totalAvailable > 0 ? 'STOCK ONLINE' : 'AGOTADO'}
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
        <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-1 line-clamp-1">{product.name}</h3>

        {/* Product Description */}
        {product.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{product.description}</p>
        )}

        {/* Stock Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Full Accounts Badge */}
          {hasFullAccounts && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 ${availableFullAccounts > 0
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
              <User size={12} />
              {availableFullAccounts}/{totalFullAccounts} {t('seller.productCard.fullAccounts') || 'Cuentas'}
            </span>
          )}

          {/* Profile Slots Badge */}
          {hasProfileSlots && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 ${availableProfileSlots > 0
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
              <Users size={12} />
              {availableProfileSlots}/{totalProfileSlots} {t('seller.productCard.profiles') || 'Perfiles'}
            </span>
          )}

          {/* Licenses Badge */}
          {hasLicenses && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1 ${availableLicenses > 0
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
              <Key size={12} />
              {availableLicenses}/{totalLicenses} {t('seller.productCard.licenses') || 'Licencias'}
            </span>
          )}

          {/* If no inventory at all, show empty hint */}
          {!hasFullAccounts && !hasProfileSlots && !hasLicenses && (
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
              <Package size={12} />
              {t('seller.productCard.noStock') || 'Sin stock'}
            </span>
          )}
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
            disabled={totalAvailable <= 0}
            className="h-14 w-14 rounded-2xl p-0 bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-xl shadow-indigo-300/50 dark:shadow-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <Plus className="h-7 w-7 stroke-[3]" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
