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
import { Skeleton } from '@/components/ui/skeleton';
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Clock, CheckCircle, XCircle, Wallet } from 'lucide-react';
import { useReferrals } from '@/lib/hooks';
import { ReferralFilters, Referral } from '@/types/affiliate';
import { ReferralApprovalStatusBadge, ReferralApprovalDialog } from '@/components/affiliate';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { tokenManager } from '@/lib/utils/tokenManager';

export default function ReferralsPendingPage() {
  const { t } = useLanguage();
  const [filters] = useState<ReferralFilters>({
    page: 1,
    limit: 50,
    approvalStatus: 'pending', // Solo referidos pendientes
  });

  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [dialogMode, setDialogMode] = useState<'approve' | 'reject'>('approve');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch referrals
  const { data: referralsData, isLoading: isLoadingReferrals } = useReferrals(filters);

  // Fetch approval fee configuration
  const { data: approvalFeeData, isLoading: isLoadingFee } = useQuery({
    queryKey: ['referral-approval-fee'],
    queryFn: async () => {
      const token = tokenManager.getToken();
      const response = await fetch('/api/admin/settings/referral-fee', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // If not admin or no config, return default
        return { data: { approvalFee: '0.00' } };
      }

      return response.json();
    },
  });

  // Fetch affiliate wallet balance
  const { data: walletData, isLoading: isLoadingWallet } = useQuery({
    queryKey: ['affiliate-wallet-balance'],
    queryFn: async () => {
      const token = tokenManager.getToken();
      const response = await fetch('/api/affiliate/wallet/balance', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallet balance');
      }

      return response.json();
    },
  });

  const approvalFee = approvalFeeData?.data?.approvalFee || '0.00';
  const affiliateBalance = walletData?.balance || '0.00';
  const pendingReferrals = referralsData?.data || [];

  const handleApprove = (referral: Referral) => {
    setSelectedReferral(referral);
    setDialogMode('approve');
    setDialogOpen(true);
  };

  const handleReject = (referral: Referral) => {
    setSelectedReferral(referral);
    setDialogMode('reject');
    setDialogOpen(true);
  };

  const isLoading = isLoadingReferrals || isLoadingFee || isLoadingWallet;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('affiliate.pendingReferrals.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('affiliate.pendingReferrals.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <EnhancedStatsCard
          title={t('affiliate.pendingReferrals.pendingReferralsCount')}
          value={pendingReferrals.length}
          icon={Clock}
          variant="warning"
          isLoading={isLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.pendingReferrals.approvalCost')}
          value={`$${approvalFee} USD`}
          icon={CheckCircle}
          variant="info"
          isLoading={isLoading}
        />

        <EnhancedStatsCard
          title={t('affiliate.pendingReferrals.yourBalance')}
          value={`$${affiliateBalance} USD`}
          icon={Wallet}
          variant="success"
          isLoading={isLoading}
        />
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertDescription>
          <strong>{t('affiliate.pendingReferrals.howItWorksTitle')}</strong>{' '}
          {t('affiliate.pendingReferrals.howItWorksDescription').replace('{fee}', `$${approvalFee}`)}
        </AlertDescription>
      </Alert>

      {/* Pending Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('affiliate.pendingReferrals.waitingApproval')}</CardTitle>
          <CardDescription>
            {t('affiliate.pendingReferrals.reviewDecide')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pendingReferrals.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('affiliate.pendingReferrals.user')}</TableHead>
                    <TableHead>{t('affiliate.pendingReferrals.role')}</TableHead>
                    <TableHead>{t('affiliate.pendingReferrals.registrationDate')}</TableHead>
                    <TableHead>{t('affiliate.pendingReferrals.status')}</TableHead>
                    <TableHead className="text-right">{t('affiliate.pendingReferrals.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReferrals.map((referral: Referral) => (
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
                      <TableCell>{format(new Date(referral.createdAt), 'PPp')}</TableCell>
                      <TableCell>
                        <ReferralApprovalStatusBadge status={referral.approvalStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(referral)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {t('affiliate.pendingReferrals.approve')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(referral)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            {t('affiliate.pendingReferrals.reject')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={Clock}
              title={t('affiliate.pendingReferrals.noPending')}
              description={t('affiliate.pendingReferrals.allReviewed')}
              variant="default"
            />
          )}
        </CardContent>
      </Card>

      {/* Approval/Rejection Dialog */}
      <ReferralApprovalDialog
        referral={selectedReferral}
        approvalFee={approvalFee}
        affiliateBalance={affiliateBalance}
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedReferral(null);
        }}
        mode={dialogMode}
      />
    </div>
  );
}
