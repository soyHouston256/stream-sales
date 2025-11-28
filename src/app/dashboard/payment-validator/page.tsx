'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { Wallet, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface PaymentValidatorStats {
  recharges: {
    pending: number;
    completed: number;
    failed: number;
    cancelled: number;
    totalPendingAmount: string;
    totalCompletedAmount: string;
  };
  withdrawals: {
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
    totalPendingAmount: string;
    totalCompletedAmount: string;
  };
  myActivity: {
    rechargesProcessed: number;
    withdrawalsProcessed: number;
    totalProcessed: number;
  };
}

export default function PaymentValidatorDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<PaymentValidatorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get<PaymentValidatorStats>('/api/payment-validator/stats', true);
        setStats(response);
      } catch (error) {
        console.error('Error fetching payment validator stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('paymentValidator.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('paymentValidator.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('paymentValidator.welcome')}, {user?.name || user?.email}
        </p>
      </div>

      {/* Pending Validations Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('paymentValidator.pendingValidations')}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <EnhancedStatsCard
            title={t('paymentValidator.pendingRecharges')}
            value={stats?.recharges.pending ?? 0}
            icon={Clock}
            description={`${t('paymentValidator.totalAmount')}: $${stats?.recharges.totalPendingAmount ?? '0.00'}`}
            variant="warning"
            isLoading={isLoading}
          />
          <EnhancedStatsCard
            title={t('paymentValidator.pendingWithdrawals')}
            value={stats?.withdrawals.pending ?? 0}
            icon={Clock}
            description={`${t('paymentValidator.totalAmount')}: $${stats?.withdrawals.totalPendingAmount ?? '0.00'}`}
            variant="warning"
            isLoading={isLoading}
          />
          <EnhancedStatsCard
            title={t('paymentValidator.approvedWithdrawals')}
            value={stats?.withdrawals.approved ?? 0}
            icon={CheckCircle}
            description={t('paymentValidator.waitingCompletion')}
            variant="success"
            isLoading={isLoading}
          />
          <EnhancedStatsCard
            title={t('paymentValidator.myTotalProcessed')}
            value={stats?.myActivity.totalProcessed ?? 0}
            icon={TrendingUp}
            description={t('paymentValidator.validationActivity')}
            variant="info"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('paymentValidator.quickActions')}</CardTitle>
          <CardDescription>
            {t('paymentValidator.quickActionsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link href="/dashboard/payment-validator/recharges" className="block">
            <Button variant="outline" className="w-full justify-start">
              <Wallet className="mr-2 h-4 w-4" />
              {t('paymentValidator.validateRecharges')}
            </Button>
          </Link>
          <Link href="/dashboard/payment-validator/withdrawals" className="block">
            <Button variant="outline" className="w-full justify-start">
              <TrendingUp className="mr-2 h-4 w-4" />
              {t('paymentValidator.validateWithdrawals')}
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('paymentValidator.rechargeStatistics')}</CardTitle>
            <CardDescription>{t('paymentValidator.rechargeStatsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('paymentValidator.completed')}</span>
              <span className="text-sm font-medium">
                {stats?.recharges.completed ?? 0} (${stats?.recharges.totalCompletedAmount ?? '0.00'})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('paymentValidator.failed')}</span>
              <span className="text-sm font-medium">{stats?.recharges.failed ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('paymentValidator.cancelled')}</span>
              <span className="text-sm font-medium">{stats?.recharges.cancelled ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('paymentValidator.withdrawalStatistics')}</CardTitle>
            <CardDescription>{t('paymentValidator.withdrawalStatsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('paymentValidator.completed')}</span>
              <span className="text-sm font-medium">
                {stats?.withdrawals.completed ?? 0} (${stats?.withdrawals.totalCompletedAmount ?? '0.00'})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('paymentValidator.rejected')}</span>
              <span className="text-sm font-medium">{stats?.withdrawals.rejected ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{t('paymentValidator.myValidations')}</span>
              <span className="text-sm font-medium">
                {stats?.myActivity.withdrawalsProcessed ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
