'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, DollarSign, Wallet, ShoppingCart } from 'lucide-react';
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import { SalesByCategoryChart } from '@/components/provider/SalesByCategoryChart';
import { DataTable, Column } from '@/components/admin/DataTable';
import { useProviderStats } from '@/lib/hooks/useProviderStats';
import { useProviderSales } from '@/lib/hooks/useProviderSales';
import { ProviderSale } from '@/types/provider';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { format } from 'date-fns';
import { WalletBalanceCard } from '@/components/wallet/WalletBalanceCard';
import { useProviderWalletBalance } from '@/hooks/useWalletBalance';
import { WithdrawalRequestDialog } from '@/components/provider/WithdrawalRequestDialog';
import { useRouter } from 'next/navigation';

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = useProviderStats();
  const { data: walletBalance, isLoading: walletLoading } = useProviderWalletBalance();
  const { data: salesData, isLoading: salesLoading } = useProviderSales({
    page: 1,
    limit: 5,
  });

  const recentSales = salesData?.data || [];

  const columns: Column<ProviderSale>[] = [
    {
      key: 'productCategory',
      label: t('provider.category'),
      render: (sale) => <CategoryBadge category={sale.productCategory} />,
    },
    {
      key: 'productName',
      label: t('provider.product'),
      render: (sale) => (
        <div>
          <p className="font-medium">{sale.productName}</p>
          <p className="text-xs text-muted-foreground">{sale.buyerEmail}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      label: t('provider.salePrice'),
      render: (sale) => <span className="font-medium">${sale.amount}</span>,
    },
    {
      key: 'providerEarnings',
      label: t('provider.yourEarnings'),
      render: (sale) => (
        <span className="font-medium text-green-600">
          ${sale.providerEarnings}
        </span>
      ),
    },
    {
      key: 'completedAt',
      label: t('provider.date'),
      render: (sale) =>
        sale.completedAt
          ? format(new Date(sale.completedAt), 'MMM dd, yyyy')
          : '-',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('provider.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('dashboard.welcome')}, {user?.name || user?.email}
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/provider/products')}>
          <Package className="mr-2 h-4 w-4" />
          {t('provider.products.title')}
        </Button>
      </div>

      {/* Prominent Wallet Balance Card - MOST VISIBLE ELEMENT */}
      <WalletBalanceCard
        balance={walletBalance?.balance ?? stats?.pendingBalance ?? 0}
        currency={walletBalance?.currency ?? 'USD'}
        lastUpdated={walletBalance?.lastUpdated ? new Date(walletBalance.lastUpdated) : undefined}
        pendingAmount={walletBalance?.pendingAmount ?? 0}
        isLoading={walletLoading}
        variant="provider"
        onWithdraw={() => {
          // Trigger the WithdrawalDialog via a hidden button click
          document.getElementById('withdrawal-trigger-btn')?.click();
        }}
        onViewTransactions={() => router.push('/dashboard/provider/earnings')}
      />

      {/* WithdrawalRequestDialog */}
      <WithdrawalRequestDialog
        availableBalance={Number(walletBalance?.balance ?? stats?.pendingBalance ?? 0)}
        trigger={<button id="withdrawal-trigger-btn" style={{ display: 'none' }} />}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EnhancedStatsCard
          title={t('provider.totalProducts')}
          value={stats?.totalProducts ?? 0}
          description={`${stats?.availableProducts ?? 0} ${t('provider.availableProducts')}, ${stats?.soldProducts ?? 0} ${t('provider.soldProducts')}`}
          icon={Package}
          isLoading={statsLoading}
          variant="info"
        />
        <EnhancedStatsCard
          title={t('provider.totalEarnings')}
          value={stats ? `$${parseFloat(stats.totalEarnings).toFixed(2)}` : '$0.00'}
          description={t('provider.lifetimeEarnings')}
          icon={DollarSign}
          isLoading={statsLoading}
          variant="success"
        />
        <EnhancedStatsCard
          title={t('provider.thisMonth')}
          value={stats ? `$${parseFloat(stats.thisMonthEarnings).toFixed(2)}` : '$0.00'}
          description={`${stats?.thisMonthSales ?? 0} ${t('provider.salesThisMonth')}`}
          icon={ShoppingCart}
          isLoading={statsLoading}
          variant="info"
        />
        <EnhancedStatsCard
          title={t('provider.pendingBalance')}
          value={stats ? `$${parseFloat(stats.pendingBalance).toFixed(2)}` : '$0.00'}
          description={t('provider.availableForWithdrawal')}
          icon={Wallet}
          isLoading={statsLoading}
          variant="warning"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SalesByCategoryChart />

        <Card>
          <CardHeader>
            <CardTitle>{t('provider.recentSales')}</CardTitle>
            <CardDescription>{t('provider.latestSales')}</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={recentSales}
              columns={columns}
              isLoading={salesLoading}
              emptyMessage={t('provider.noSales')}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
