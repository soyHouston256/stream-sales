'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/admin/DataTable';
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import { EmptyState } from '@/components/ui/empty-state';
import { WithdrawalRequestDialog } from '@/components/provider/WithdrawalRequestDialog';
import {
  useProviderBalance,
  useEarningsTransactions,
  useWithdrawals,
} from '@/lib/hooks/useProviderEarnings';
import { Transaction, WithdrawalRequest } from '@/types/provider';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EarningsPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: balance, isLoading: balanceLoading } = useProviderBalance();
  const { data: transactionsData, isLoading: transactionsLoading } =
    useEarningsTransactions({
      page,
      limit: 10,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useWithdrawals();

  const transactions = transactionsData?.data || [];
  const availableBalance = balance ? parseFloat(balance.balance) : 0;

  const transactionColumns: Column<Transaction>[] = [
    {
      key: 'type',
      label: t('provider.earnings.type'),
      render: (tx) => {
        const config = {
          earning: {
            label: t('provider.earnings.earning'),
            icon: TrendingUp,
            color: 'bg-green-500/10 text-green-700 border-green-500/20',
          },
          withdrawal: {
            label: t('provider.earnings.withdrawal'),
            icon: TrendingDown,
            color: 'bg-red-500/10 text-red-700 border-red-500/20',
          },
          refund: {
            label: t('provider.earnings.refund'),
            icon: TrendingDown,
            color: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
          },
        };

        const { label, icon: Icon, color } = config[tx.type];

        return (
          <Badge variant="outline" className={color}>
            <Icon className="h-3 w-3 mr-1" />
            {label}
          </Badge>
        );
      },
    },
    {
      key: 'amount',
      label: t('provider.earnings.amount'),
      render: (tx) => {
        const isPositive = tx.type === 'earning';
        return (
          <span
            className={`font-medium ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isPositive ? '+' : '-'}${tx.amount}
          </span>
        );
      },
    },
    {
      key: 'balance',
      label: t('provider.earnings.balanceAfter'),
      render: (tx) => <span className="font-medium">${tx.balance}</span>,
    },
    {
      key: 'description',
      label: t('provider.earnings.description'),
      render: (tx) => (
        <span className="text-sm text-muted-foreground">
          {tx.description || '-'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: t('provider.date'),
      render: (tx) => format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm'),
    },
  ];

  const withdrawalColumns: Column<WithdrawalRequest>[] = [
    {
      key: 'amount',
      label: t('provider.earnings.amount'),
      render: (w) => <span className="font-medium">${w.amount}</span>,
    },
    {
      key: 'paymentMethod',
      label: t('provider.earnings.paymentMethod'),
      render: (w) => {
        const labels = {
          paypal: t('provider.earnings.paypal'),
          bank_transfer: t('provider.earnings.bankTransfer'),
          crypto: t('provider.earnings.crypto'),
        };
        return labels[w.paymentMethod];
      },
    },
    {
      key: 'paymentDetails',
      label: t('provider.earnings.paymentDetails'),
      render: (w) => (
        <span className="text-sm font-mono">{w.paymentDetails}</span>
      ),
    },
    {
      key: 'status',
      label: t('products.status'),
      render: (w) => {
        const config = {
          pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
          approved: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
          completed: 'bg-green-500/10 text-green-700 border-green-500/20',
          rejected: 'bg-red-500/10 text-red-700 border-red-500/20',
        };
        const statusLabels = {
          pending: t('provider.earnings.pending'),
          approved: t('provider.earnings.approved'),
          completed: t('provider.earnings.completed'),
          rejected: t('provider.earnings.rejected'),
        };
        return (
          <Badge variant="outline" className={config[w.status]}>
            {statusLabels[w.status]}
          </Badge>
        );
      },
    },
    {
      key: 'requestedAt',
      label: t('provider.earnings.requested'),
      render: (w) => format(new Date(w.requestedAt), 'MMM dd, yyyy'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('provider.earnings.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('provider.earnings.subtitle')}
          </p>
        </div>
        <WithdrawalRequestDialog availableBalance={availableBalance} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <EnhancedStatsCard
          title={t('provider.earnings.availableBalance')}
          value={balance ? `$${parseFloat(balance.balance).toFixed(2)}` : '$0.00'}
          description={t('provider.earnings.readyForWithdrawal')}
          icon={Wallet}
          variant="success"
          isLoading={balanceLoading}
        />

        <EnhancedStatsCard
          title={t('provider.earnings.totalEarnings')}
          value={balance ? `$${parseFloat(balance.totalEarnings).toFixed(2)}` : '$0.00'}
          description={t('provider.earnings.lifetimeEarnings')}
          icon={TrendingUp}
          variant="info"
          isLoading={balanceLoading}
        />

        <EnhancedStatsCard
          title={t('provider.earnings.totalWithdrawn')}
          value={balance ? `$${parseFloat(balance.totalWithdrawals).toFixed(2)}` : '$0.00'}
          description={t('provider.earnings.successfullyWithdrawn')}
          icon={TrendingDown}
          variant="warning"
          isLoading={balanceLoading}
        />

        <EnhancedStatsCard
          title={t('provider.earnings.pendingWithdrawals')}
          value={balance ? `$${parseFloat(balance.pendingWithdrawals).toFixed(2)}` : '$0.00'}
          description={t('provider.earnings.awaitingApproval')}
          icon={DollarSign}
          variant="warning"
          isLoading={balanceLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('provider.earnings.transactionHistory')}</CardTitle>
          <CardDescription>{t('provider.earnings.allEarningsWithdrawals')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="txStartDate">{t('provider.earnings.startDate')}</Label>
                <Input
                  id="txStartDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="txEndDate">{t('provider.earnings.endDate')}</Label>
                <Input
                  id="txEndDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setPage(1);
                  }}
                  className="w-full"
                >
                  {t('provider.earnings.clearFilters')}
                </Button>
              </div>
            </div>

            <DataTable
              data={transactions}
              columns={transactionColumns}
              isLoading={transactionsLoading}
              pagination={
                transactionsData
                  ? {
                      currentPage: transactionsData.pagination.page,
                      totalPages: transactionsData.pagination.totalPages,
                      onPageChange: setPage,
                    }
                  : undefined
              }
              emptyMessage={t('provider.earnings.noTransactions')}
              emptyState={{
                icon: DollarSign,
                title: startDate || endDate ? t('provider.earnings.noTransactionsFiltered') : t('provider.earnings.noTransactions'),
                description: startDate || endDate
                  ? t('provider.earnings.tryDifferentFilters')
                  : t('provider.earnings.transactionsAppearHere'),
                variant: startDate || endDate ? 'search' : 'default',
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('provider.earnings.withdrawalRequests')}</CardTitle>
          <CardDescription>{t('provider.earnings.trackRequests')}</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={withdrawals}
            columns={withdrawalColumns}
            isLoading={withdrawalsLoading}
            emptyMessage={t('provider.earnings.noWithdrawals')}
            emptyState={{
              icon: Wallet,
              title: t('provider.earnings.noWithdrawals'),
              description: t('provider.earnings.withdrawalsAppearHere'),
              variant: 'default',
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
