'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, TrendingUp, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConciliatorPerformance, useMyHistory } from '@/lib/hooks/useConciliatorPerformance';
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ResolutionStatsChart } from '@/components/conciliator/ResolutionStatsChart';
import { ResolutionTypeBadge } from '@/components/conciliator/ResolutionTypeBadge';
import { calculateResolutionTime, formatResolutionTime } from '@/lib/utils/conciliator';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ConciliatorHistoryPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);

  const { data: performance, isLoading: performanceLoading } = useConciliatorPerformance();
  const { data: history, isLoading: historyLoading } = useMyHistory({ page, limit: 10 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('conciliator.history.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('conciliator.history.subtitle')}
        </p>
      </div>

      {/* Performance Stats */}
      {performanceLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : performance ? (
        <div className="grid gap-4 md:grid-cols-4">
          <EnhancedStatsCard
            title={t('conciliator.history.totalResolved')}
            value={performance.totalResolved}
            description={t('conciliator.history.allTime')}
            icon={CheckCircle}
            variant="success"
            isLoading={performanceLoading}
          />
          <EnhancedStatsCard
            title={t('conciliator.history.avgResolutionTime')}
            value={`${parseFloat(String(performance.averageResolutionTimeHours)).toFixed(1)}h`}
            description={t('conciliator.history.averageTime')}
            icon={Clock}
            variant="info"
            isLoading={performanceLoading}
          />
          <EnhancedStatsCard
            title={t('conciliator.history.refundRate')}
            value={`${parseFloat(String(performance.refundRate)).toFixed(0)}%`}
            description={t('conciliator.history.refundRateDesc')}
            icon={TrendingUp}
            variant="warning"
            isLoading={performanceLoading}
          />
          <EnhancedStatsCard
            title={t('conciliator.history.thisWeek')}
            value={performance.thisWeekResolved}
            description={t('conciliator.history.resolvedThisWeek')}
            icon={CheckCircle}
            variant="success"
            isLoading={performanceLoading}
          />
        </div>
      ) : null}

      {/* Resolutions Chart */}
      {performanceLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      ) : performance ? (
        <ResolutionStatsChart data={performance.resolutionsByType} />
      ) : null}

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('conciliator.history.resolvedDisputes')}</CardTitle>
          <CardDescription>
            {history
              ? `${t('conciliator.history.showing')} ${(page - 1) * 10 + 1}-${Math.min(page * 10, history.pagination.total)} ${t('conciliator.history.of')} ${history.pagination.total} ${t('conciliator.history.disputesText')}`
              : t('conciliator.history.loading')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : history && history.disputes.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('conciliator.history.disputeId')}</TableHead>
                    <TableHead>{t('conciliator.history.product')}</TableHead>
                    <TableHead>{t('conciliator.history.sellerProvider')}</TableHead>
                    <TableHead>{t('conciliator.history.resolutionType')}</TableHead>
                    <TableHead>{t('conciliator.history.resolutionTime')}</TableHead>
                    <TableHead>{t('conciliator.history.resolvedAt')}</TableHead>
                    <TableHead className="text-right">{t('conciliator.history.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.disputes.map((dispute) => {
                    const resolutionTime = calculateResolutionTime(dispute);
                    return (
                      <TableRow key={dispute.id}>
                        <TableCell className="font-mono text-xs">
                          {dispute.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className="mb-1">
                              {dispute.purchase.product.category}
                            </Badge>
                            <p className="text-sm font-medium">{dispute.purchase.product.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">{t('conciliator.history.seller')}:</span> {dispute.seller.name}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">{t('conciliator.history.provider')}:</span> {dispute.provider.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {dispute.resolutionType && (
                            <ResolutionTypeBadge
                              resolutionType={dispute.resolutionType}
                              partialRefundPercentage={dispute.partialRefundPercentage}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {resolutionTime !== null ? (
                            <span className="text-sm font-medium">
                              {formatResolutionTime(resolutionTime)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {dispute.resolvedAt ? (
                            <div>
                              <p className="text-sm">{format(new Date(dispute.resolvedAt), 'MMM d, yyyy')}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(dispute.resolvedAt), 'hh:mm a')}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/dashboard/conciliator/disputes/${dispute.id}`}>
                              <Eye className="mr-1 h-3 w-3" />
                              {t('conciliator.history.view')}
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={CheckCircle}
              title={t('conciliator.history.noResolvedDisputes')}
              description={t('conciliator.history.noResolvedDisputesDescription')}
              variant="default"
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {history && history.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t('conciliator.history.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('conciliator.history.page')} {page} {t('conciliator.history.of')} {history.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(history.pagination.totalPages, p + 1))}
            disabled={page === history.pagination.totalPages}
          >
            {t('conciliator.history.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
