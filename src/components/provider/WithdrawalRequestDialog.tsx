'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRequestWithdrawal } from '@/lib/hooks/useProviderEarnings';
import { withdrawalSchema, WithdrawalInput } from '@/lib/validations/product';
import { DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface WithdrawalRequestDialogProps {
  availableBalance: number;
  trigger?: React.ReactNode;
}

export function WithdrawalRequestDialog({
  availableBalance,
  trigger,
}: WithdrawalRequestDialogProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const requestWithdrawal = useRequestWithdrawal();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    setError,
  } = useForm<WithdrawalInput>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      paymentMethod: 'paypal',
    },
  });

  const paymentMethod = watch('paymentMethod');
  const amount = watch('amount');

  const onSubmit = async (data: WithdrawalInput) => {
    // Additional validation: check if amount exceeds balance
    if (data.amount > availableBalance) {
      setError('amount', {
        type: 'manual',
        message: t('provider.withdrawal.amountError').replace('{amount}', `$${availableBalance.toFixed(2)}`),
      });
      return;
    }

    try {
      await requestWithdrawal.mutateAsync(data);
      setOpen(false);
      reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getPaymentDetailsPlaceholder = () => {
    switch (paymentMethod) {
      case 'paypal':
        return t('provider.withdrawal.paypalPlaceholder');
      case 'bank_transfer':
        return t('provider.withdrawal.bankPlaceholder');
      case 'crypto':
        return t('provider.withdrawal.cryptoPlaceholder');
      default:
        return t('provider.withdrawal.defaultPlaceholder');
    }
  };

  const getPaymentDetailsLabel = () => {
    switch (paymentMethod) {
      case 'paypal':
        return t('provider.withdrawal.paypalEmailLabel');
      case 'bank_transfer':
        return t('provider.withdrawal.bankDetailsLabel');
      case 'crypto':
        return t('provider.withdrawal.cryptoAddressLabel');
      default:
        return t('provider.withdrawal.paymentDetailsLabel');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <DollarSign className="h-4 w-4 mr-2" />
            {t('provider.withdrawal.title')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('provider.withdrawal.title')}</DialogTitle>
          <DialogDescription>
            {t('provider.withdrawal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-muted rounded-lg mb-4">
          <p className="text-sm text-muted-foreground">{t('provider.withdrawal.availableBalance')}</p>
          <p className="text-2xl font-bold">
            ${availableBalance.toFixed(2)}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              {t('provider.withdrawal.amountLabel')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="10"
              max={availableBalance}
              placeholder={t('provider.withdrawal.amountPlaceholder')}
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
            {amount && amount <= availableBalance && (
              <p className="text-xs text-muted-foreground">
                {t('provider.withdrawal.receiveNote').replace('{amount}', `$${amount.toFixed(2)}`)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              {t('provider.withdrawal.paymentMethodLabel')} <span className="text-red-500">*</span>
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) =>
                setValue('paymentMethod', value as any, {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder={t('provider.withdrawal.paymentMethodPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paypal">{t('provider.withdrawal.paypal')}</SelectItem>
                <SelectItem value="bank_transfer">{t('provider.withdrawal.bankTransfer')}</SelectItem>
                <SelectItem value="crypto">{t('provider.withdrawal.crypto')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-sm text-red-500">
                {errors.paymentMethod.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDetails">
              {getPaymentDetailsLabel()} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="paymentDetails"
              placeholder={getPaymentDetailsPlaceholder()}
              {...register('paymentDetails')}
            />
            {errors.paymentDetails && (
              <p className="text-sm text-red-500">
                {errors.paymentDetails.message}
              </p>
            )}
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              {t('provider.withdrawal.note')}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t('provider.withdrawal.cancel')}
            </Button>
            <Button type="submit" disabled={requestWithdrawal.isPending}>
              {requestWithdrawal.isPending
                ? t('provider.withdrawal.submitting')
                : t('provider.withdrawal.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
