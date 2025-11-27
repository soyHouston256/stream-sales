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
import { Users, DollarSign, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react';
import {
  useAffiliateInfo,
  useAffiliateStats,
  useReferralsByMonth,
  useReferrals,
} from '@/lib/hooks';
import {
  ReferralCodeCard,
  ReferralsChart,
  ReferralStatusBadge,
} from '@/components/affiliate';
import { formatCommissionAmount } from '@/lib/utils/affiliate';
import { WalletBalanceCard } from '@/components/wallet/WalletBalanceCard';
import { useAffiliateWalletBalance } from '@/hooks/useWalletBalance';
import { PaymentRequestDialog } from '@/components/affiliate/PaymentRequestDialog';
import { useRouter } from 'next/navigation';

export default function AffiliateDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const { data: affiliateInfo, isLoading: infoLoading, error: infoError } = useAffiliateInfo();
  const { data: stats, isLoading: statsLoading } = useAffiliateStats();
  const { data: walletBalance, isLoading: walletLoading } = useAffiliateWalletBalance();
  const { data: chartData, isLoading: chartLoading } = useReferralsByMonth(6);
  const { data: recentReferrals, isLoading: referralsLoading } = useReferrals({
    page: 1,
    limit: 5,
  });

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

      {/* Prominent Wallet Balance Card - MOST VISIBLE ELEMENT */}
      <WalletBalanceCard
        balance={walletBalance?.balance ?? stats?.availableBalance ?? 0}
        currency={walletBalance?.currency ?? 'USD'}
        lastUpdated={walletBalance?.lastUpdated ? new Date(walletBalance.lastUpdated) : undefined}
        pendingAmount={walletBalance?.pendingAmount ?? 0}
        isLoading={walletLoading}
        variant="affiliate"
        onWithdraw={() => setPaymentDialogOpen(true)}
        onViewTransactions={() => router.push('/dashboard/affiliate/commissions')}
      />

      {/* Payment Request Dialog */}
      <PaymentRequestDialog
        availableBalance={String(walletBalance?.balance ?? stats?.availableBalance ?? 0)}
        isOpen={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
      />

      {/* Referral Code Card */}
      {infoLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : affiliateInfo ? (
        <ReferralCodeCard
          code={affiliateInfo.referralCode}
          link={affiliateInfo.referralLink}
        />
      ) : null}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EnhancedStatsCard
          title={t('affiliate.totalReferrals')}
          value={stats?.totalReferrals || 0}
          description={`${stats?.activeReferrals || 0} ${t('affiliate.active')}`}
          icon={Users}
          variant="info"
          isLoading={statsLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.activeReferrals')}
          value={stats?.activeReferrals || 0}
          description={`${stats?.thisMonthReferrals || 0} ${t('affiliate.thisMonth')}`}
          icon={Users}
          variant="success"
          isLoading={statsLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.totalEarned')}
          value={formatCommissionAmount(stats?.totalCommissionEarned || '0')}
          description={t('affiliate.allTime')}
          icon={DollarSign}
          variant="info"
          isLoading={statsLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.availableBalance')}
          value={formatCommissionAmount(stats?.availableBalance || '0')}
          description={`${formatCommissionAmount(stats?.thisMonthEarned || '0')} ${t('affiliate.thisMonth')}`}
          icon={TrendingUp}
          variant="success"
          isLoading={statsLoading}
        />
      </div>

      {/* Referrals Chart */}
      <ReferralsChart data={chartData} isLoading={chartLoading} />

      {/* Recent Referrals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('affiliate.recentReferrals')}</CardTitle>
              <CardDescription>{t('affiliate.mostRecentReferrals')}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/affiliate/referrals">
                {t('affiliate.viewAll')}
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
          ) : recentReferrals && recentReferrals.data.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('affiliate.user')}</TableHead>
                    <TableHead>{t('affiliate.role')}</TableHead>
                    <TableHead>{t('affiliate.status')}</TableHead>
                    <TableHead>{t('affiliate.registered')}</TableHead>
                    <TableHead className="text-right">{t('affiliate.commission')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReferrals.data.map((referral: any) => (
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
                        <ReferralStatusBadge status={referral.status} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(referral.createdAt), 'PP')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCommissionAmount(referral.totalCommissionEarned)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              {t('affiliate.noReferrals')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
