'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth/useAuth';
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

export default function AffiliateDashboard() {
  const { user } = useAuth();
  const { data: affiliateInfo, isLoading: infoLoading, error: infoError } = useAffiliateInfo();
  const { data: stats, isLoading: statsLoading } = useAffiliateStats();
  const { data: chartData, isLoading: chartLoading } = useReferralsByMonth(6);
  const { data: recentReferrals, isLoading: referralsLoading } = useReferrals({
    page: 1,
    limit: 5,
  });

  if (infoError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load affiliate information. You may not be enrolled in the affiliate program.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Affiliate Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user?.name || user?.email}
        </p>
      </div>

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalReferrals || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.activeReferrals || 0} active
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Referrals</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.activeReferrals || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.thisMonthReferrals || 0} this month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCommissionAmount(stats?.totalCommissionEarned || '0')}
                </div>
                <p className="text-xs text-muted-foreground">All time</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCommissionAmount(stats?.availableBalance || '0')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCommissionAmount(stats?.thisMonthEarned || '0')} this month
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referrals Chart */}
      <ReferralsChart data={chartData} isLoading={chartLoading} />

      {/* Recent Referrals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Referrals</CardTitle>
              <CardDescription>Your most recent referrals</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/affiliate/referrals">
                View All
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
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
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
              No referrals yet. Start sharing your referral code to earn commissions!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
