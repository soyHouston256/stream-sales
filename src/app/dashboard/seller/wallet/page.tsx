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
  useWalletBalance,
  useWalletTransactions,
  useRecharges,
} from '@/lib/hooks/useSellerWallet';
import { WalletTransaction, Recharge, TransactionsFilters } from '@/types/seller';
import {
  TransactionTypeBadge,
  RechargeStatusBadge,
  RechargeDialog,
} from '@/components/seller';
import { formatCurrency } from '@/lib/utils/seller';
import { format } from 'date-fns';
import { Wallet, TrendingUp, Clock, Receipt } from 'lucide-react';

export default function WalletPage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<TransactionsFilters>({
    page: 1,
    limit: 10,
  });

  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const { data: transactionsData, isLoading: transactionsLoading } =
    useWalletTransactions(filters);
  const { data: recharges, isLoading: rechargesLoading } = useRecharges();

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
            className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'
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
      label: t('common.status'),
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('seller.wallet.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('seller.wallet.subtitle')}
          </p>
        </div>
        <RechargeDialog currentBalance={balance?.balance} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-2">
          <EnhancedStatsCard
            title={t('seller.wallet.currentBalance')}
            value={balance ? formatCurrency(balance.balance) : '$0.00'}
            description={`${balance?.currency || 'USD'} • ${balance?.status || 'active'}`}
            icon={Wallet}
            variant="success"
            isLoading={balanceLoading}
          />
        </div>

        <EnhancedStatsCard
          title={t('seller.wallet.totalRecharged')}
          value={formatCurrency(totalRecharged.toFixed(2))}
          description={t('seller.wallet.lifetimeRecharges')}
          icon={TrendingUp}
          variant="info"
          isLoading={rechargesLoading}
        />

        <EnhancedStatsCard
          title={t('seller.wallet.pendingRecharges')}
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>{t('seller.wallet.transactionHistory')}</CardTitle>
              <CardDescription>
                {pagination
                  ? `${t('seller.wallet.showing')} ${transactions.length} ${t('seller.wallet.of')} ${pagination.total} ${t('seller.wallet.transactions')}`
                  : t('seller.wallet.allTransactions')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
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
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t('seller.wallet.filterByType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('seller.wallet.allTypes')}</SelectItem>
                  <SelectItem value="credit">{t('seller.wallet.credit')}</SelectItem>
                  <SelectItem value="debit">{t('seller.wallet.debit')}</SelectItem>
                  <SelectItem value="transfer">{t('seller.wallet.transfer')}</SelectItem>
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
            emptyMessage={t('seller.wallet.noTransactions')}
            emptyState={{
              icon: Receipt,
              title: filters.type ? t('seller.wallet.noTransactionsFiltered') : t('seller.wallet.noTransactions'),
              description: filters.type
                ? t('seller.wallet.tryDifferentFilter')
                : t('seller.wallet.transactionsAppearHere'),
              variant: filters.type ? 'search' : 'default',
            }}
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page! - 1 }))
                }
                disabled={filters.page === 1}
              >
                {t('seller.wallet.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('seller.wallet.page')} {filters.page} {t('seller.wallet.of')} {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))
                }
                disabled={filters.page === pagination.totalPages}
              >
                {t('seller.wallet.next')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recharges */}
      <Card>
        <CardHeader>
          <CardTitle>{t('seller.wallet.rechargeHistory')}</CardTitle>
          <CardDescription>
            {t('seller.wallet.allRechargeRequests')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rechargesList}
            columns={rechargeColumns}
            isLoading={rechargesLoading}
            emptyMessage={t('seller.wallet.noRecharges')}
            emptyState={{
              icon: Wallet,
              title: t('seller.wallet.noRecharges'),
              description: t('seller.wallet.rechargesAppearHere'),
              variant: 'default',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
