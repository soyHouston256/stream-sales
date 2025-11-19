'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, Column } from '@/components/admin/DataTable';
import { usePurchases } from '@/lib/hooks/usePurchases';
import { Purchase, PurchasesFilters } from '@/types/seller';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { PurchaseDetailsDialog } from '@/components/seller';
import { formatCurrency } from '@/lib/utils/seller';
import { format } from 'date-fns';
import { ShoppingBag, DollarSign, TrendingDown, Eye } from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { ProductCategory } from '@/types/provider';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getEffectiveStatusBadgeVariant,
  getEffectiveStatusLabel,
  getEffectiveStatusDescription,
} from '@/lib/utils/effective-status';

export default function PurchasesPage() {
  const { t } = useLanguage();
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState<PurchasesFilters>({
    page: 1,
    limit: 10,
  });

  const { data, isLoading } = usePurchases(filters);

  const purchases = data?.data || [];
  const pagination = data?.pagination;

  // Calculate stats from purchases
  const stats = useMemo(() => {
    if (!purchases.length) {
      return {
        totalPurchases: 0,
        totalSpent: '0',
        averagePrice: '0',
      };
    }

    // Use totalEffectiveSpent from API (calculated across ALL purchases, not just current page)
    const totalSpent = data?.stats?.totalEffectiveSpent
      ? parseFloat(data.stats.totalEffectiveSpent)
      : purchases.reduce((sum, p) => sum + parseFloat(p.effectiveAmount), 0);

    const totalCount = pagination?.total || purchases.length;

    return {
      totalPurchases: totalCount,
      totalSpent: totalSpent.toFixed(2),
      averagePrice: totalCount > 0 ? (totalSpent / totalCount).toFixed(2) : '0',
    };
  }, [purchases, pagination, data?.stats]);

  const handleViewDetails = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setShowDetails(true);
  };

  const columns: Column<Purchase>[] = [
    {
      key: 'id',
      label: 'Purchase ID',
      render: (purchase) => (
        <span className="font-mono text-xs">{purchase.id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'product',
      label: 'Product',
      render: (purchase) => (
        <div className="flex items-center gap-2">
          <CategoryBadge category={purchase.product.category} />
          <div>
            <p className="font-medium">{purchase.product.name}</p>
            <p className="text-xs text-muted-foreground">
              by {purchase.provider.name}
            </p>
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
      label: 'Purchase Date',
      render: (purchase) => (
        <span className="text-sm">{format(new Date(purchase.createdAt), 'PPp')}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (purchase) => {
        const variant = getEffectiveStatusBadgeVariant(purchase.effectiveStatus);
        const label = getEffectiveStatusLabel(purchase.effectiveStatus, t);
        const description = getEffectiveStatusDescription(purchase.effectiveStatus, t);

        return (
          <Badge
            variant={variant}
            className="text-xs"
            title={description}
          >
            {label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (purchase) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleViewDetails(purchase)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Purchases</h1>
        <p className="text-muted-foreground mt-2">
          View your purchase history and access product credentials
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Purchases"
          value={stats.totalPurchases}
          description="All-time purchases"
          icon={ShoppingBag}
          isLoading={isLoading && purchases.length === 0}
        />
        <StatsCard
          title="Total Spent"
          value={formatCurrency(stats.totalSpent)}
          description="Total amount spent"
          icon={DollarSign}
          isLoading={isLoading && purchases.length === 0}
        />
        <StatsCard
          title="Average Price"
          value={formatCurrency(stats.averagePrice)}
          description="Average purchase price"
          icon={TrendingDown}
          isLoading={isLoading && purchases.length === 0}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Purchases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    category: value === 'all' ? undefined : (value as ProductCategory),
                    page: 1,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="netflix">Netflix</SelectItem>
                  <SelectItem value="spotify">Spotify</SelectItem>
                  <SelectItem value="hbo">HBO</SelectItem>
                  <SelectItem value="disney">Disney+</SelectItem>
                  <SelectItem value="prime">Prime Video</SelectItem>
                  <SelectItem value="youtube">YouTube Premium</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: value === 'all' ? undefined : (value as any),
                    page: 1,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Items per page */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Items per page</label>
              <Select
                value={filters.limit?.toString() || '10'}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    limit: parseInt(value),
                    page: 1,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase History</CardTitle>
          <CardDescription>
            {pagination
              ? `Showing ${purchases.length} of ${pagination.total} purchases`
              : 'Loading...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={purchases}
            columns={columns}
            isLoading={isLoading}
            emptyMessage="No purchases found. Start shopping in the marketplace!"
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page! - 1 }))
                }
                disabled={filters.page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {filters.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))
                }
                disabled={filters.page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Details Dialog */}
      <PurchaseDetailsDialog
        purchase={selectedPurchase}
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedPurchase(null);
        }}
      />
    </div>
  );
}
