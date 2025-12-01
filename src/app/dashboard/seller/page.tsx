'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Column } from '@/components/admin/DataTable';
import { useSellerStats } from '@/lib/hooks/useSellerStats';
import { usePurchases } from '@/lib/hooks/usePurchases';
import { MarketplaceProduct, Purchase } from '@/types/seller';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { PurchaseStatusBadge, ProductCard, ProductDetailsDialog, RechargeDialog } from '@/components/seller';
import { formatCurrency } from '@/lib/utils/seller';
import { format } from 'date-fns';
import Link from 'next/link';

export default function SellerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);

  const { data: stats, isLoading: statsLoading } = useSellerStats();
  const { data: purchasesData, isLoading: purchasesLoading } = usePurchases({
    page: 1,
    limit: 3,
  });

  const recentPurchases = purchasesData?.data || [];

  const handleProductClick = (product: MarketplaceProduct) => {
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  const purchaseColumns: Column<Purchase>[] = [
    {
      key: 'product',
      label: t('seller.product'),
      render: (purchase) => (
        <div>
          <div className="flex items-center gap-2">
            <CategoryBadge category={purchase.product.category} />
            <span className="font-medium">{purchase.product.name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: t('seller.price'),
      render: (purchase) => (
        <span className="font-medium">{formatCurrency(purchase.amount)}</span>
      ),
    },
    {
      key: 'createdAt',
      label: t('seller.date'),
      render: (purchase) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(purchase.createdAt), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('seller.status'),
      render: (purchase) => <PurchaseStatusBadge status={purchase.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('seller.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('dashboard.welcome')}, {user?.name || user?.email}
          </p>
        </div>
        <RechargeDialog currentBalance={stats ? stats.walletBalance.toString() : '0'} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EnhancedStatsCard
          title={t('seller.walletBalance')}
          value={stats ? formatCurrency(stats.walletBalance) : '$0.00'}
          description={t('seller.availableBalance')}
          icon={Wallet}
          variant="success"
          isLoading={statsLoading}
        />
        <EnhancedStatsCard
          title={t('seller.totalPurchases')}
          value={stats?.totalPurchases ?? 0}
          description={t('seller.lifetimePurchases')}
          icon={ShoppingBag}
          variant="info"
          isLoading={statsLoading}
        />
        <EnhancedStatsCard
          title={t('seller.totalSpent')}
          value={stats ? formatCurrency(stats.totalSpent) : '$0.00'}
          description={t('seller.lifetimeSpending')}
          icon={DollarSign}
          variant="warning"
          isLoading={statsLoading}
        />
        <EnhancedStatsCard
          title={t('seller.thisMonth')}
          value={stats?.thisMonthPurchases ?? 0}
          description={stats ? `${formatCurrency(stats.thisMonthSpent)} ${t('seller.spent')}` : `$0.00 ${t('seller.spent')}`}
          icon={TrendingUp}
          variant="info"
          isLoading={statsLoading}
        />
      </div>

      {/* Featured Products & Recent Purchases */}
      <div className="grid gap-6 lg:grid-cols-2">


        {/* Recent Purchases */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('seller.recentPurchases')}</CardTitle>
                <CardDescription>{t('seller.latestPurchases')}</CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard/seller/purchases">{t('seller.viewAll')}</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={recentPurchases}
              columns={purchaseColumns}
              isLoading={purchasesLoading}
              emptyMessage={t('seller.noPurchases')}
              emptyState={{
                icon: ShoppingBag,
                title: t('seller.noPurchases'),
                description: t('seller.noPurchasesDescription'),
                variant: 'default',
              }}
            />
          </CardContent>
        </Card>
      </div>

      {/* Product Details Dialog */}
      <ProductDetailsDialog
        product={selectedProduct}
        isOpen={showProductDetails}
        onClose={() => {
          setShowProductDetails(false);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
}
