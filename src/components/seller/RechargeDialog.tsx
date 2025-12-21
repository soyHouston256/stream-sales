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
  AlertCircle,
  AlertTriangle,
  Smartphone,
  Building2,
  Coins,
  Upload
} from 'lucide-react';
import { ImageUpload } from '@/components/shared/ImageUpload';
import NextImage from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { tokenManager } from '@/lib/utils/tokenManager';

interface RechargeDialogProps {
  currentBalance?: string;
  trigger?: React.ReactNode;
  role?: 'seller' | 'affiliate';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: 'mobile' | 'bank' | 'crypto';
  color: string;
  enabled: boolean;
  phone?: string;
  qrImage?: string;
  walletAddress?: string;
  bankName?: string;
  accountNumber?: string;
  cci?: string;
  holderName?: string;
  instructions?: string;
}

const TYPE_ICONS = {
  mobile: Smartphone,
  bank: Building2,
  crypto: Coins,
};

export function RechargeDialog({
  currentBalance,
  trigger,
  role = 'seller',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: RechargeDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (isControlled) {
      controlledOnOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };
  const [copied, setCopied] = useState('');
  const [voucherUrl, setVoucherUrl] = useState<string>('');

  const createSellerRecharge = useCreateRecharge();
  const createAffiliateRecharge = useCreateAffiliateRecharge();
  const createRecharge = role === 'affiliate' ? createAffiliateRecharge : createSellerRecharge;

  // Fetch payment config for user's country
  const { data: paymentConfig, isLoading: configLoading } = useQuery({
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
      return data.data as { countryCode: string; methods: PaymentMethod[] };
    },
    enabled: open && !!user?.countryCode,
  });

  // Fetch exchange rate for user's country
  const { data: exchangeRateData, isLoading: exchangeRateLoading } = useQuery({
    queryKey: ['exchange-rate', user?.countryCode],
    queryFn: async () => {
      if (!user?.countryCode) return null;
      const token = tokenManager.getToken();
      const encodedCountry = encodeURIComponent(user.countryCode);
      console.log('[RechargeDialog] Fetching exchange rate for:', user.countryCode, 'encoded:', encodedCountry);
      const res = await fetch(`/api/exchange-rate/${encodedCountry}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        console.log('[RechargeDialog] Exchange rate fetch failed:', res.status);
        return null;
      }
      const data = await res.json();
      console.log('[RechargeDialog] Exchange rate data:', data);
      return data.data as {
        countryCode: string;
        currencyCode: string;
        currencyName: string;
        rate: string;
        isDefault: boolean;
      };
    },
    enabled: open && !!user?.countryCode,
  });

  // Calculate USD equivalent from local currency amount
  const exchangeRate = exchangeRateData?.rate ? parseFloat(exchangeRateData.rate) : 1;
  const currencySymbol = exchangeRateData?.currencyCode === 'PEN' ? 'S/' :
    exchangeRateData?.currencyCode === 'MXN' ? '$' :
      exchangeRateData?.currencyCode === 'COP' ? '$' :
        exchangeRateData?.currencyCode === 'ARS' ? '$' :
          exchangeRateData?.currencyCode || 'S/';

  // Set first available method when config loads
  useEffect(() => {
    if (paymentConfig?.methods?.length && !selectedMethod) {
      setSelectedMethod(paymentConfig.methods[0]);
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
      paymentMethod: 'bank_transfer',
    },
  });

  const amount = watch('amount');
  const amountInUSD = amount ? (amount / exchangeRate).toFixed(2) : '0.00';

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

  const handleMethodChange = (method: PaymentMethod) => {
    setSelectedMethod(method);
    // Map type to API payment method
    const apiMethod = method.type === 'bank' ? 'bank_transfer' :
      method.type === 'crypto' ? 'crypto' : 'bank_transfer';
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

    // Calculate USD amount from local currency
    const localAmount = data.amount;
    const usdAmount = exchangeRate > 1 ? parseFloat((localAmount / exchangeRate).toFixed(2)) : localAmount;
    const currencyCode = exchangeRateData?.currencyCode || 'USD';

    try {
      await createRecharge.mutateAsync({
        ...data,
        amount: usdAmount, // Send USD amount as the wallet amount
        paymentDetails: `Método: ${selectedMethod?.name}, Titular: ${data.holderName}, Hora: ${data.paymentTime}, Moneda: ${currencyCode}, Monto Local: ${currencySymbol}${localAmount}, Tipo Cambio: ${exchangeRate}${voucherUrl ? `, Voucher: ${voucherUrl}` : ''}`,
        voucherUrl: voucherUrl || undefined,
      });
      setOpen(false);
      reset();
      setSelectedMethod(null);
      setVoucherUrl('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const setQuickAmount = (amt: number) => {
    setValue('amount', amt, { shouldValidate: true });
  };

  // Get currency based on method type (use exchange rate data)
  const getCurrency = () => {
    if (!selectedMethod) return currencySymbol;
    return selectedMethod.type === 'crypto' ? 'USDT' : currencySymbol;
  };

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
        {(configLoading || exchangeRateLoading) && (
          <div className="p-10 flex flex-col items-center justify-center min-h-[400px]">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-40 w-full max-w-md" />
          </div>
        )}

        {/* No Config Error */}
        {!configLoading && (!paymentConfig || paymentConfig.methods.length === 0) && (
          <div className="p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
            <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">{t('seller.recharge.noConfigTitle')}</h2>
            <p className="text-muted-foreground max-w-md">
              {t('seller.recharge.noConfigDesc')}
            </p>
          </div>
        )}

        {/* No Exchange Rate Error */}
        {!configLoading && !exchangeRateLoading && paymentConfig && paymentConfig.methods.length > 0 && !exchangeRateData && (
          <div className="p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
            <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold mb-2">Tipo de cambio no configurado</h2>
            <p className="text-muted-foreground max-w-md">
              No se ha configurado el tipo de cambio para tu país ({user?.countryCode}). Por favor contacta al administrador para que configure el tipo de cambio antes de poder recargar saldo.
            </p>
          </div>
        )}

        {/* Main Content */}
        {!configLoading && !exchangeRateLoading && paymentConfig && paymentConfig.methods.length > 0 && exchangeRateData && selectedMethod && (
          <div className="flex flex-col md:flex-row min-h-[600px]">

            {/* --- LEFT COLUMN: PAYMENT METHODS --- */}
            <div className="w-full md:w-1/2 bg-muted/30 border-r flex flex-col">

              {/* Header */}
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">{t('seller.recharge.title')}</h2>
                <p className="text-muted-foreground text-sm mt-1">{t('seller.recharge.subtitle')}</p>
              </div>

              {/* Method Selector - Dynamic Grid */}
              <div className="p-4 grid grid-cols-2 gap-3">
                {paymentConfig.methods.map((method) => {
                  const Icon = TYPE_ICONS[method.type];
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handleMethodChange(method)}
                      className={cn(
                        "relative p-4 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-2 border-2 group aspect-square",
                        selectedMethod?.id === method.id
                          ? `bg-background shadow-md`
                          : 'bg-background border-transparent hover:bg-muted'
                      )}
                      style={{
                        borderColor: selectedMethod?.id === method.id ? method.color : 'transparent'
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-full shadow-sm flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundColor: method.color }}
                      >
                        <Icon size={20} />
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        selectedMethod?.id === method.id ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {method.name}
                      </span>

                      {selectedMethod?.id === method.id && (
                        <div className="absolute top-2 right-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: method.color }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Payment Info Panel */}
              <div className="flex-1 px-4 pb-4 flex flex-col justify-end">
                <div
                  className="rounded-2xl p-5 border transition-colors duration-300"
                  style={{
                    backgroundColor: `${selectedMethod.color}10`,
                    borderColor: `${selectedMethod.color}30`
                  }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <span
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: selectedMethod.color }}
                    >
                      {t('seller.recharge.paymentData')}
                    </span>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded bg-background/50"
                      style={{ color: selectedMethod.color }}
                    >
                      {selectedMethod.name}
                    </span>
                  </div>

                  {/* Bank Type */}
                  {selectedMethod.type === 'bank' && (
                    <div className="space-y-3">
                      {selectedMethod.bankName && (
                        <div className="bg-background/80 p-3 rounded-lg">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">
                            Banco
                          </p>
                          <p className="font-semibold">{selectedMethod.bankName}</p>
                        </div>
                      )}
                      {selectedMethod.accountNumber && (
                        <div className="bg-background/80 p-3 rounded-lg">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">
                            Número de Cuenta
                          </p>
                          <div className="flex justify-between items-end mt-1">
                            <p className="font-mono text-sm font-semibold">{selectedMethod.accountNumber}</p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedMethod.accountNumber!, 'cuenta')}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {copied === 'cuenta' ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                      )}
                      {selectedMethod.cci && (
                        <div className="bg-background/80 p-3 rounded-lg">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">
                            CCI / CLABE
                          </p>
                          <div className="flex justify-between items-end mt-1">
                            <p className="font-mono text-sm font-semibold">{selectedMethod.cci}</p>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(selectedMethod.cci!, 'cci')}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              {copied === 'cci' ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                          </div>
                        </div>
                      )}
                      {selectedMethod.holderName && (
                        <p className="text-xs text-center text-muted-foreground mt-2">
                          Titular: <strong>{selectedMethod.holderName}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Mobile/Crypto Type - QR View */}
                  {(selectedMethod.type === 'mobile' || selectedMethod.type === 'crypto') && (
                    <div className="flex flex-col items-center">
                      {selectedMethod.qrImage ? (
                        <div className="bg-white p-3 rounded-xl shadow-sm mb-3">
                          <NextImage
                            src={selectedMethod.qrImage}
                            alt={`QR ${selectedMethod.name}`}
                            className="rounded-lg object-contain"
                            width={160}
                            height={160}
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg flex items-center justify-center mb-3">
                          <span className="text-muted-foreground text-sm">Sin QR</span>
                        </div>
                      )}

                      {selectedMethod.phone && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedMethod.phone!, 'phone')}
                          className="text-xs font-semibold hover:underline flex items-center gap-1"
                          style={{ color: selectedMethod.color }}
                        >
                          {copied === 'phone' ? <Check size={14} /> : <Copy size={14} />}
                          Copiar número: {selectedMethod.phone}
                        </button>
                      )}

                      {selectedMethod.walletAddress && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedMethod.walletAddress!, 'wallet')}
                          className="text-xs font-semibold hover:underline flex items-center gap-1 mt-2"
                          style={{ color: selectedMethod.color }}
                        >
                          {copied === 'wallet' ? <Check size={14} /> : <Copy size={14} />}
                          Copiar wallet
                        </button>
                      )}
                    </div>
                  )}

                  {/* Instructions */}
                  {selectedMethod.instructions && (
                    <p className="text-xs text-muted-foreground mt-3 text-center italic">
                      {selectedMethod.instructions}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* --- RIGHT COLUMN: FORM --- */}
            <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-start bg-background relative overflow-y-auto">

              <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto w-full">
                <h2 className="text-2xl font-bold mb-1">{t('seller.recharge.reportPayment')}</h2>
                <p className="text-muted-foreground mb-8">{t('seller.recharge.reportDescription')}</p>

                {/* Amount Input */}
                <div className="mb-8">
                  <Label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {t('seller.recharge.amountTransferred')}
                  </Label>
                  <div className="flex items-center gap-3 border-b-2 border-border focus-within:border-primary transition-colors pb-2">
                    <span className="text-muted-foreground font-bold text-3xl shrink-0">
                      {getCurrency()}
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      className="border-0 px-0 py-0 text-4xl font-bold h-auto rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent placeholder:text-muted-foreground/30 flex-1"
                      placeholder="0.00"
                      {...register('amount', { valueAsNumber: true })}
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
                  )}

                  {/* USD Conversion Display */}
                  {amount && amount > 0 && selectedMethod?.type !== 'crypto' && exchangeRate > 1 && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          {t('seller.recharge.youWillReceive')}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-green-600 dark:text-green-400">
                            ${amountInUSD} USD
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('seller.recharge.exchangeRate')}: 1 USD = {exchangeRate.toFixed(2)} {exchangeRateData?.currencyCode}
                          </p>
                        </div>
                      </div>
                    </div>
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
                        {getCurrency()}{amt}
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

                {/* Voucher Upload Section */}
                <div className="mt-6">
                  <Label className="block text-xs font-bold text-foreground mb-2">
                    {t('seller.recharge.voucherLabel')}
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t('seller.recharge.voucherDescription')}
                  </p>
                  <ImageUpload
                    value={voucherUrl}
                    onChange={setVoucherUrl}
                    disabled={createRecharge.isPending}
                  />
                  {voucherUrl && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <Check size={14} />
                      {t('seller.recharge.voucherUploaded')}
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={createRecharge.isPending}
                  className="mt-8 w-full py-6 text-lg font-bold"
                  style={{ backgroundColor: selectedMethod.color }}
                >
                  {createRecharge.isPending ? (
                    t('seller.recharge.submitting')
                  ) : (
                    <>
                      <span>{t('seller.recharge.confirm')} {selectedMethod.name}</span>
                      <Check size={20} className="ml-2" strokeWidth={3} />
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
