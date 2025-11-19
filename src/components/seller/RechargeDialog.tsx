'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateRecharge } from '@/lib/hooks/useSellerWallet';
import { rechargeSchema, RechargeInput } from '@/lib/validations/seller';
import { Plus, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/seller';

interface RechargeDialogProps {
  currentBalance?: string;
  trigger?: React.ReactNode;
}

export function RechargeDialog({ currentBalance, trigger }: RechargeDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const createRecharge = useCreateRecharge();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<RechargeInput>({
    resolver: zodResolver(rechargeSchema),
    defaultValues: {
      paymentMethod: 'mock',
    },
  });

  const paymentMethod = watch('paymentMethod');
  const amount = watch('amount');

  const onSubmit = async (data: RechargeInput) => {
    try {
      await createRecharge.mutateAsync(data);
      setOpen(false);
      reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('seller.recharge.addFunds')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('seller.recharge.title')}</DialogTitle>
          <DialogDescription>
            {t('seller.recharge.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {currentBalance && (
            <div className="bg-muted/50 p-3 rounded-md flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                {t('seller.recharge.currentBalance')}:
              </span>
              <span className="text-sm font-bold">
                {formatCurrency(currentBalance)}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">
              {t('seller.recharge.amountLabel')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="10"
              max="10000"
              placeholder={t('seller.recharge.amountPlaceholder')}
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {t('seller.recharge.amountHelp')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              {t('seller.recharge.paymentMethodLabel')} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) =>
                setValue('paymentMethod', value as any, { shouldValidate: true })
              }
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder={t('seller.recharge.paymentMethodPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">{t('seller.recharge.mockPayment')}</SelectItem>
                <SelectItem value="credit_card">{t('seller.recharge.creditCard')}</SelectItem>
                <SelectItem value="paypal">{t('seller.recharge.paypal')}</SelectItem>
                <SelectItem value="bank_transfer">{t('seller.recharge.bankTransfer')}</SelectItem>
                <SelectItem value="crypto">{t('seller.recharge.crypto')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-sm text-red-500">{errors.paymentMethod.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDetails">
              {t('seller.recharge.paymentDetailsLabel')}
            </Label>
            <Textarea
              id="paymentDetails"
              placeholder={t('seller.recharge.paymentDetailsPlaceholder')}
              rows={3}
              {...register('paymentDetails')}
            />
            <p className="text-xs text-muted-foreground">
              {t('seller.recharge.paymentDetailsHelp')}
            </p>
          </div>

          {amount && amount >= 10 && (
            <div className="bg-primary/5 p-3 rounded-md border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('seller.recharge.youWillReceive')}</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t('seller.recharge.cancel')}
            </Button>
            <Button type="submit" disabled={createRecharge.isPending}>
              {createRecharge.isPending ? t('seller.recharge.requesting') : t('seller.recharge.requestRecharge')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
