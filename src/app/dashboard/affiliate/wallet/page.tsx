'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, Column } from '@/components/admin/DataTable';
import { StatCard } from '@/components/ui/stat-card';
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
import { Wallet, TrendingUp, Clock, Receipt, Filter } from 'lucide-react';

import { useAuth } from '@/lib/auth/useAuth';

export default function AffiliateWalletPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [rechargeOpen, setRechargeOpen] = useState(false);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{t('affiliate.wallet.title')}</h1>
            {balance?.status === 'active' && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Wallet size={14} className="mr-1" />
                {balance.status}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            {t('affiliate.wallet.subtitle')}
          </p>
        </div>
        <RechargeDialog
          currentBalance={balance?.balance}
          role="affiliate"
          open={rechargeOpen}
          onOpenChange={setRechargeOpen}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label={t('affiliate.wallet.currentBalance')}
          value={balance ? formatCurrency(balance.balance) : '$0.00'}
          description={`${balance?.currency || 'USD'} • ${balance?.status || 'active'}`}
          icon={Wallet}
          color="green"
          isLoading={balanceLoading}
        />

        <StatCard
          label={t('affiliate.wallet.totalRecharged')}
          value={formatCurrency(totalRecharged.toFixed(2))}
          description={t('affiliate.wallet.completedRecharges')}
          icon={TrendingUp}
          color="blue"
          isLoading={rechargesLoading}
        />

        <StatCard
          label={t('affiliate.wallet.pendingRecharges')}
          value={pendingRecharges.length.toString()}
          description={formatCurrency(pendingAmount.toFixed(2))}
          icon={Clock}
          color="orange"
          isLoading={rechargesLoading}
        />
      </div>

      {/* Transactions */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{t('affiliate.wallet.transactionHistory')}</CardTitle>
          </div>
          <CardDescription>
            {pagination
              ? t('affiliate.wallet.showingTransactions')
                .replace('{count}', transactions.length.toString())
                .replace('{total}', pagination.total.toString())
              : t('affiliate.wallet.allTransactions')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filter Section */}
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
                <SelectTrigger className="w-[200px] rounded-xl">
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

            {/* Transactions Table */}
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
                  size="sm"
                  className="rounded-xl"
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
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))
                  }
                  disabled={filters.page === pagination.totalPages}
                >
                  {t('affiliate.wallet.next')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recharges */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{t('affiliate.wallet.rechargeHistory')}</CardTitle>
          </div>
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
