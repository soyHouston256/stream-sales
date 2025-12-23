'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  useWalletBalance,
  useWalletTransactions,
  useRecharges,
} from '@/lib/hooks/useSellerWallet';
import { useAffiliationStatus } from '@/lib/hooks/useAffiliationStatus';
import { WalletTransaction, Recharge, TransactionsFilters } from '@/types/seller';
import {
  TransactionTypeBadge,
  RechargeStatusBadge,
  RechargeDialog,
} from '@/components/seller';
import { formatCurrency } from '@/lib/utils/seller';
import { format } from 'date-fns';
import { Wallet, TrendingUp, Clock, Receipt, Filter, AlertCircle, ShieldAlert } from 'lucide-react';

export default function WalletPage() {
  const { t } = useLanguage();
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [filters, setFilters] = useState<TransactionsFilters>({
    page: 1,
    limit: 10,
  });

  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const { data: transactionsData, isLoading: transactionsLoading } =
    useWalletTransactions(filters);
  const { data: recharges, isLoading: rechargesLoading } = useRecharges();
  const { data: affiliationStatus, isLoading: affiliationLoading } = useAffiliationStatus();

  const transactions = transactionsData?.data || [];
  const pagination = transactionsData?.pagination;
  const rechargesList = recharges || [];

  // Check if user can make recharges
  const canRecharge = !affiliationStatus || affiliationStatus.canRecharge;

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{t('seller.wallet.title')}</h1>
            {balance?.status === 'active' && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <Wallet size={14} className="mr-1" />
                {balance.status}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            {t('seller.wallet.subtitle')}
          </p>
        </div>
        <RechargeDialog
          currentBalance={balance?.balance}
          open={rechargeOpen}
          onOpenChange={setRechargeOpen}
          trigger={
            <Button
              onClick={() => setRechargeOpen(true)}
              disabled={!canRecharge || affiliationLoading}
              className="px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95 hover:shadow-xl hover:shadow-primary/30"
              size="lg"
            >
              <Wallet size={20} />
              <span className="hidden sm:inline">{t('wallet.recharge')}</span>
              <span className="sm:hidden">Agregar</span>
            </Button>
          }
        />
      </div>

      {/* Affiliation Approval Status Alert */}
      {!canRecharge && affiliationStatus && (
        <Alert variant="destructive" className="border-l-4">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t('seller.wallet.pendingApprovalTitle')}</AlertTitle>
          <AlertDescription
            dangerouslySetInnerHTML={{
              __html: affiliationStatus.approvalStatus === 'rejected'
                ? t('seller.wallet.rejectedByReferrer')
                : t('seller.wallet.pendingApprovalMessage').replace(
                  '{affiliateName}',
                  affiliationStatus.affiliateName || ''
                ),
            }}
          />
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label={t('seller.wallet.currentBalance')}
          value={balance ? formatCurrency(balance.balance) : '$0.00'}
          description={`${balance?.currency || 'USD'} • ${balance?.status || 'active'}`}
          icon={Wallet}
          color="green"
          isLoading={balanceLoading}
        />

        <StatCard
          label={t('seller.wallet.totalRecharged')}
          value={formatCurrency(totalRecharged.toFixed(2))}
          description={t('seller.wallet.lifetimeRecharges')}
          icon={TrendingUp}
          color="blue"
          isLoading={rechargesLoading}
        />

        <StatCard
          label={t('seller.wallet.pendingRecharges')}
          value={pendingRecharges.length.toString()}
          description={formatCurrency(pendingAmount.toFixed(2))}
          icon={Clock}
          color="orange"
          isLoading={rechargesLoading}
        />
      </div>

      {/* Filters Card */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{t('seller.wallet.transactionHistory')}</CardTitle>
          </div>
          <CardDescription>
            {pagination
              ? `${t('seller.wallet.showing')} ${transactions.length} ${t('seller.wallet.of')} ${pagination.total} ${t('seller.wallet.transactions')}`
              : t('seller.wallet.allTransactions')}
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

            {/* Transactions Table */}
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
                  className="rounded-xl"
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
                  className="rounded-xl"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))
                  }
                  disabled={filters.page === pagination.totalPages}
                >
                  {t('seller.wallet.next')}
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
            <CardTitle className="text-lg">{t('seller.wallet.rechargeHistory')}</CardTitle>
          </div>
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
