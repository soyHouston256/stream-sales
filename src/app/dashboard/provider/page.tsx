'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, DollarSign, Wallet, ShoppingCart, ArrowUpRight } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { SalesByCategoryChart } from '@/components/provider/SalesByCategoryChart';
import { DataTable, Column } from '@/components/admin/DataTable';
import { useProviderStats } from '@/lib/hooks/useProviderStats';
import { useProviderSales } from '@/lib/hooks/useProviderSales';
import { ProviderSale } from '@/types/provider';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { format } from 'date-fns';
import { useProviderWalletBalance } from '@/hooks/useWalletBalance';
import { WithdrawalRequestDialog } from '@/components/provider/WithdrawalRequestDialog';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/seller';

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('provider.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('dashboard.welcome')}, {user?.name || user?.email}
          </p>
        </div>
        <div className="flex gap-2">
          <WithdrawalRequestDialog
            availableBalance={Number(walletBalance?.balance ?? stats?.pendingBalance ?? 0)}
            trigger={
              <Button variant="outline">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                {t('wallet.withdraw')}
              </Button>
            }
          />
          <Button onClick={() => router.push('/dashboard/provider/products')}>
            <Package className="mr-2 h-4 w-4" />
            {t('provider.products.title')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-2">
          <StatCard
            label={t('provider.earnings.availableBalance')}
            value={walletBalance ? formatCurrency(walletBalance.balance) : '$0.00'}
            description={`${walletBalance?.currency || 'USD'} • ${t('provider.earnings.readyForWithdrawal')}`}
            icon={Wallet}
            color="green"
            isLoading={walletLoading}
          />
        </div>

        <StatCard
          label={t('provider.totalProducts')}
          value={stats?.totalProducts ?? 0}
          description={`${stats?.availableProducts ?? 0} ${t('provider.availableProducts')}, ${stats?.soldProducts ?? 0} ${t('provider.soldProducts')}`}
          icon={Package}
          isLoading={statsLoading}
          color="blue"
        />

        <StatCard
          label={t('provider.thisMonth')}
          value={stats ? `$${parseFloat(stats.thisMonthEarnings).toFixed(2)}` : '$0.00'}
          description={`${stats?.thisMonthSales ?? 0} ${t('provider.salesThisMonth')}`}
          icon={ShoppingCart}
          isLoading={statsLoading}
          color="orange"
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
