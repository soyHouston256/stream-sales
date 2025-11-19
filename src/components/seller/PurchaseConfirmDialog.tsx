'use client';

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
import { formatCurrency, validatePurchase } from '@/lib/utils/seller';
import { AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PurchaseConfirmDialogProps {
  product: MarketplaceProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PurchaseConfirmDialog({
  product,
  isOpen,
  onClose,
}: PurchaseConfirmDialogProps) {
  const { data: walletData, isLoading: walletLoading } = useWalletBalance();
  const createPurchase = useCreatePurchase();

  if (!product) return null;

  const validation = walletData
    ? validatePurchase(walletData.balance, product.price)
    : null;

  const handleConfirm = async () => {
    try {
      await createPurchase.mutateAsync({ productId: product.id });
      onClose();
    } catch (error) {
      // Error is handled by mutation
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
          <DialogDescription>
            Please confirm your purchase of {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-md space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Product:</span>
              <span className="text-sm">{product.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Price:</span>
              <span className="text-sm font-bold text-primary">
                {formatCurrency(product.price)}
              </span>
            </div>
          </div>

          {walletLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : walletData && validation ? (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Current Balance:
                  </span>
                  <span className="text-sm font-bold">
                    {formatCurrency(walletData.balance)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Balance After Purchase:</span>
                  <span className={`text-sm font-bold ${validation.canPurchase ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(validation.balanceAfter)}
                  </span>
                </div>
              </div>

              {!validation.canPurchase && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Insufficient Balance</AlertTitle>
                  <AlertDescription>
                    You don't have enough balance to complete this purchase.
                    Please add funds to your wallet.
                  </AlertDescription>
                </Alert>
              )}

              {validation.canPurchase && validation.warning && (
                <Alert variant="warning">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Low Balance Warning</AlertTitle>
                  <AlertDescription>{validation.warning}</AlertDescription>
                </Alert>
              )}

              {validation.canPurchase && !validation.warning && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Ready to Purchase</AlertTitle>
                  <AlertDescription>
                    You have sufficient balance to complete this purchase.
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createPurchase.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!validation?.canPurchase || createPurchase.isPending}
          >
            {createPurchase.isPending ? 'Processing...' : 'Confirm Purchase'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
