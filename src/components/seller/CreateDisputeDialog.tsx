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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateDispute } from '@/lib/hooks/useCreateDispute';
import { toast } from '@/lib/hooks';

interface CreateDisputeDialogProps {
  purchaseId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userType?: 'seller' | 'provider';
}

export function CreateDisputeDialog({
  purchaseId,
  productName,
  isOpen,
  onClose,
  onSuccess,
  userType = 'seller',
}: CreateDisputeDialogProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const createDispute = useCreateDispute();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar longitud mínima
    if (reason.trim().length < 10) {
      toast({
        title: t('common.error'),
        description: t('disputes.minLength'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await createDispute.mutateAsync({
        purchaseId,
        reason: reason.trim(),
        userType,
      });

      toast({
        title: t('common.success'),
        description: t('disputes.createSuccess'),
      });

      // Limpiar y cerrar
      setReason('');
      onClose();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: t('disputes.createError'),
        description: error.message || t('common.error'),
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    if (!createDispute.isPending) {
      setReason('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('disputes.openDispute')}</DialogTitle>
            <DialogDescription>
              {productName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Warning Alert */}
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{t('disputes.warning')}:</strong> {t('disputes.warningMessage')}
              </AlertDescription>
            </Alert>

            {/* Info Alert */}
            <Alert>
              <AlertDescription>
                {t('disputes.disputeInfo')}
              </AlertDescription>
            </Alert>

            {/* Reason Textarea */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                {t('disputes.reasonLabel')} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder={t('disputes.reasonPlaceholder')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={6}
                required
                minLength={10}
                disabled={createDispute.isPending}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {t('disputes.reasonHelp')} ({reason.length}/10 {t('common.min')})
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createDispute.isPending}
            >
              {t('disputes.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createDispute.isPending || reason.trim().length < 10}
            >
              {createDispute.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('disputes.submitting')}
                </>
              ) : (
                t('disputes.submit')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
