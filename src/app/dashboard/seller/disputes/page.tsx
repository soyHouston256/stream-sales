'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSellerDisputes } from '@/lib/hooks/useSellerDisputes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { AlertCircle, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils/seller';

export default function SellerDisputesPage() {
  const { t } = useLanguage();
  const { data, isLoading, error } = useSellerDisputes();

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { variant: 'secondary' as const, label: t('disputes.statusPending') },
      assigned: { variant: 'default' as const, label: t('disputes.statusAssigned') },
      in_progress: { variant: 'default' as const, label: t('disputes.statusInProgress') },
      resolved: { variant: 'default' as const, label: t('disputes.statusResolved') },
      closed: { variant: 'outline' as const, label: t('disputes.statusClosed') },
    };

    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const getResolutionBadge = (resolution?: string) => {
    if (!resolution) return null;

    const resolutionMap = {
      refund_seller: { variant: 'default' as const, label: t('disputes.refundSeller') },
      refund_provider: { variant: 'secondary' as const, label: t('disputes.refundProvider') },
      partial_refund: { variant: 'secondary' as const, label: t('disputes.partialRefund') },
      no_refund: { variant: 'outline' as const, label: t('disputes.noRefund') },
    };

    const config = resolutionMap[resolution as keyof typeof resolutionMap];
    if (!config) return null;

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('disputes.myDisputes')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('disputes.viewYourDisputes')}
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : t('common.error')}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('disputes.myDisputes')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('disputes.viewYourDisputes')}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data?.disputes && data.disputes.length === 0 && (
        <EmptyState
          icon={AlertCircle}
          title={t('disputes.noDisputes')}
          description={t('disputes.noDisputesDescription')}
          variant="default"
        />
      )}

      {/* Disputes List */}
      {!isLoading && data?.disputes && data.disputes.length > 0 && (
        <div className="space-y-4">
          {data.disputes.map((dispute) => (
            <Card key={dispute.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">
                        {dispute.purchase.product.name}
                      </CardTitle>
                      {getStatusBadge(dispute.status)}
                      {getResolutionBadge(dispute.resolution)}
                    </div>
                    <CardDescription>
                      <span className="font-medium">{t('disputes.disputeId')}:</span> {dispute.id}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    {t('disputes.viewDetails')}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Purchase Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('disputes.purchaseAmount')}</p>
                    <p className="font-semibold">{formatCurrency(dispute.purchase.amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('disputes.provider')}</p>
                    <p className="font-medium">{dispute.provider.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('disputes.category')}</p>
                    <p className="font-medium">{dispute.purchase.product.category}</p>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <p className="text-sm font-medium mb-1">{t('disputes.reason')}:</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    {dispute.reason}
                  </p>
                </div>

                {/* Dates */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>
                    {t('disputes.created')}: {format(new Date(dispute.createdAt), 'PPp')}
                  </span>
                  {dispute.resolvedAt && (
                    <span>
                      {t('disputes.resolved')}: {format(new Date(dispute.resolvedAt), 'PPp')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
