'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { Wallet, TrendingUp, Clock, History, Plus, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface WalletBalanceCardProps {
  balance: string | number;
  currency?: string;
  lastUpdated?: Date;
  pendingAmount?: string | number;
  isLoading?: boolean;
  variant?: 'seller' | 'provider' | 'affiliate';
  onRecharge?: () => void;
  onWithdraw?: () => void;
  onViewTransactions?: () => void;
}

const VARIANT_GRADIENTS = {
  seller: 'from-green-500 via-emerald-500 to-teal-500',
  provider: 'from-blue-500 via-indigo-500 to-purple-500',
  affiliate: 'from-purple-500 via-fuchsia-500 to-pink-500',
};

const VARIANT_HOVER_GRADIENTS = {
  seller: 'hover:from-green-600 hover:via-emerald-600 hover:to-teal-600',
  provider: 'hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600',
  affiliate: 'hover:from-purple-600 hover:via-fuchsia-600 hover:to-pink-600',
};

export function WalletBalanceCard({
  balance,
  currency = 'USD',
  lastUpdated,
  pendingAmount,
  isLoading = false,
  variant = 'seller',
  onRecharge,
  onWithdraw,
  onViewTransactions,
}: WalletBalanceCardProps) {
  const { t, language } = useLanguage();
  const locale = language === 'es' ? es : enUS;

  // Format balance with proper currency symbol
  const formatCurrency = (amount: string | number): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat(language === 'es' ? 'es-US' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  // Format last updated time
  const formatLastUpdated = (): string => {
    if (!lastUpdated) return t('wallet.justNow');
    return formatDistanceToNow(lastUpdated, { addSuffix: true, locale });
  };

  // Loading skeleton state
  if (isLoading) {
    return (
      <Card className="col-span-full border-2 shadow-lg">
        <CardHeader className="space-y-0 pb-4">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-16 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'col-span-full border-2 shadow-lg overflow-hidden relative',
        'transition-all duration-300 hover:shadow-xl',
        'animate-in fade-in slide-in-from-top-2 duration-500'
      )}
      role="region"
      aria-label={t('wallet.balanceCard')}
    >
      {/* Gradient background overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-5',
          VARIANT_GRADIENTS[variant]
        )}
        aria-hidden="true"
      />

      <CardHeader className="relative space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-3 rounded-xl bg-gradient-to-br shadow-md',
              'transition-all duration-300',
              VARIANT_GRADIENTS[variant],
              VARIANT_HOVER_GRADIENTS[variant]
            )}
            aria-hidden="true"
          >
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-base font-medium text-muted-foreground">
              {t('wallet.availableBalance')}
            </h2>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Main balance display - LARGEST element */}
        <div className="space-y-2">
          <div
            className={cn(
              'text-5xl md:text-6xl font-bold tracking-tight',
              'bg-gradient-to-br bg-clip-text text-transparent',
              'animate-in zoom-in duration-700',
              VARIANT_GRADIENTS[variant]
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {formatCurrency(balance)}
          </div>

          {/* Pending amount indicator */}
          {pendingAmount && parseFloat(String(pendingAmount)) > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-amber-500" aria-hidden="true" />
              <span className="text-muted-foreground">
                {t('wallet.pending')}:{' '}
                <span className="font-semibold text-amber-600">
                  {formatCurrency(pendingAmount)}
                </span>
              </span>
            </div>
          )}

          {/* Last updated timestamp */}
          {lastUpdated && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>
                {t('wallet.lastUpdated')}: {formatLastUpdated()}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {onRecharge && (
            <Button
              onClick={onRecharge}
              size="lg"
              className={cn(
                'flex-1 min-w-[120px] font-semibold shadow-md',
                'bg-gradient-to-r text-white',
                'transition-all duration-300 hover:shadow-lg hover:scale-105',
                VARIANT_GRADIENTS[variant],
                VARIANT_HOVER_GRADIENTS[variant]
              )}
              aria-label={t('wallet.recharge')}
            >
              <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
              {t('wallet.recharge')}
            </Button>
          )}

          {onWithdraw && (
            <Button
              onClick={onWithdraw}
              size="lg"
              variant="outline"
              className="flex-1 min-w-[120px] font-semibold border-2 hover:bg-accent transition-all duration-300 hover:scale-105"
              aria-label={t('wallet.withdraw')}
            >
              <ArrowUpRight className="mr-2 h-5 w-5" aria-hidden="true" />
              {t('wallet.withdraw')}
            </Button>
          )}

          {onViewTransactions && (
            <Button
              onClick={onViewTransactions}
              size="lg"
              variant="ghost"
              className="flex-1 min-w-[120px] font-semibold hover:bg-accent transition-all duration-300"
              aria-label={t('wallet.viewHistory')}
            >
              <History className="mr-2 h-5 w-5" aria-hidden="true" />
              {t('wallet.viewHistory')}
            </Button>
          )}
        </div>

        {/* Subtle pulse animation indicator */}
        <div
          className={cn(
            'absolute -top-1 -right-1 h-3 w-3 rounded-full',
            'bg-gradient-to-br',
            VARIANT_GRADIENTS[variant],
            'animate-pulse'
          )}
          aria-hidden="true"
        />
      </CardContent>
    </Card>
  );
}
