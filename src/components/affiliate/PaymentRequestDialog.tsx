'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { paymentRequestSchema, PaymentRequestInput } from '@/lib/validations/affiliate';
import { useRequestPayment } from '@/lib/hooks';
import { formatCommissionAmount, validatePaymentDetails } from '@/lib/utils/affiliate';
import { toast } from '@/lib/hooks';
import { DollarSign, AlertCircle } from 'lucide-react';

interface PaymentRequestDialogProps {
  availableBalance: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PaymentRequestDialog({
  availableBalance,
  isOpen,
  onClose,
}: PaymentRequestDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'bank_transfer' | 'crypto'>('paypal');
  const requestPayment = useRequestPayment();

  const form = useForm<PaymentRequestInput>({
    resolver: zodResolver(paymentRequestSchema),
    defaultValues: {
      amount: 0,
      paymentMethod: 'paypal',
      paymentDetails: '',
    },
  });

  const numBalance = parseFloat(availableBalance);

  const onSubmit = async (data: PaymentRequestInput) => {
    // Additional validation
    const validationError = validatePaymentDetails(data.paymentMethod, data.paymentDetails);
    if (validationError) {
      form.setError('paymentDetails', { message: validationError });
      return;
    }

    if (data.amount > numBalance) {
      form.setError('amount', { message: 'Amount exceeds available balance' });
      return;
    }

    try {
      await requestPayment.mutateAsync(data);
      toast({
        title: 'Payment requested',
        description: `Your payment request for ${formatCommissionAmount(data.amount)} has been submitted.`,
      });
      form.reset();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to request payment',
        variant: 'destructive',
      });
    }
  };

  const getPaymentDetailsPlaceholder = () => {
    switch (paymentMethod) {
      case 'paypal':
        return 'your-email@example.com';
      case 'bank_transfer':
        return 'Account number or IBAN';
      case 'crypto':
        return 'Wallet address';
      default:
        return '';
    }
  };

  const getPaymentDetailsDescription = () => {
    switch (paymentMethod) {
      case 'paypal':
        return 'Enter your PayPal email address';
      case 'bank_transfer':
        return 'Enter your bank account number or IBAN';
      case 'crypto':
        return 'Enter your cryptocurrency wallet address';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Payment</DialogTitle>
          <DialogDescription>
            Submit a payment request for your earned commissions
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm text-muted-foreground">Available Balance</span>
            </div>
            <span className="text-xl font-bold text-green-600">
              {formatCommissionAmount(availableBalance)}
            </span>
          </div>
        </div>

        {numBalance < 50 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Minimum payment request is $50. Your current balance is below the minimum.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="50"
                      max={numBalance}
                      placeholder="50.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Minimum: $50, Maximum: {formatCommissionAmount(availableBalance)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setPaymentMethod(value as typeof paymentMethod);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Details</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={getPaymentDetailsPlaceholder()}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{getPaymentDetailsDescription()}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={requestPayment.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={requestPayment.isPending || numBalance < 50}
              >
                {requestPayment.isPending ? 'Requesting...' : 'Request Payment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
