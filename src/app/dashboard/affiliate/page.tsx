'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import { Users, Clock, CheckCircle, XCircle, ArrowRight, AlertCircle, Wallet } from 'lucide-react';
import {
  useAffiliateInfo,
  useAffiliateStats,
  useReferrals,
} from '@/lib/hooks';
import {
  ReferralCodeCard,
  ReferralApprovalStatusBadge,
} from '@/components/affiliate';
import { useAffiliateWalletBalance } from '@/lib/hooks/useAffiliateWallet';
import { useRouter } from 'next/navigation';

export default function AffiliateDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { data: affiliateInfo, isLoading: infoLoading, error: infoError } = useAffiliateInfo();
  const { data: stats, isLoading: statsLoading } = useAffiliateStats();
  const { data: walletBalance, isLoading: walletLoading } = useAffiliateWalletBalance();
  const { data: allReferrals, isLoading: referralsLoading } = useReferrals({
    page: 1,
    limit: 10,
  });

  // Calculate approval status counts
  const pendingReferrals = allReferrals?.data?.filter((r: any) => r.approvalStatus === 'pending') || [];
  const approvedReferrals = allReferrals?.data?.filter((r: any) => r.approvalStatus === 'approved') || [];
  const rejectedReferrals = allReferrals?.data?.filter((r: any) => r.approvalStatus === 'rejected') || [];

  // Handle different affiliate status states
  if (infoError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('affiliate.title')}</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('affiliate.notEnrolled')}
          </AlertDescription>
        </Alert>
        <Card>
          <CardHeader>
            <CardTitle>{t('affiliate.notAffiliateYet')}</CardTitle>
            <CardDescription>
              {t('affiliate.joinProgram')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/affiliate/apply">
              <Button>
                {t('affiliate.applyToProgram')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show pending status
  if (affiliateInfo && (affiliateInfo.status === 'pending' || affiliateInfo.status === 'rejected')) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('affiliate.title')}</h1>
        </div>
        {affiliateInfo.status === 'pending' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('affiliate.pendingApplication')}
            </AlertDescription>
          </Alert>
        )}
        {affiliateInfo.status === 'rejected' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('affiliate.rejectedApplication')}
              {affiliateInfo.rejectionReason && (
                <div className="mt-2">
                  <strong>{t('affiliate.reason')}:</strong> {affiliateInfo.rejectionReason}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>{t('affiliate.applicationStatus')}</CardTitle>
            <CardDescription>
              {t('affiliate.applicationDetails')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <strong>{t('affiliate.status')}:</strong> {affiliateInfo.status}
            </div>
            <div>
              <strong>{t('affiliate.applied')}:</strong> {format(new Date(affiliateInfo.createdAt), 'PPP')}
            </div>
            {affiliateInfo.applicationNote && (
              <div>
                <strong>{t('affiliate.yourNote')}:</strong>
                <p className="text-sm text-muted-foreground mt-1">{affiliateInfo.applicationNote}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('affiliate.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('dashboard.welcome')}, {user?.name || user?.email}
        </p>
      </div>

      {/* Wallet Balance - For Approval Fees */}
      <Card className="relative border-2 shadow-lg hover:shadow-xl transition-all overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 opacity-5 rounded-lg pointer-events-none" />
        <CardHeader className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 shadow-md">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <CardDescription className="text-base font-medium">
              {t('affiliate.dashboard.availableBalance')}
            </CardDescription>
          </div>
          <CardTitle className="text-5xl font-bold bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
            {walletLoading ? '...' : `$${walletBalance?.balance || '0.00'}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <p className="text-sm text-muted-foreground mb-4">
            {t('affiliate.dashboard.balanceDescription')}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/dashboard/affiliate/wallet')} variant="outline" size="sm">
              {t('affiliate.dashboard.viewTransactions')}
            </Button>
            <Button onClick={() => router.push('/dashboard/affiliate/wallet')} size="sm">
              {t('affiliate.dashboard.rechargeBalance')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Code Card */}
      {infoLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : affiliateInfo ? (
        <ReferralCodeCard
          code={affiliateInfo.referralCode}
          link={affiliateInfo.referralLink}
        />
      ) : null}

      {/* Stats Cards - Approval Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EnhancedStatsCard
          title={t('affiliate.dashboard.totalReferrals')}
          value={stats?.totalReferrals || 0}
          description={t('affiliate.dashboard.registeredWithCode')}
          icon={Users}
          variant="info"
          isLoading={statsLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.dashboard.pendingApproval')}
          value={pendingReferrals.length}
          description={t('affiliate.dashboard.awaitingDecision')}
          icon={Clock}
          variant="warning"
          isLoading={referralsLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.dashboard.approvedReferrals')}
          value={approvedReferrals.length}
          description={t('affiliate.dashboard.activeSellers')}
          icon={CheckCircle}
          variant="success"
          isLoading={referralsLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.dashboard.rejectedReferrals')}
          value={rejectedReferrals.length}
          description={t('affiliate.dashboard.notApproved')}
          icon={XCircle}
          variant="danger"
          isLoading={referralsLoading}
        />
      </div>

      {/* Quick Actions */}
      {pendingReferrals.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-800">
              {pendingReferrals.length === 1
                ? t('affiliate.dashboard.pendingAlert').replace('{count}', pendingReferrals.length.toString())
                : t('affiliate.dashboard.pendingAlertPlural').replace('{count}', pendingReferrals.length.toString())
              }
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push('/dashboard/affiliate/referrals-pending')}
            >
              {t('affiliate.dashboard.reviewNow')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Referrals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('affiliate.dashboard.myReferrals')}</CardTitle>
              <CardDescription>{t('affiliate.dashboard.latestSellers')}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/affiliate/referrals">
                {t('affiliate.dashboard.viewAll')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {referralsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : allReferrals && allReferrals.data.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('affiliate.dashboard.user')}</TableHead>
                    <TableHead>{t('affiliate.dashboard.role')}</TableHead>
                    <TableHead>{t('affiliate.dashboard.approvalStatus')}</TableHead>
                    <TableHead>{t('affiliate.dashboard.registrationDate')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allReferrals.data.map((referral: any) => (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{referral.referredUser.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {referral.referredUser.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{referral.referredUser.role}</span>
                      </TableCell>
                      <TableCell>
                        <ReferralApprovalStatusBadge status={referral.approvalStatus} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(referral.createdAt), 'PP')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">{t('affiliate.dashboard.noReferralsYet')}</p>
              <p className="text-sm mt-1">{t('affiliate.dashboard.shareCode')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
