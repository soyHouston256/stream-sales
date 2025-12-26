'use client';

import React from 'react';

import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MarketplaceProduct } from '@/types/seller';
import { useWalletBalance } from '@/lib/hooks/useSellerWallet';
import { useCreatePurchase } from '@/lib/hooks/usePurchases';
import { formatCurrency, validatePurchase, CATEGORY_STYLES } from '@/lib/utils/seller';
import { AlertCircle, CheckCircle, Wallet, ArrowRight, CreditCard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { useToast } from '@/lib/hooks/useToast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Phone } from 'lucide-react';

type UserType = 'seller' | 'affiliate';

interface PurchaseConfirmDialogProps {
  product: MarketplaceProduct | null;
  isOpen: boolean;
  onClose: () => void;
  userType?: UserType;
}

export function PurchaseConfirmDialog({
  product,
  isOpen,
  onClose,
  userType = 'seller',
}: PurchaseConfirmDialogProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: walletData, isLoading: walletLoading } = useWalletBalance(userType);
  const createPurchase = useCreatePurchase(userType);

  // Customer data state for third-party recipient
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');

  if (!product) return null;

  const validation = walletData
    ? validatePurchase(walletData.balance, product.price)
    : null;

  const style = CATEGORY_STYLES[product.category] || CATEGORY_STYLES.other;

  const handleConfirm = async () => {
    try {
      await createPurchase.mutateAsync({
        productId: product.id,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      });
      toast({
        title: t('seller.marketplace.success.title'),
        description: t('seller.marketplace.success.description').replace('{name}', product.name),
        variant: 'default',
        className: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      });
      onClose();

      // Redirect to purchases page after successful purchase
      const purchasesRoute = userType === 'affiliate'
        ? '/dashboard/affiliate/purchases'
        : '/dashboard/seller/purchases';

      // Small delay to allow the toast to be visible before redirect
      setTimeout(() => {
        router.push(purchasesRoute);
      }, 500);
    } catch (error) {
      // Error is handled by the mutation hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-none shadow-2xl">
        {/* Header with Category Style */}
        <div className={`h-24 ${style.bg} relative flex items-center justify-center w-full`}>
          <div className="text-4xl font-black text-white opacity-90">
            {style.label}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="px-6 pt-2 pb-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">{t('seller.marketplace.purchaseConfirm.title')}</DialogTitle>
            <DialogDescription className="text-center">
              {t('seller.marketplace.purchaseConfirm.description').replace('{name}', '')}
              <span className="font-semibold text-foreground block mt-1 text-lg">{product.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Product Summary Card */}
            <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full ${style.bg} flex items-center justify-center text-white font-bold shadow-sm`}>
                  {style.label}
                </div>
                <div>
                  <p className="text-sm font-medium leading-none mb-1">{t('seller.marketplace.purchaseConfirm.product')}</p>
                  <CategoryBadge category={product.category} />
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium leading-none mb-1">{t('seller.marketplace.purchaseConfirm.price')}</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(product.price)}</p>
              </div>
            </div>

            {/* Customer Data Section */}
            <div className="bg-muted/30 p-4 rounded-xl border border-border/50 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground">
                {t('seller.marketplace.purchaseConfirm.customerData') || 'Datos del Cliente (Opcional)'}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('seller.marketplace.purchaseConfirm.customerName') || 'Nombre del cliente'}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('seller.marketplace.purchaseConfirm.customerPhone') || '+51 999 888 777'}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Wallet Balance Logic */}
            {walletLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : walletData && validation ? (
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      <span className="text-sm">{t('seller.marketplace.purchaseConfirm.currentBalance')}</span>
                    </div>
                    <span className="font-mono font-medium">{formatCurrency(walletData.balance)}</span>
                  </div>

                  <div className="relative flex items-center justify-center py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dashed border-border"></div>
                    </div>
                    <div className="relative bg-card px-2 text-muted-foreground">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm">{t('seller.marketplace.purchaseConfirm.balanceAfter')}</span>
                    </div>
                    <span className={`font-mono font-bold text-lg ${validation.canPurchase ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {formatCurrency(validation.balanceAfter)}
                    </span>
                  </div>
                </div>

                {!validation.canPurchase && (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('seller.marketplace.purchaseConfirm.insufficientBalance')}</AlertTitle>
                    <AlertDescription>
                      {t('seller.marketplace.purchaseConfirm.insufficientBalanceDesc')}
                    </AlertDescription>
                  </Alert>
                )}

                {validation.canPurchase && validation.warning && (
                  <Alert variant="warning" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('seller.marketplace.purchaseConfirm.lowBalance')}</AlertTitle>
                    <AlertDescription>{validation.warning}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="ghost" onClick={onClose} disabled={createPurchase.isPending} className="w-full sm:w-auto">
              {t('seller.marketplace.purchaseConfirm.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!validation?.canPurchase || createPurchase.isPending}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              {createPurchase.isPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  {t('seller.marketplace.purchaseConfirm.processing')}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('seller.marketplace.purchaseConfirm.confirm')}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
