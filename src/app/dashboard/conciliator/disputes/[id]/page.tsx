'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/auth/useAuth';
import { useDisputeDetails } from '@/lib/hooks/useDisputes';
import { useDisputeMessages } from '@/lib/hooks/useDisputeMessages';
import { DisputeDetailsCard } from '@/components/conciliator/DisputeDetailsCard';
import { DisputeTimeline } from '@/components/conciliator/DisputeTimeline';
import { DisputeMessageForm } from '@/components/conciliator/DisputeMessageForm';
import { ResolveDisputeForm } from '@/components/conciliator/ResolveDisputeForm';
import { ResolutionTypeBadge } from '@/components/conciliator/ResolutionTypeBadge';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DisputeDetailsPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const disputeId = params.id as string;

  const { data: dispute, isLoading: disputeLoading } = useDisputeDetails(disputeId);
  const { data: messagesData, isLoading: messagesLoading } = useDisputeMessages(disputeId);

  const canResolve =
    dispute &&
    dispute.status === 'under_review' &&
    dispute.conciliatorId === user?.id;

  const isResolved = dispute && (dispute.status === 'resolved' || dispute.status === 'closed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{t('conciliator.details.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {disputeLoading ? t('conciliator.details.loading') : `${t('conciliator.details.disputeId')}: ${disputeId.slice(0, 12)}...`}
          </p>
        </div>
      </div>

      {disputeLoading ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : dispute ? (
        <>
          {/* Dispute Details */}
          <DisputeDetailsCard dispute={dispute} />

          {/* Resolution Badge if resolved */}
          {isResolved && dispute.resolutionType && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-400">
                  {t('conciliator.details.resolution')}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <ResolutionTypeBadge
                    resolutionType={dispute.resolutionType}
                    partialRefundPercentage={dispute.partialRefundPercentage}
                  />
                </CardDescription>
              </CardHeader>
              {dispute.resolution && (
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{dispute.resolution}</p>
                </CardContent>
              )}
            </Card>
          )}

          <Separator />

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Timeline & Messages */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('conciliator.details.timelineMessages')}</CardTitle>
                  <CardDescription>
                    {t('conciliator.details.timelineDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : messagesData ? (
                    <DisputeTimeline dispute={dispute} messages={messagesData.messages} />
                  ) : null}
                </CardContent>
              </Card>

              {/* Message Form - Solo si no está resuelta */}
              {!isResolved && (
                <DisputeMessageForm disputeId={disputeId} />
              )}
            </div>

            {/* Resolution Form - Solo si puedo resolver */}
            <div className="lg:col-span-1">
              {canResolve ? (
                <ResolveDisputeForm
                  dispute={dispute}
                  onSuccess={() => router.push('/dashboard/conciliator')}
                />
              ) : isResolved ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('conciliator.details.disputeResolved')}</CardTitle>
                    <CardDescription>
                      {t('conciliator.details.disputeResolvedDesc')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : dispute.status === 'open' ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('conciliator.details.notAssigned')}</CardTitle>
                    <CardDescription>
                      {t('conciliator.details.notAssignedDesc')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('conciliator.details.assignedToAnother')}</CardTitle>
                    <CardDescription>
                      {dispute.conciliator
                        ? `${t('conciliator.details.assignedToAnotherDesc')} ${dispute.conciliator.name}`
                        : t('conciliator.details.assignedToSomeoneElse')}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t('conciliator.details.disputeNotFound')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
