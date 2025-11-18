'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, DollarSign, Wallet, ShoppingCart } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { SalesByCategoryChart } from '@/components/provider/SalesByCategoryChart';
import { CreateProductDialog } from '@/components/provider/CreateProductDialog';
import { DataTable, Column } from '@/components/admin/DataTable';
import { useProviderStats } from '@/lib/hooks/useProviderStats';
import { useProviderSales } from '@/lib/hooks/useProviderSales';
import { ProviderSale } from '@/types/provider';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { format } from 'date-fns';

export default function ProviderDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: stats, isLoading: statsLoading } = useProviderStats();
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
        <CreateProductDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('provider.totalProducts')}
          value={stats?.totalProducts ?? 0}
          description={`${stats?.availableProducts ?? 0} ${t('provider.availableProducts')}, ${stats?.soldProducts ?? 0} ${t('provider.soldProducts')}`}
          icon={Package}
          isLoading={statsLoading}
        />
        <StatsCard
          title={t('provider.totalEarnings')}
          value={stats ? `$${parseFloat(stats.totalEarnings).toFixed(2)}` : '$0.00'}
          description={t('provider.lifetimeEarnings')}
          icon={DollarSign}
          isLoading={statsLoading}
        />
        <StatsCard
          title={t('provider.thisMonth')}
          value={stats ? `$${parseFloat(stats.thisMonthEarnings).toFixed(2)}` : '$0.00'}
          description={`${stats?.thisMonthSales ?? 0} ${t('provider.salesThisMonth')}`}
          icon={ShoppingCart}
          isLoading={statsLoading}
        />
        <StatsCard
          title={t('provider.pendingBalance')}
          value={stats ? `$${parseFloat(stats.pendingBalance).toFixed(2)}` : '$0.00'}
          description={t('provider.availableForWithdrawal')}
          icon={Wallet}
          isLoading={statsLoading}
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
