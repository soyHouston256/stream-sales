'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ShoppingBag, DollarSign, TrendingUp } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { DataTable, Column } from '@/components/admin/DataTable';
import { useSellerStats } from '@/lib/hooks/useSellerStats';
import { useMarketplace } from '@/lib/hooks/useMarketplace';
import { usePurchases } from '@/lib/hooks/usePurchases';
import { MarketplaceProduct, Purchase } from '@/types/seller';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { PurchaseStatusBadge, ProductCard, ProductDetailsDialog, RechargeDialog } from '@/components/seller';
import { formatCurrency } from '@/lib/utils/seller';
import { format } from 'date-fns';
import Link from 'next/link';
import { WalletBalanceCard } from '@/components/wallet/WalletBalanceCard';
import { useSellerWalletBalance } from '@/hooks/useWalletBalance';
import { useRouter } from 'next/navigation';

export default function SellerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);

  const { data: stats, isLoading: statsLoading } = useSellerStats();
  const { data: walletBalance, isLoading: walletLoading } = useSellerWalletBalance();
  const { data: marketplaceData, isLoading: marketplaceLoading } = useMarketplace({
    page: 1,
    limit: 6,
  });
  const { data: purchasesData, isLoading: purchasesLoading } = usePurchases({
    page: 1,
    limit: 3,
  });

  const featuredProducts = marketplaceData?.data || [];
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
      </div>

      {/* Prominent Wallet Balance Card - MOST VISIBLE ELEMENT */}
      <WalletBalanceCard
        balance={walletBalance?.balance ?? stats?.walletBalance ?? 0}
        currency={walletBalance?.currency ?? 'USD'}
        lastUpdated={walletBalance?.lastUpdated ? new Date(walletBalance.lastUpdated) : undefined}
        pendingAmount={walletBalance?.pendingAmount ?? 0}
        isLoading={walletLoading}
        variant="seller"
        onRecharge={() => {
          // Trigger the RechargeDialog via a hidden button click
          document.getElementById('recharge-trigger-btn')?.click();
        }}
        onViewTransactions={() => router.push('/dashboard/seller/wallet')}
      />

      {/* RechargeDialog */}
      <RechargeDialog
        currentBalance={String(walletBalance?.balance ?? stats?.walletBalance ?? 0)}
        trigger={<button id="recharge-trigger-btn" style={{ display: 'none' }} />}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t('seller.walletBalance')}
          value={stats ? formatCurrency(stats.walletBalance) : '$0.00'}
          description={t('seller.availableBalance')}
          icon={Wallet}
          isLoading={statsLoading}
        />
        <StatsCard
          title={t('seller.totalPurchases')}
          value={stats?.totalPurchases ?? 0}
          description={t('seller.lifetimePurchases')}
          icon={ShoppingBag}
          isLoading={statsLoading}
        />
        <StatsCard
          title={t('seller.totalSpent')}
          value={stats ? formatCurrency(stats.totalSpent) : '$0.00'}
          description={t('seller.lifetimeSpending')}
          icon={DollarSign}
          isLoading={statsLoading}
        />
        <StatsCard
          title={t('seller.thisMonth')}
          value={stats?.thisMonthPurchases ?? 0}
          description={stats ? `${formatCurrency(stats.thisMonthSpent)} ${t('seller.spent')}` : `$0.00 ${t('seller.spent')}`}
          icon={TrendingUp}
          isLoading={statsLoading}
        />
      </div>

      {/* Featured Products & Recent Purchases */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Featured Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('seller.featuredProducts')}</CardTitle>
                <CardDescription>{t('seller.latestProducts')}</CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard/seller/marketplace">{t('seller.viewAll')}</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {marketplaceLoading ? (
                <p className="text-sm text-muted-foreground col-span-2">{t('seller.loadingProducts')}</p>
              ) : featuredProducts.length > 0 ? (
                featuredProducts.slice(0, 4).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onBuyClick={handleProductClick}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground col-span-2">
                  {t('seller.noProducts')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

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
