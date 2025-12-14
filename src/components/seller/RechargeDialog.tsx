'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/lib/auth/useAuth';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateRecharge } from '@/lib/hooks/useSellerWallet';
import { useCreateAffiliateRecharge } from '@/lib/hooks/useAffiliateWallet';
import { rechargeSchema, RechargeInput } from '@/lib/validations/seller';
import {
  Plus,
  Copy,
  Check,
  Clock,
  User,
  DollarSign,
  QrCode,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { tokenManager } from '@/lib/utils/tokenManager';

interface RechargeDialogProps {
  currentBalance?: string;
  trigger?: React.ReactNode;
  role?: 'seller' | 'affiliate';
}

type PaymentMethodKey = 'yape' | 'plin' | 'binance' | 'banco';

interface PaymentMethodConfig {
  color: string;
  lightColor: string;
  textColor: string;
  borderColor: string;
  currency: string;
}

// Styling config - estos no vienen del backend
const methodStyles: Record<PaymentMethodKey, PaymentMethodConfig> = {
  yape: {
    color: 'bg-purple-600',
    lightColor: 'bg-purple-50 dark:bg-purple-950',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-200 dark:border-purple-800',
    currency: 'S/',
  },
  plin: {
    color: 'bg-sky-500',
    lightColor: 'bg-sky-50 dark:bg-sky-950',
    textColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-200 dark:border-sky-800',
    currency: 'S/',
  },
  binance: {
    color: 'bg-yellow-400',
    lightColor: 'bg-yellow-50 dark:bg-yellow-950',
    textColor: 'text-yellow-700 dark:text-yellow-400',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    currency: 'USDT',
  },
  banco: {
    color: 'bg-gray-800',
    lightColor: 'bg-gray-100 dark:bg-gray-900',
    textColor: 'text-gray-700 dark:text-gray-300',
    borderColor: 'border-gray-200 dark:border-gray-700',
    currency: 'S/',
  },
};

interface PaymentConfigData {
  countryCode: string;
  availableMethods: PaymentMethodKey[];
  yape: { phone: string; qrUrl: string } | null;
  plin: { phone: string; qrUrl: string } | null;
  binance: { wallet: string; qrUrl: string } | null;
  banco: { bankName: string; accountNumber: string; cci: string; holderName: string } | null;
}

export function RechargeDialog({ currentBalance, trigger, role = 'seller' }: RechargeDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodKey | null>(null);
  const [copied, setCopied] = useState('');

  const createSellerRecharge = useCreateRecharge();
  const createAffiliateRecharge = useCreateAffiliateRecharge();
  const createRecharge = role === 'affiliate' ? createAffiliateRecharge : createSellerRecharge;

  // Fetch payment config for user's country
  const { data: paymentConfig, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ['payment-config', user?.countryCode],
    queryFn: async () => {
      if (!user?.countryCode) return null;
      const token = tokenManager.getToken();
      const res = await fetch(`/api/payment-config/${user.countryCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch payment config');
      const data = await res.json();
      return data.data as PaymentConfigData;
    },
    enabled: open && !!user?.countryCode,
  });

  // Set first available method when config loads
  useEffect(() => {
    if (paymentConfig?.availableMethods?.length && !selectedMethod) {
      setSelectedMethod(paymentConfig.availableMethods[0]);
    }
  }, [paymentConfig, selectedMethod]);

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
      paymentMethod: 'yape',
    },
  });

  const amount = watch('amount');
  const currentMethodStyle = selectedMethod ? methodStyles[selectedMethod] : methodStyles.yape;

  // Get translated method name and CTA
  const getMethodName = (key: PaymentMethodKey) => t(`seller.recharge.methods.${key}.name`);
  const getMethodCta = (key: PaymentMethodKey) => t(`seller.recharge.methods.${key}.cta`);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast({
        title: t('seller.recharge.copied'),
        description: t('seller.recharge.copiedToClipboard'),
      });
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      toast({
        title: 'Error',
        description: t('seller.recharge.copyError'),
        variant: 'destructive',
      });
    }
  };

  const handleMethodChange = (method: PaymentMethodKey) => {
    setSelectedMethod(method);
    const apiMethod = method === 'banco' ? 'bank_transfer' : method;
    setValue('paymentMethod', apiMethod as any, { shouldValidate: true });
  };

  const onSubmit = async (data: RechargeInput) => {
    if (!data.holderName || !data.paymentTime) {
      toast({
        title: t('seller.recharge.fieldsRequired'),
        description: t('seller.recharge.fieldsRequiredDesc'),
        variant: 'destructive',
      });
      return;
    }

    try {
      await createRecharge.mutateAsync({
        ...data,
        paymentDetails: `Titular: ${data.holderName}, Hora: ${data.paymentTime}`,
      });
      setOpen(false);
      reset();
      setSelectedMethod(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const setQuickAmount = (amt: number) => {
    setValue('amount', amt, { shouldValidate: true });
  };

  // Get payment data for selected method
  const getMethodData = () => {
    if (!paymentConfig || !selectedMethod) return null;
    return paymentConfig[selectedMethod];
  };

  const methodData = getMethodData();

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSelectedMethod(null); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('seller.recharge.addFunds')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-5xl p-0 overflow-hidden">
        {/* Loading State */}
        {configLoading && (
          <div className="p-10 flex flex-col items-center justify-center min-h-[400px]">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-40 w-full max-w-md" />
          </div>
        )}

        {/* No Config Error */}
        {!configLoading && (!paymentConfig || paymentConfig.availableMethods.length === 0) && (
          <div className="p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('seller.recharge.noConfigTitle') || 'Métodos de pago no disponibles'}</h2>
            <p className="text-muted-foreground max-w-md">
              {t('seller.recharge.noConfigDesc') || 'No hay métodos de pago configurados para tu país. Contacta al administrador.'}
            </p>
          </div>
        )}

        {/* Main Content */}
        {!configLoading && paymentConfig && paymentConfig.availableMethods.length > 0 && selectedMethod && (
          <div className="flex flex-col md:flex-row min-h-[600px]">

            {/* --- LEFT COLUMN: PAYMENT METHODS --- */}
            <div className="w-full md:w-5/12 bg-muted/30 border-r flex flex-col">

              {/* Header */}
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">{t('seller.recharge.title')}</h2>
                <p className="text-muted-foreground text-sm mt-1">{t('seller.recharge.subtitle')}</p>
              </div>

              {/* Method Selector */}
              <div className="p-4 grid grid-cols-2 gap-3">
                {paymentConfig.availableMethods.map((key) => {
                  const style = methodStyles[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleMethodChange(key)}
                      className={cn(
                        "relative p-3 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-2 border-2 group",
                        selectedMethod === key
                          ? `bg-background ${style.borderColor} shadow-md`
                          : 'bg-background border-transparent hover:bg-muted'
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-full shadow-sm flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110",
                        style.color
                      )}>
                        {key === 'banco' ? <span className="font-bold text-xs">BCP</span> :
                          key === 'binance' ? <DollarSign size={20} className="text-black" /> :
                            <span className="font-bold text-lg">{getMethodName(key)[0]}</span>}
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        selectedMethod === key ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {getMethodName(key)}
                      </span>

                      {selectedMethod === key && (
                        <div className="absolute top-2 right-2">
                          <div className={cn("w-2 h-2 rounded-full", style.color)} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Payment Info Panel */}
              <div className="flex-1 px-4 pb-4 flex flex-col justify-end">
                <div className={cn(
                  "rounded-2xl p-5 border transition-colors duration-300",
                  currentMethodStyle.lightColor,
                  currentMethodStyle.borderColor
                )}>
                  <div className="flex justify-between items-center mb-4">
                    <span className={cn("text-xs font-bold uppercase tracking-wider", currentMethodStyle.textColor)}>
                      {t('seller.recharge.paymentData')}
                    </span>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded bg-background/50",
                      currentMethodStyle.textColor
                    )}>
                      {getMethodName(selectedMethod)}
                    </span>
                  </div>

                  {selectedMethod === 'banco' && methodData && 'accountNumber' in methodData ? (
                    // BANK VIEW
                    <div className="space-y-3">
                      <div className="bg-background/80 p-3 rounded-lg">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">
                          {t('seller.recharge.methods.banco.accountLabel')} - {methodData.bankName}
                        </p>
                        <div className="flex justify-between items-end mt-1">
                          <p className="font-mono text-sm font-semibold">{methodData.accountNumber}</p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(methodData.accountNumber, 'cuenta')}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {copied === 'cuenta' ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                      <div className="bg-background/80 p-3 rounded-lg">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">
                          {t('seller.recharge.methods.banco.cciLabel')}
                        </p>
                        <div className="flex justify-between items-end mt-1">
                          <p className="font-mono text-sm font-semibold">{methodData.cci}</p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(methodData.cci, 'cci')}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {copied === 'cci' ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        {t('seller.recharge.methods.banco.holderLabel')}: <strong>{methodData.holderName}</strong>
                      </p>
                    </div>
                  ) : methodData && 'qrUrl' in methodData ? (
                    // QR VIEW
                    <div className="flex flex-col items-center">
                      <div className="bg-background p-3 rounded-xl shadow-sm mb-3 relative group cursor-pointer">
                        {/* QR Image */}
                        {methodData.qrUrl ? (
                          <img
                            src={methodData.qrUrl}
                            alt={`QR ${getMethodName(selectedMethod)}`}
                            className="w-40 h-40 rounded-lg object-contain"
                          />
                        ) : (
                          <div className="w-40 h-40 bg-gray-900 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center text-white relative overflow-hidden">
                            <QrCode size={64} className="opacity-20" />
                            <span className="text-[10px] font-mono text-gray-400 opacity-50">QR</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(
                          'wallet' in methodData ? methodData.wallet : methodData.phone,
                          'number'
                        )}
                        className={cn("text-xs font-semibold hover:underline flex items-center gap-1", currentMethodStyle.textColor)}
                      >
                        {copied === 'number' ? <Check size={14} /> : <Copy size={14} />}
                        {selectedMethod === 'binance'
                          ? t('seller.recharge.methods.binance.copyWallet')
                          : t(`seller.recharge.methods.${selectedMethod}.copyNumber`)
                        }
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">
                      No hay datos configurados para este método
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* --- RIGHT COLUMN: FORM --- */}
            <div className="w-full md:w-7/12 p-6 md:p-10 flex flex-col justify-center bg-background relative">

              <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto w-full">
                <h2 className="text-2xl font-bold mb-1">{t('seller.recharge.reportPayment')}</h2>
                <p className="text-muted-foreground mb-8">{t('seller.recharge.reportDescription')}</p>

                {/* Amount Input */}
                <div className="mb-8">
                  <Label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {t('seller.recharge.amountTransferred')}
                  </Label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-2xl transition-colors group-focus-within:text-primary">
                      {currentMethodStyle.currency}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      className="pl-14 pr-4 py-4 text-4xl font-bold h-auto border-b-2 border-x-0 border-t-0 rounded-none focus:border-primary bg-transparent placeholder:text-muted-foreground/30"
                      placeholder="0.00"
                      {...register('amount', { valueAsNumber: true })}
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
                  )}

                  {/* Quick Amount Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {[20, 50, 100, 200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setQuickAmount(amt)}
                        className="px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border hover:border-primary/50 text-muted-foreground rounded-full text-xs font-medium transition-all active:scale-95"
                      >
                        {currentMethodStyle.currency}{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Security Warning */}
                <div className="mb-6 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900 rounded-lg flex gap-3 items-start">
                  <AlertCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
                  <p
                    className="text-xs text-orange-800 dark:text-orange-200 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: t('seller.recharge.thirdPartyWarning') }}
                  />
                </div>

                {/* Holder Name and Time Inputs */}
                <div className="space-y-5">
                  <div>
                    <Label className="block text-xs font-bold text-foreground mb-1.5">
                      {t('seller.recharge.holderName')}
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        type="text"
                        className="pl-10"
                        placeholder={t('seller.recharge.holderNamePlaceholder')}
                        {...register('holderName')}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="block text-xs font-bold text-foreground mb-1.5">
                      {t('seller.recharge.paymentTime')}
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <Input
                        type="time"
                        className="pl-10"
                        {...register('paymentTime')}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={createRecharge.isPending}
                  className="mt-8 w-full py-6 text-lg font-bold"
                >
                  {createRecharge.isPending ? (
                    t('seller.recharge.submitting')
                  ) : (
                    <>
                      <span>{t('seller.recharge.confirm')} {getMethodCta(selectedMethod)}</span>
                      <Check size={20} className="ml-2 text-green-400" strokeWidth={3} />
                    </>
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  {t('seller.recharge.validationTime')}
                </p>
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
