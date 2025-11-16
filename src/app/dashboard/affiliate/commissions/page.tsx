'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, Clock, ArrowUpRight, Filter } from 'lucide-react';
import {
  useAffiliateCommissions,
  useCommissionBalance,
} from '@/lib/hooks';
import { CommissionFilters } from '@/types/affiliate';
import {
  CommissionTypeBadge,
  PaymentRequestDialog,
} from '@/components/affiliate';
import { formatCommissionAmount, getBalanceColorClass } from '@/lib/utils/affiliate';

export default function CommissionsPage() {
  const [filters, setFilters] = useState<CommissionFilters>({
    page: 1,
    limit: 10,
  });
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const { data: balance, isLoading: balanceLoading } = useCommissionBalance();
  const { data: commissions, isLoading: commissionsLoading } = useAffiliateCommissions(filters);

  const handleTypeFilter = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      type: type === 'all' ? undefined : (type as any),
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const getCommissionStatusBadge = (status: string) => {
    const variants = {
      paid: { variant: 'default' as const, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      pending: { variant: 'secondary' as const, className: '' },
      rejected: { variant: 'destructive' as const, className: '' },
    };
    const config = variants[status as keyof typeof variants] || variants.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Commissions</h1>
          <p className="text-muted-foreground mt-2">
            Track your earnings and request payments
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setPaymentDialogOpen(true)}
          disabled={!balance || parseFloat(balance.availableBalance) < 50}
        >
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Request Payment
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${getBalanceColorClass(balance?.availableBalance || '0')}`}>
                  {formatCommissionAmount(balance?.availableBalance || '0')}
                </div>
                <p className="text-xs text-muted-foreground">Ready to withdraw</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCommissionAmount(balance?.totalEarned || '0')}
                </div>
                <p className="text-xs text-muted-foreground">Lifetime earnings</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCommissionAmount(balance?.thisMonthEarned || '0')}
                </div>
                <p className="text-xs text-muted-foreground">Current month</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-600">
                  {balance?.pendingPayments || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCommissionAmount(balance?.pendingPaymentsAmount || '0')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commission History</CardTitle>
              <CardDescription>All commissions you have earned</CardDescription>
            </div>
            <Select
              defaultValue="all"
              onValueChange={handleTypeFilter}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="registration">Registration</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="bonus">Bonus</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : commissions && commissions.data.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Referral User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.data.map((commission: any) => (
                      <TableRow key={commission.id}>
                        <TableCell>
                          <CommissionTypeBadge type={commission.type} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{commission.referralUser.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {commission.referralUser.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">
                            {formatCommissionAmount(commission.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{format(new Date(commission.createdAt), 'PP')}</div>
                            {commission.paidAt && (
                              <div className="text-xs text-muted-foreground">
                                Paid: {format(new Date(commission.paidAt), 'PP')}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getCommissionStatusBadge(commission.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {commissions.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {commissions.pagination.page} of {commissions.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page! - 1)}
                      disabled={filters.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page! + 1)}
                      disabled={filters.page === commissions.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No commissions found. Start referring users to earn commissions!
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Request Dialog */}
      {balance && (
        <PaymentRequestDialog
          availableBalance={balance.availableBalance}
          isOpen={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
        />
      )}
    </div>
  );
}
