'use client';

import { useState } from 'react';
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
      label: 'Type',
      render: (transaction) => <TransactionTypeBadge type={transaction.type} />,
    },
    {
      key: 'description',
      label: 'Description',
      render: (transaction) => (
        <span className="text-sm">{transaction.description}</span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
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
      label: 'Balance After',
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
      label: 'Date',
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
      label: 'Recharge ID',
      render: (recharge) => (
        <span className="font-mono text-xs">{recharge.id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (recharge) => (
        <span className="font-medium">{formatCurrency(recharge.amount)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Payment Method',
      render: (recharge) => (
        <span className="text-sm capitalize">
          {recharge.paymentMethod.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (recharge) => <RechargeStatusBadge status={recharge.status} />,
    },
    {
      key: 'createdAt',
      label: 'Requested',
      render: (recharge) => (
        <span className="text-sm">
          {format(new Date(recharge.createdAt), 'PPp')}
        </span>
      ),
    },
    {
      key: 'completedAt',
      label: 'Completed',
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
          <h1 className="text-3xl font-bold">My Wallet</h1>
          <p className="text-muted-foreground mt-2">
            Manage your balance, transactions, and recharges
          </p>
        </div>
        <RechargeDialog currentBalance={balance?.balance} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-2">
          <CardHeader className="pb-3">
            <CardDescription>Current Balance</CardDescription>
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
          title="Total Recharged"
          value={formatCurrency(totalRecharged.toFixed(2))}
          description="Lifetime recharges"
          icon={TrendingUp}
          isLoading={rechargesLoading}
        />

        <StatsCard
          title="Pending Recharges"
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
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                {pagination
                  ? `Showing ${transactions.length} of ${pagination.total} transactions`
                  : 'All your wallet transactions'}
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
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
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
            emptyMessage="No transactions yet."
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
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {filters.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))
                }
                disabled={filters.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recharges */}
      <Card>
        <CardHeader>
          <CardTitle>Recharge History</CardTitle>
          <CardDescription>
            All your recharge requests and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={rechargesList}
            columns={rechargeColumns}
            isLoading={rechargesLoading}
            emptyMessage="No recharge requests yet. Click 'Add Funds' to request a recharge."
          />
        </CardContent>
      </Card>
    </div>
  );
}
