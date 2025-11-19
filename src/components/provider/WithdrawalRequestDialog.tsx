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

interface WithdrawalRequestDialogProps {
  availableBalance: number;
  trigger?: React.ReactNode;
}

export function WithdrawalRequestDialog({
  availableBalance,
  trigger,
}: WithdrawalRequestDialogProps) {
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
        message: `Amount cannot exceed available balance ($${availableBalance.toFixed(2)})`,
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
        return 'your-email@example.com';
      case 'bank_transfer':
        return 'Bank account number or IBAN';
      case 'crypto':
        return 'Wallet address (BTC, ETH, USDT)';
      default:
        return 'Payment details';
    }
  };

  const getPaymentDetailsLabel = () => {
    switch (paymentMethod) {
      case 'paypal':
        return 'PayPal Email';
      case 'bank_transfer':
        return 'Bank Account Details';
      case 'crypto':
        return 'Crypto Wallet Address';
      default:
        return 'Payment Details';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <DollarSign className="h-4 w-4 mr-2" />
            Request Withdrawal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Withdrawal</DialogTitle>
          <DialogDescription>
            Withdraw your earnings to your preferred payment method. Minimum
            withdrawal: $10.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-muted rounded-lg mb-4">
          <p className="text-sm text-muted-foreground">Available Balance</p>
          <p className="text-2xl font-bold">
            ${availableBalance.toFixed(2)}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">
              Amount (USD) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="10"
              max={availableBalance}
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
            {amount && amount <= availableBalance && (
              <p className="text-xs text-muted-foreground">
                You will receive ${amount.toFixed(2)} (no fees applied)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">
              Payment Method <span className="text-red-500">*</span>
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
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
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
              <strong>Note:</strong> Withdrawal requests are processed within
              2-5 business days. You will be notified once your request is
              approved.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={requestWithdrawal.isPending}>
              {requestWithdrawal.isPending
                ? 'Submitting...'
                : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
