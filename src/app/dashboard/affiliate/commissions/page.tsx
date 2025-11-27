'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import { EmptyState } from '@/components/ui/empty-state';
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
  const { t } = useLanguage();
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
          <h1 className="text-3xl font-bold">{t('affiliate.commissions.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('affiliate.commissions.subtitle')}
          </p>
        </div>
        <Button
          size="lg"
          onClick={() => setPaymentDialogOpen(true)}
          disabled={!balance || parseFloat(balance.availableBalance) < 50}
        >
          <ArrowUpRight className="mr-2 h-4 w-4" />
          {t('affiliate.commissions.requestPayment')}
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <EnhancedStatsCard
          title={t('affiliate.availableBalance')}
          value={formatCommissionAmount(balance?.availableBalance || '0')}
          description={t('affiliate.commissions.readyToWithdraw')}
          icon={DollarSign}
          variant="success"
          isLoading={balanceLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.totalEarned')}
          value={formatCommissionAmount(balance?.totalEarned || '0')}
          description={t('affiliate.commissions.lifetimeEarnings')}
          icon={TrendingUp}
          variant="info"
          isLoading={balanceLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.thisMonth')}
          value={formatCommissionAmount(balance?.thisMonthEarned || '0')}
          description={t('affiliate.commissions.currentMonth')}
          icon={DollarSign}
          variant="info"
          isLoading={balanceLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.commissions.pendingPayments')}
          value={balance?.pendingPayments || 0}
          description={formatCommissionAmount(balance?.pendingPaymentsAmount || '0')}
          icon={Clock}
          variant="warning"
          isLoading={balanceLoading}
        />
      </div>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('affiliate.commissions.commissionHistory')}</CardTitle>
              <CardDescription>{t('affiliate.commissions.allCommissions')}</CardDescription>
            </div>
            <Select
              defaultValue="all"
              onValueChange={handleTypeFilter}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t('affiliate.commissions.filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('affiliate.commissions.allTypes')}</SelectItem>
                <SelectItem value="registration">{t('affiliate.commissions.registration')}</SelectItem>
                <SelectItem value="sale">{t('affiliate.commissions.sale')}</SelectItem>
                <SelectItem value="bonus">{t('affiliate.commissions.bonus')}</SelectItem>
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
                      <TableHead>{t('affiliate.commissions.type')}</TableHead>
                      <TableHead>{t('affiliate.commissions.referralUser')}</TableHead>
                      <TableHead>{t('affiliate.commissions.amount')}</TableHead>
                      <TableHead>{t('affiliate.commissions.date')}</TableHead>
                      <TableHead>{t('affiliate.status')}</TableHead>
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
                                {t('affiliate.commissions.paid')}: {format(new Date(commission.paidAt), 'PP')}
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
              {commissions?.pagination?.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('affiliate.commissions.page')} {commissions.pagination.page} {t('affiliate.commissions.of')} {commissions.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page! - 1)}
                      disabled={filters.page === 1}
                    >
                      {t('affiliate.commissions.previous')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page! + 1)}
                      disabled={filters.page === commissions?.pagination?.totalPages}
                    >
                      {t('affiliate.commissions.next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={DollarSign}
              title={filters.type ? t('affiliate.commissions.noCommissionsFiltered') : t('affiliate.commissions.noCommissions')}
              description={
                filters.type
                  ? t('affiliate.commissions.tryDifferentFilter')
                  : t('affiliate.commissions.commissionsAppearHere')
              }
              variant={filters.type ? 'search' : 'default'}
            />
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
