'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column } from '@/components/admin/DataTable';
import { WithdrawalRequestDialog } from '@/components/provider/WithdrawalRequestDialog';
import {
  useProviderBalance,
  useEarningsTransactions,
  useWithdrawals,
} from '@/lib/hooks/useProviderEarnings';
import { Transaction, WithdrawalRequest } from '@/types/provider';
import { Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function EarningsPage() {
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
      label: 'Type',
      render: (tx) => {
        const config = {
          earning: {
            label: 'Earning',
            icon: TrendingUp,
            color: 'bg-green-500/10 text-green-700 border-green-500/20',
          },
          withdrawal: {
            label: 'Withdrawal',
            icon: TrendingDown,
            color: 'bg-red-500/10 text-red-700 border-red-500/20',
          },
          refund: {
            label: 'Refund',
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
      label: 'Amount',
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
      label: 'Balance After',
      render: (tx) => <span className="font-medium">${tx.balance}</span>,
    },
    {
      key: 'description',
      label: 'Description',
      render: (tx) => (
        <span className="text-sm text-muted-foreground">
          {tx.description || '-'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (tx) => format(new Date(tx.createdAt), 'MMM dd, yyyy HH:mm'),
    },
  ];

  const withdrawalColumns: Column<WithdrawalRequest>[] = [
    {
      key: 'amount',
      label: 'Amount',
      render: (w) => <span className="font-medium">${w.amount}</span>,
    },
    {
      key: 'paymentMethod',
      label: 'Payment Method',
      render: (w) => {
        const labels = {
          paypal: 'PayPal',
          bank_transfer: 'Bank Transfer',
          crypto: 'Cryptocurrency',
        };
        return labels[w.paymentMethod];
      },
    },
    {
      key: 'paymentDetails',
      label: 'Payment Details',
      render: (w) => (
        <span className="text-sm font-mono">{w.paymentDetails}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (w) => {
        const config = {
          pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
          approved: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
          completed: 'bg-green-500/10 text-green-700 border-green-500/20',
          rejected: 'bg-red-500/10 text-red-700 border-red-500/20',
        };
        return (
          <Badge variant="outline" className={config[w.status]}>
            {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: 'requestedAt',
      label: 'Requested',
      render: (w) => format(new Date(w.requestedAt), 'MMM dd, yyyy'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Earnings & Withdrawals</h1>
          <p className="text-muted-foreground mt-2">
            Manage your balance and withdrawal requests
          </p>
        </div>
        <WithdrawalRequestDialog availableBalance={availableBalance} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${balance ? parseFloat(balance.balance).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for withdrawal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Earnings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${balance ? parseFloat(balance.totalEarnings).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Lifetime earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Withdrawn
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${balance ? parseFloat(balance.totalWithdrawals).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Successfully withdrawn
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Withdrawals
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${balance ? parseFloat(balance.pendingWithdrawals).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All earnings and withdrawals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="txStartDate">Start Date</Label>
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
                <Label htmlFor="txEndDate">End Date</Label>
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
                  Clear Filters
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
              emptyMessage="No transactions yet. Your earnings will appear here."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
          <CardDescription>Track your withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={withdrawals}
            columns={withdrawalColumns}
            isLoading={withdrawalsLoading}
            emptyMessage="No withdrawal requests yet. Request a withdrawal to get started."
          />
        </CardContent>
      </Card>
    </div>
  );
}
