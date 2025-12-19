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
import { EnhancedStatsCard } from '@/components/ui/enhanced-stats-card';
import { EmptyState } from '@/components/ui/empty-state';
import { usePurchases } from '@/lib/hooks/usePurchases';
import { Purchase, PurchasesFilters } from '@/types/seller';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { PurchaseDetailsDialog } from '@/components/seller';
import { formatCurrency } from '@/lib/utils/seller';
import { format } from 'date-fns';
import { ShoppingBag, DollarSign, TrendingDown, Eye } from 'lucide-react';
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

  // Memoize purchases array to prevent unstable dependency
  const purchases = useMemo(() => data?.data || [], [data?.data]);
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
      label: t('purchases.page.purchaseId'),
      render: (purchase) => (
        <span className="font-mono text-xs">{purchase.id.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'product',
      label: t('purchases.page.productLabel'),
      render: (purchase) => (
        <div className="flex items-center gap-2">
          <CategoryBadge category={purchase.product.category} />
          <div>
            <p className="font-medium">{purchase.product.name}</p>
            <p className="text-xs text-muted-foreground">
              {t('purchases.page.by')} {purchase.provider.name}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: t('purchases.page.price'),
      render: (purchase) => (
        <span className="font-medium">{formatCurrency(purchase.amount)}</span>
      ),
    },
    {
      key: 'createdAt',
      label: t('purchases.purchaseDate'),
      render: (purchase) => (
        <span className="text-sm">{format(new Date(purchase.createdAt), 'PPp')}</span>
      ),
    },
    {
      key: 'status',
      label: t('purchases.page.status'),
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
      label: t('purchases.page.actions'),
      render: (purchase) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleViewDetails(purchase)}
        >
          <Eye className="h-4 w-4 mr-2" />
          {t('purchases.viewDetails')}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('purchases.page.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('purchases.page.subtitle')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <EnhancedStatsCard
          title={t('purchases.page.totalPurchases')}
          value={stats.totalPurchases}
          description={t('purchases.page.allTimePurchases')}
          icon={ShoppingBag}
          variant="info"
          isLoading={isLoading && purchases.length === 0}
        />
        <EnhancedStatsCard
          title={t('purchases.page.totalSpent')}
          value={formatCurrency(stats.totalSpent)}
          description={t('purchases.page.totalAmountSpent')}
          icon={DollarSign}
          variant="warning"
          isLoading={isLoading && purchases.length === 0}
        />
        <EnhancedStatsCard
          title={t('purchases.page.averagePrice')}
          value={formatCurrency(stats.averagePrice)}
          description={t('purchases.page.averagePurchasePrice')}
          icon={TrendingDown}
          variant="success"
          isLoading={isLoading && purchases.length === 0}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('purchases.page.filterPurchases')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('purchases.page.category')}</label>
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
                  <SelectValue placeholder={t('purchases.page.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('purchases.page.allCategories')}</SelectItem>
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
              <label className="text-sm font-medium">{t('purchases.page.status')}</label>
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
                  <SelectValue placeholder={t('purchases.page.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('purchases.page.allStatuses')}</SelectItem>
                  <SelectItem value="pending">{t('purchases.page.pending')}</SelectItem>
                  <SelectItem value="completed">{t('purchases.page.completed')}</SelectItem>
                  <SelectItem value="failed">{t('purchases.page.failed')}</SelectItem>
                  <SelectItem value="refunded">{t('purchases.page.refunded')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Items per page */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('purchases.page.itemsPerPage')}</label>
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
          <CardTitle>{t('purchases.page.purchaseHistory')}</CardTitle>
          <CardDescription>
            {pagination
              ? `${t('purchases.page.showing')} ${purchases.length} ${t('purchases.page.of')} ${pagination.total} ${t('purchases.page.purchasesText')}`
              : t('purchases.page.loading')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={purchases}
            columns={columns}
            isLoading={isLoading}
            emptyMessage={t('purchases.page.noPurchasesFound')}
            emptyState={{
              icon: ShoppingBag,
              title: filters.category || filters.status ? t('purchases.page.noPurchasesFiltered') : t('purchases.page.noPurchasesFound'),
              description: filters.category || filters.status
                ? t('purchases.page.tryDifferentFilters')
                : t('purchases.page.startBuyingProducts'),
              variant: filters.category || filters.status ? 'search' : 'default',
            }}
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
                {t('purchases.page.previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('purchases.page.page')} {filters.page} {t('purchases.page.of')} {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))
                }
                disabled={filters.page === pagination.totalPages}
              >
                {t('purchases.page.next')}
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
