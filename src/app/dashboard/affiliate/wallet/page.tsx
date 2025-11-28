'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, Column } from '@/components/admin/DataTable';
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import {
  useAffiliateWalletBalance,
  useAffiliateWalletTransactions,
  useAffiliateRecharges,
} from '@/lib/hooks/useAffiliateWallet';
import { WalletTransaction, Recharge, TransactionsFilters } from '@/types/seller';
import {
  TransactionTypeBadge,
  RechargeStatusBadge,
  RechargeDialog,
} from '@/components/seller';
import { formatCurrency } from '@/lib/utils/seller';
import { format } from 'date-fns';
import { Wallet, TrendingUp, Clock, Receipt } from 'lucide-react';

export default function AffiliateWalletPage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<TransactionsFilters>({
    page: 1,
    limit: 10,
  });

  const { data: balance, isLoading: balanceLoading } = useAffiliateWalletBalance();
  const { data: transactionsData, isLoading: transactionsLoading } =
    useAffiliateWalletTransactions(filters);
  const { data: recharges, isLoading: rechargesLoading } = useAffiliateRecharges();

  const transactions = transactionsData?.data || [];
  const pagination = transactionsData?.pagination;
  const rechargesList = recharges || [];

  // Calculate pending recharges stats
  const pendingRecharges = rechargesList.filter((r) => r.status === 'pending');
  const pendingAmount = pendingRecharges.reduce(
    (sum, r) => sum + parseFloat(r.amount),
    0
  );

  // Calculate total recharged (completed only)
  const totalRecharged = rechargesList
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);

  const transactionColumns: Column<WalletTransaction>[] = [
    {
      key: 'type',
      label: t('seller.wallet.type'),
      render: (transaction) => <TransactionTypeBadge type={transaction.type} />,
    },
    {
      key: 'description',
      label: t('seller.wallet.description'),
      render: (transaction) => (
        <span className="text-sm">{transaction.description}</span>
      ),
    },
    {
      key: 'amount',
      label: t('seller.wallet.amount'),
      render: (transaction) => {
        const isPositive = transaction.type === 'credit';
        return (
          <span
            className={`font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </span>
        );
      },
    },
    {
      key: 'balanceAfter',
      label: t('seller.wallet.balanceAfter'),
      render: (transaction) =>
        transaction.balanceAfter ? (
          <span className="font-medium">
            {formatCurrency(transaction.balanceAfter)}
          </span>
        ) : (
          '-'
        ),
    },
    {
      key: 'createdAt',
      label: t('seller.wallet.date'),
      render: (transaction) => (
        <span className="text-sm">
          {format(new Date(transaction.createdAt), 'PPp')}
        </span>
      ),
    },
  ];

  const rechargeColumns: Column<Recharge>[] = [
    {
      key: 'id',
      label: t('seller.wallet.rechargeId'),
      render: (recharge) => (
        <span className="font-mono text-xs">{recharge.id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'amount',
      label: t('seller.wallet.amount'),
      render: (recharge) => (
        <span className="font-medium">{formatCurrency(recharge.amount)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      label: t('seller.wallet.paymentMethod'),
      render: (recharge) => (
        <span className="text-sm capitalize">
          {recharge.paymentMethod.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Estado',
      render: (recharge) => <RechargeStatusBadge status={recharge.status} />,
    },
    {
      key: 'createdAt',
      label: t('seller.wallet.requested'),
      render: (recharge) => (
        <span className="text-sm">
          {format(new Date(recharge.createdAt), 'PPp')}
        </span>
      ),
    },
    {
      key: 'completedAt',
      label: t('seller.wallet.completed'),
      render: (recharge) =>
        recharge.completedAt ? (
          <span className="text-sm">
            {format(new Date(recharge.completedAt), 'PPp')}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('affiliate.wallet.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('affiliate.wallet.subtitle')}
          </p>
        </div>
        <RechargeDialog currentBalance={balance?.balance} role="affiliate" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-2 overflow-hidden relative border-2 shadow-lg hover:shadow-xl transition-all">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 opacity-5" />
          <CardHeader className="pb-3 relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 shadow-md">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <CardDescription className="text-base font-medium">
                {t('affiliate.wallet.currentBalance')}
              </CardDescription>
            </div>
            <CardTitle className="text-5xl font-bold bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              {balance ? formatCurrency(balance.balance) : '$0.00'}
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {balance?.currency || 'USD'} • {balance?.status || 'active'}
              </span>
            </div>
          </CardContent>
        </Card>

        <EnhancedStatsCard
          title={t('affiliate.wallet.totalRecharged')}
          value={formatCurrency(totalRecharged.toFixed(2))}
          description={t('affiliate.wallet.completedRecharges')}
          icon={TrendingUp}
          variant="success"
          isLoading={rechargesLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.wallet.pendingRecharges')}
          value={pendingRecharges.length}
          description={formatCurrency(pendingAmount.toFixed(2))}
          icon={Clock}
          variant="warning"
          isLoading={rechargesLoading}
        />
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('affiliate.wallet.transactionHistory')}</CardTitle>
              <CardDescription>
                {pagination
                  ? t('affiliate.wallet.showingTransactions')
                      .replace('{count}', transactions.length.toString())
                      .replace('{total}', pagination.total.toString())
                  : t('affiliate.wallet.allTransactions')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={filters.type || 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: value === 'all' ? undefined : (value as any),
                    page: 1,
                  }))
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('affiliate.wallet.filterByType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('affiliate.wallet.all')}</SelectItem>
                  <SelectItem value="credit">{t('affiliate.wallet.credit')}</SelectItem>
                  <SelectItem value="debit">{t('affiliate.wallet.debit')}</SelectItem>
                  <SelectItem value="transfer">{t('affiliate.wallet.transfer')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={transactions}
            columns={transactionColumns}
            isLoading={transactionsLoading}
            emptyMessage={t('affiliate.wallet.noTransactions')}
            emptyState={{
              icon: Receipt,
              title: filters.type ? t('affiliate.wallet.noTransactions') : t('affiliate.wallet.noTransactions'),
              description: filters.type
                ? t('affiliate.wallet.tryDifferentFilter')
                : t('affiliate.wallet.transactionsAppear'),
              variant: filters.type ? 'search' : 'default',
            }}
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page! - 1 }))
                }
                disabled={filters.page === 1}
              >
                {t('affiliate.wallet.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('affiliate.wallet.page')} {filters.page} {t('affiliate.wallet.of')} {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))
                }
                disabled={filters.page === pagination.totalPages}
              >
                {t('affiliate.wallet.next')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recharges */}
      <Card>
        <CardHeader>
          <CardTitle>{t('affiliate.wallet.rechargeHistory')}</CardTitle>
          <CardDescription>
            {t('affiliate.wallet.allRecharges')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rechargesList}
            columns={rechargeColumns}
            isLoading={rechargesLoading}
            emptyMessage={t('affiliate.wallet.noRecharges')}
            emptyState={{
              icon: Wallet,
              title: t('affiliate.wallet.noRecharges'),
              description: t('affiliate.wallet.rechargesAppear'),
              variant: 'default',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
