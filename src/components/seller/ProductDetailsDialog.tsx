'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MarketplaceProduct } from '@/types/seller';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { formatCurrency, CATEGORY_STYLES } from '@/lib/utils/seller';
import { ShoppingCart, User, ShieldCheck, Zap, Clock } from 'lucide-react';
import { PurchaseConfirmDialog } from './PurchaseConfirmDialog';
import { useLanguage } from '@/contexts/LanguageContext';

type UserType = 'seller' | 'affiliate';

interface ProductDetailsDialogProps {
  product: MarketplaceProduct | null;
  isOpen: boolean;
  onClose: () => void;
  isGuest?: boolean;
  userType?: UserType;
}

export function ProductDetailsDialog({
  product,
  isOpen,
  onClose,
  isGuest = false,
  userType = 'seller',
}: ProductDetailsDialogProps) {
  const { t } = useLanguage();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!product) return null;

  const style = CATEGORY_STYLES[product.category] || CATEGORY_STYLES.other;

  const handlePurchaseClick = () => {
    if (isGuest) {
      window.location.href = '/login?returnTo=/';
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85dvh] flex flex-col p-0 gap-0">
          {/* Header with Category Style or Image */}
          <div className={`h-32 relative flex items-center justify-center w-full shrink-0 ${!product.imageUrl ? style.bg : 'bg-slate-100 dark:bg-slate-800'}`}>
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-6xl font-black text-white opacity-90">
                {style.label}
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <DialogHeader className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CategoryBadge category={product.category} />
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {t('seller.marketplace.productDetails.providedBy')} {product.providerName}
                    </span>
                  </div>
                  <DialogTitle className="text-2xl font-bold">{product.name}</DialogTitle>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-primary">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </div>
            </DialogHeader>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 py-4 border-y border-border/50">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{t('seller.marketplace.trust.securePayment')}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{t('seller.marketplace.trust.instantDelivery')}</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium">{t('seller.marketplace.trust.support247')}</span>
              </div>
            </div>

            {/* Duration Section */}
            {product.durationDays !== undefined && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{t('seller.marketplace.productDetails.duration') || 'Tiempo de compra'}</h4>
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <div className="px-4 py-2 bg-yellow-500/20 border-2 border-yellow-500 rounded-lg text-center">
                    <span className="text-lg font-bold text-yellow-500">
                      {product.durationDays === 0 ? t('provider.products.durations.lifetime') :
                        product.durationDays === 30 ? t('provider.products.durations.1month') :
                          product.durationDays === 90 ? t('provider.products.durations.3months') :
                            product.durationDays === 180 ? t('provider.products.durations.6months') :
                              product.durationDays === 365 ? t('provider.products.durations.1year') :
                                `${product.durationDays} ${t('common.days') || 'días'}`}
                    </span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(product.price)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">{t('seller.marketplace.productDetails.description')}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-xl border border-border/50">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  {t('seller.marketplace.productDetails.whatYouReceive')}
                </h4>
                <ul className="grid gap-2">
                  {(() => {
                    // Use custom delivery details if provided
                    const customDetails = product.deliveryDetails as string[] | undefined;
                    if (customDetails && customDetails.length > 0) {
                      return customDetails.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {item}
                        </li>
                      ));
                    }

                    // Fallback: category-based defaults
                    const categoryDefaults: Record<string, string[]> = {
                      license: [
                        t('seller.marketplace.productDetails.licenseKey') || 'Clave de licencia',
                        t('seller.marketplace.productDetails.activationInstructions') || 'Instrucciones de activación',
                        t('seller.marketplace.productDetails.instantAccess'),
                      ],
                      streaming: [
                        t('seller.marketplace.productDetails.accountEmail'),
                        t('seller.marketplace.productDetails.accountPassword'),
                        t('seller.marketplace.productDetails.instantAccess'),
                      ],
                      course: [
                        t('seller.marketplace.productDetails.accessLink') || 'Enlace de acceso',
                        t('seller.marketplace.productDetails.courseMaterials') || 'Materiales del curso',
                        t('seller.marketplace.productDetails.instantAccess'),
                      ],
                      ebook: [
                        t('seller.marketplace.productDetails.downloadLink') || 'Enlace de descarga',
                        t('seller.marketplace.productDetails.instantAccess'),
                      ],
                    };

                    const defaults = categoryDefaults[product.category] || [
                      t('seller.marketplace.productDetails.accountEmail'),
                      t('seller.marketplace.productDetails.accountPassword'),
                      t('seller.marketplace.productDetails.additionalDetails'),
                      t('seller.marketplace.productDetails.instantAccess'),
                    ];

                    return defaults.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {item}
                      </li>
                    ));
                  })()}
                </ul>
              </div>
            </div>
          </div>

          <div className="p-6 pt-4 border-t mt-auto bg-background">
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                {t('seller.marketplace.productDetails.cancel')}
              </Button>
              <Button onClick={handlePurchaseClick} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700">
                <ShoppingCart className="h-4 w-4 mr-2" />
                {isGuest ? t('seller.marketplace.productDetails.loginToPurchase') : t('seller.marketplace.productDetails.purchaseNow')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {!isGuest && (
        <PurchaseConfirmDialog
          product={product}
          isOpen={showConfirmDialog}
          onClose={handleConfirmClose}
          userType={userType}
        />
      )}
    </>
  );
}
