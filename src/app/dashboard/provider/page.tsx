'use client';

import { useAuth } from '@/lib/auth/useAuth';
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
  const { data: stats, isLoading: statsLoading } = useProviderStats();
  const { data: salesData, isLoading: salesLoading } = useProviderSales({
    page: 1,
    limit: 5,
  });

  const recentSales = salesData?.data || [];

  const columns: Column<ProviderSale>[] = [
    {
      key: 'productCategory',
      label: 'Category',
      render: (sale) => <CategoryBadge category={sale.productCategory} />,
    },
    {
      key: 'productName',
      label: 'Product',
      render: (sale) => (
        <div>
          <p className="font-medium">{sale.productName}</p>
          <p className="text-xs text-muted-foreground">{sale.buyerEmail}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Sale Price',
      render: (sale) => <span className="font-medium">${sale.amount}</span>,
    },
    {
      key: 'providerEarnings',
      label: 'Your Earnings',
      render: (sale) => (
        <span className="font-medium text-green-600">
          ${sale.providerEarnings}
        </span>
      ),
    },
    {
      key: 'completedAt',
      label: 'Date',
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
          <h1 className="text-3xl font-bold">Provider Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        <CreateProductDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Products"
          value={stats?.totalProducts ?? 0}
          description={`${stats?.availableProducts ?? 0} available, ${stats?.soldProducts ?? 0} sold`}
          icon={Package}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Total Earnings"
          value={stats ? `$${parseFloat(stats.totalEarnings).toFixed(2)}` : '$0.00'}
          description="Lifetime earnings"
          icon={DollarSign}
          isLoading={statsLoading}
        />
        <StatsCard
          title="This Month"
          value={stats ? `$${parseFloat(stats.thisMonthEarnings).toFixed(2)}` : '$0.00'}
          description={`${stats?.thisMonthSales ?? 0} sales this month`}
          icon={ShoppingCart}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Pending Balance"
          value={stats ? `$${parseFloat(stats.pendingBalance).toFixed(2)}` : '$0.00'}
          description="Available for withdrawal"
          icon={Wallet}
          isLoading={statsLoading}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SalesByCategoryChart />

        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>Your latest 5 sales</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={recentSales}
              columns={columns}
              isLoading={salesLoading}
              emptyMessage="No sales yet. Start selling your products!"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
