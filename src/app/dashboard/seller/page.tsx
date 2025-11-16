'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
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

export default function SellerDashboard() {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);

  const { data: stats, isLoading: statsLoading } = useSellerStats();
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
      label: 'Product',
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
      label: 'Price',
      render: (purchase) => (
        <span className="font-medium">{formatCurrency(purchase.amount)}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (purchase) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(purchase.createdAt), 'MMM dd, yyyy')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (purchase) => <PurchaseStatusBadge status={purchase.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
        <RechargeDialog currentBalance={stats?.walletBalance} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Wallet Balance"
          value={stats ? formatCurrency(stats.walletBalance) : '$0.00'}
          description="Available balance"
          icon={Wallet}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Total Purchases"
          value={stats?.totalPurchases ?? 0}
          description="Lifetime purchases"
          icon={ShoppingBag}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Total Spent"
          value={stats ? formatCurrency(stats.totalSpent) : '$0.00'}
          description="Lifetime spending"
          icon={DollarSign}
          isLoading={statsLoading}
        />
        <StatsCard
          title="This Month"
          value={stats?.thisMonthPurchases ?? 0}
          description={stats ? `${formatCurrency(stats.thisMonthSpent)} spent` : '$0.00 spent'}
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
                <CardTitle>Featured Products</CardTitle>
                <CardDescription>Latest products available for purchase</CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard/seller/marketplace">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {marketplaceLoading ? (
                <p className="text-sm text-muted-foreground col-span-2">Loading products...</p>
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
                  No products available at the moment.
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
                <CardTitle>Recent Purchases</CardTitle>
                <CardDescription>Your latest purchases</CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/dashboard/seller/purchases">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={recentPurchases}
              columns={purchaseColumns}
              isLoading={purchasesLoading}
              emptyMessage="No purchases yet. Start shopping in the marketplace!"
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
