'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { resolveDisputeSchema, ResolveDisputeFormData } from '@/lib/validations/conciliator';
import { useResolveDispute } from '@/lib/hooks/useDisputes';
import { Dispute } from '@/types/conciliator';

interface ResolveDisputeFormProps {
  dispute: Dispute;
  onSuccess?: () => void;
}

export function ResolveDisputeForm({ dispute, onSuccess }: ResolveDisputeFormProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState<ResolveDisputeFormData | null>(null);
  const resolveDispute = useResolveDispute();

  const form = useForm<ResolveDisputeFormData>({
    resolver: zodResolver(resolveDisputeSchema),
    defaultValues: {
      resolutionType: 'favor_provider',
      partialRefundPercentage: 50,
      resolution: '',
    },
  });

  const resolutionType = form.watch('resolutionType');

  const onSubmit = (data: ResolveDisputeFormData) => {
    setFormData(data);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!formData) return;

    await resolveDispute.mutateAsync({
      disputeId: dispute.id,
      data: formData,
    });

    setShowConfirmation(false);
    onSuccess?.();
  };

  const getResolutionTypeLabel = (type: string) => {
    switch (type) {
      case 'refund_seller':
        return 'Refund Seller (100% refund to seller)';
      case 'favor_provider':
        return 'Favor Provider (No refund, payment stays with provider)';
      case 'partial_refund':
        return 'Partial Refund (Custom percentage)';
      case 'no_action':
        return 'No Action (Close without changes)';
      default:
        return type;
    }
  };

  return (
    <>
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle>Resolve Dispute</CardTitle>
          <CardDescription>
            Choose the resolution type and provide a detailed explanation of your decision.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              This action cannot be undone. Please review all evidence and messages before making your decision.
            </AlertDescription>
          </Alert>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="resolutionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolution Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-3"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="refund_seller" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {getResolutionTypeLabel('refund_seller')}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="favor_provider" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {getResolutionTypeLabel('favor_provider')}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="partial_refund" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {getResolutionTypeLabel('partial_refund')}
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="no_action" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            {getResolutionTypeLabel('no_action')}
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {resolutionType === 'partial_refund' && (
                <FormField
                  control={form.control}
                  name="partialRefundPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refund Percentage to Seller (0-100%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="50"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        The remaining percentage will go to the provider
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="resolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolution Explanation</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Provide a detailed explanation of your decision, including what evidence you considered and why you came to this conclusion..."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This will be visible to both the seller and provider. Minimum 20 characters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={resolveDispute.isPending}
              >
                {resolveDispute.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Resolve Dispute
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Resolution</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to resolve this dispute with:{' '}
              <strong>{formData && getResolutionTypeLabel(formData.resolutionType)}</strong>
              {formData?.resolutionType === 'partial_refund' && formData.partialRefundPercentage !== undefined && (
                <span> ({formData.partialRefundPercentage}% to seller)</span>
              )}
              ?<br /><br />
              This action cannot be undone and will immediately process the resolution.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resolveDispute.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={resolveDispute.isPending}
            >
              {resolveDispute.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Resolution
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
