'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Purchase } from '@/types/seller';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { PurchaseStatusBadge } from './PurchaseStatusBadge';
import { formatCurrency, copyToClipboard, parseAccountDetails } from '@/lib/utils/seller';
import { Copy, Check, Mail, Key, FileJson, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface PurchaseDetailsDialogProps {
  purchase: Purchase | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PurchaseDetailsDialog({
  purchase,
  isOpen,
  onClose,
}: PurchaseDetailsDialogProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  if (!purchase) return null;

  const handleCopyEmail = async () => {
    const success = await copyToClipboard(purchase.product.accountEmail, 'Email');
    if (success) {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const handleCopyPassword = async () => {
    const success = await copyToClipboard(purchase.product.accountPassword, 'Password');
    if (success) {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const accountDetails = parseAccountDetails(purchase.product.accountDetails);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CategoryBadge category={purchase.product.category} />
            <PurchaseStatusBadge status={purchase.status} />
          </div>
          <DialogTitle>{purchase.product.name}</DialogTitle>
          <DialogDescription>Purchase ID: {purchase.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account Credentials */}
          <div className="bg-primary/5 p-4 rounded-lg border-2 border-primary/20">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Key className="h-4 w-4" />
              Account Credentials
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-background p-3 rounded-md">
                <div className="flex items-center gap-2 flex-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium font-mono">
                      {purchase.product.accountEmail}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyEmail}
                  className="ml-2"
                >
                  {copiedEmail ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between bg-background p-3 rounded-md">
                <div className="flex items-center gap-2 flex-1">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Password</p>
                    <p className="text-sm font-medium font-mono">
                      {purchase.product.accountPassword}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyPassword}
                  className="ml-2"
                >
                  {copiedPassword ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Additional Account Details */}
          {accountDetails && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                Additional Details
              </h4>
              <div className="bg-muted/50 p-3 rounded-md">
                <pre className="text-xs font-mono overflow-x-auto">
                  {JSON.stringify(accountDetails, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <Separator />

          {/* Product Information */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Product Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description:</span>
                <span className="text-right max-w-md">
                  {purchase.product.description}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-semibold">
                  {formatCurrency(purchase.amount)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Provider Information */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Provider Information
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span>{purchase.provider.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span>{purchase.provider.email}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Purchase Metadata */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Purchase Details
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purchase Date:</span>
                <span>{format(new Date(purchase.createdAt), 'PPp')}</span>
              </div>
              {purchase.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span>{format(new Date(purchase.completedAt), 'PPp')}</span>
                </div>
              )}
              {purchase.refundedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refunded:</span>
                  <span>{format(new Date(purchase.refundedAt), 'PPp')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <PurchaseStatusBadge status={purchase.status} />
              </div>
            </div>
          </div>

          {/* TODO: Add dispute button when dispute feature is ready */}
          {/* {purchase.status === 'completed' && !purchase.dispute && (
            <Button variant="outline" className="w-full">
              <AlertCircle className="h-4 w-4 mr-2" />
              Open Dispute
            </Button>
          )} */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
