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
import { formatCurrency } from '@/lib/utils/seller';
import { ShoppingCart, User } from 'lucide-react';
import { PurchaseConfirmDialog } from './PurchaseConfirmDialog';

interface ProductDetailsDialogProps {
  product: MarketplaceProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailsDialog({
  product,
  isOpen,
  onClose,
}: ProductDetailsDialogProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  if (!product) return null;

  const handlePurchaseClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmClose = () => {
    setShowConfirmDialog(false);
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <CategoryBadge category={product.category} />
              <DialogTitle>{product.name}</DialogTitle>
            </div>
            <DialogDescription className="flex items-center gap-1 text-xs">
              <User className="h-3 w-3" />
              Provided by {product.providerName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">
                {product.description}
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-1">Price</h4>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(product.price)}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-1">Category</h4>
                <CategoryBadge category={product.category} />
              </div>
            </div>

            <Separator />

            <div className="bg-muted/50 p-4 rounded-md">
              <h4 className="text-sm font-semibold mb-2">What you'll receive:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Account email address</li>
                <li>Account password</li>
                <li>Additional account details (if applicable)</li>
                <li>Instant access after purchase</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handlePurchaseClick}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Purchase Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PurchaseConfirmDialog
        product={product}
        isOpen={showConfirmDialog}
        onClose={handleConfirmClose}
      />
    </>
  );
}
