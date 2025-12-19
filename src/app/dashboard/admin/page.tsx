'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, DollarSign, AlertCircle, TrendingUp, Wallet } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { SalesChart } from '@/components/admin/SalesChart';
import { useAdminStats, useSalesData } from '@/lib/hooks/useAdminStats';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: salesData = [], isLoading: salesLoading } = useSalesData(7);

  // Mock data for sparklines
  const generateSparklineData = (trend: 'up' | 'down' | 'neutral') => {
    return Array.from({ length: 10 }, (_, i) => ({
      value: Math.floor(Math.random() * 50) + (trend === 'up' ? i * 5 : trend === 'down' ? (10 - i) * 5 : 20)
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('admin.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('dashboard.welcome')}, {user?.name || user?.email}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('admin.totalUsers')}
          value={stats?.totalUsers ?? 0}
          description={stats?.usersGrowth ? `${stats.usersGrowth > 0 ? '+' : ''}${stats.usersGrowth}% crecimiento` : undefined}
          icon={Users}
          isLoading={statsLoading}
          color="blue"
        />
        <StatCard
          label={t('admin.totalSales')}
          value={`$${stats?.totalSales ? Number(stats.totalSales).toFixed(2) : '0.00'}`}
          description={stats?.salesGrowth ? `${stats.salesGrowth > 0 ? '+' : ''}${stats.salesGrowth}% vs mes anterior` : undefined}
          icon={DollarSign}
          isLoading={statsLoading}
          color="green"
        />
        <StatCard
          label={t('admin.commissionsGenerated')}
          value={`$${stats?.totalCommissions ? Number(stats.totalCommissions).toFixed(2) : '0.00'}`}
          description="Comisiones totales"
          icon={TrendingUp}
          isLoading={statsLoading}
          color="emerald"
        />
        <StatCard
          label={t('admin.activeDisputes')}
          value={stats?.activeDisputes ?? 0}
          description="Disputas activas"
          icon={AlertCircle}
          isLoading={statsLoading}
          color={stats?.activeDisputes && stats.activeDisputes > 0 ? 'orange' : 'purple'}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SalesChart data={salesData} isLoading={salesLoading} />

        <Card>
          <CardHeader>
            <CardTitle>{t('admin.quickActionsTitle')}</CardTitle>
            <CardDescription>
              {t('admin.quickActionsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/dashboard/admin/users" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                {t('admin.manageUsers')}
              </Button>
            </Link>
            <Link href="/dashboard/admin/recharges" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Wallet className="mr-2 h-4 w-4" />
                {t('admin.manageRecharges')}
              </Button>
            </Link>
            <Link href="/dashboard/admin/commissions" className="block">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                {t('admin.configureCommissions')}
              </Button>
            </Link>
            <Link href="/dashboard/admin/transactions" className="block">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                {t('admin.viewTransactions')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
