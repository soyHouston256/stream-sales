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
import { Wallet, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('seller.wallet.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('seller.wallet.subtitle')}
          </p>
        </div>
        <RechargeDialog currentBalance={balance?.balance} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-2">
          <CardHeader className="pb-3">
            <CardDescription>{t('seller.wallet.currentBalance')}</CardDescription>
            <CardTitle className="text-4xl">
              {balance ? formatCurrency(balance.balance) : '$0.00'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {balance?.currency || 'USD'} • {balance?.status || 'active'}
              </span>
            </div>
          </CardContent>
        </Card>

        <StatsCard
          title={t('seller.wallet.totalRecharged')}
          value={formatCurrency(totalRecharged.toFixed(2))}
          description={t('seller.wallet.lifetimeRecharges')}
          icon={TrendingUp}
          isLoading={rechargesLoading}
        />

        <StatsCard
          title={t('seller.wallet.pendingRecharges')}
          value={pendingRecharges.length}
          description={formatCurrency(pendingAmount.toFixed(2))}
          icon={Clock}
          isLoading={rechargesLoading}
        />
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('seller.wallet.transactionHistory')}</CardTitle>
              <CardDescription>
                {pagination
                  ? `${t('seller.wallet.showing')} ${transactions.length} ${t('seller.wallet.of')} ${pagination.total} ${t('seller.wallet.transactions')}`
                  : t('seller.wallet.allTransactions')}
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
                {t('seller.wallet.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('seller.wallet.page')} {filters.page} {t('seller.wallet.of')} {pagination.totalPages}
              </span>
              <Button
                variant="outline"
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
          />
        </CardContent>
      </Card>
    </div>
  );
}
