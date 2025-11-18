'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Clock, Inbox, Search } from 'lucide-react';
import { useDisputes } from '@/lib/hooks/useDisputes';
import { DisputesTable } from '@/components/conciliator/DisputesTable';
import { StatsCard } from '@/components/conciliator/StatsCard';
import { DisputeStatus } from '@/types/conciliator';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DisputesQueuePage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<DisputeStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = {
    page,
    limit: 10,
    ...(status !== 'all' && { status }),
  };

  const { data, isLoading } = useDisputes(filters);

  // Calcular stats rápidas de la data actual
  const quickStats = data
    ? {
        open: data.disputes.filter((d) => d.status === 'open').length,
        underReview: data.disputes.filter((d) => d.status === 'under_review').length,
        resolved: data.disputes.filter((d) => d.status === 'resolved').length,
        total: data.pagination?.total || 0,
      }
    : null;

  const filteredDisputes = data?.disputes.filter((dispute) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      dispute.id.toLowerCase().includes(query) ||
      dispute.seller.name.toLowerCase().includes(query) ||
      dispute.seller.email.toLowerCase().includes(query) ||
      dispute.provider.name.toLowerCase().includes(query) ||
      dispute.provider.email.toLowerCase().includes(query) ||
      dispute.purchase.product.name.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('conciliator.disputes.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('conciliator.disputes.subtitle')}
        </p>
      </div>

      {/* Quick Stats */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : quickStats ? (
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title={t('conciliator.disputes.totalOpen')}
            value={quickStats.open}
            description={t('conciliator.disputes.awaitingAssignment')}
            icon={Inbox}
          />
          <StatsCard
            title={t('conciliator.disputes.underReview')}
            value={quickStats.underReview}
            description={t('conciliator.disputes.beingReviewed')}
            icon={Clock}
          />
          <StatsCard
            title={t('conciliator.disputes.resolved')}
            value={quickStats.resolved}
            description={t('conciliator.disputes.thisPage')}
            icon={CheckCircle}
          />
          <StatsCard
            title={t('conciliator.disputes.totalDisputes')}
            value={quickStats.total}
            description={t('conciliator.disputes.allTime')}
            icon={AlertCircle}
          />
        </div>
      ) : null}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('conciliator.disputes.filters')}</CardTitle>
          <CardDescription>{t('conciliator.disputes.searchAndFilter')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="status">{t('conciliator.disputes.status')}</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as DisputeStatus | 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder={t('conciliator.disputes.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('conciliator.disputes.allStatuses')}</SelectItem>
                  <SelectItem value="open">{t('conciliator.disputes.open')}</SelectItem>
                  <SelectItem value="under_review">{t('conciliator.disputes.underReview')}</SelectItem>
                  <SelectItem value="resolved">{t('conciliator.disputes.resolved')}</SelectItem>
                  <SelectItem value="closed">{t('conciliator.disputes.closed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="search">{t('conciliator.disputes.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={t('conciliator.disputes.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disputes Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('conciliator.disputes.disputesTable')}</CardTitle>
          <CardDescription>
            {data
              ? `${t('conciliator.disputes.showing')} ${(page - 1) * 10 + 1}-${Math.min(page * 10, data.pagination?.total || 0)} ${t('conciliator.disputes.of')} ${data.pagination?.total || 0} ${t('conciliator.disputes.disputesText')}`
              : t('conciliator.disputes.loading')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredDisputes && filteredDisputes.length > 0 ? (
            <DisputesTable
              disputes={filteredDisputes}
              showAssignButton={true}
              showConciliator={true}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('conciliator.disputes.noDisputes')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            {t('conciliator.disputes.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('conciliator.disputes.page')} {page} {t('conciliator.disputes.of')} {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(data.pagination?.totalPages || 1, p + 1))}
            disabled={page === data.pagination?.totalPages}
          >
            {t('conciliator.disputes.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
