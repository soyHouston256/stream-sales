'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, Column } from '@/components/admin/DataTable';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { useProviderSales } from '@/lib/hooks/useProviderSales';
import { ProviderSale } from '@/types/provider';
import { format } from 'date-fns';
import { TrendingUp, DollarSign, AlertCircle, ShoppingBag } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SalesPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'completed' | 'refunded' | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useProviderSales({
    page,
    limit: 10,
    status: status === 'all' ? undefined : status,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const sales = data?.data || [];

  // Calculate totals
  const totals = sales.reduce(
    (acc, sale) => {
      acc.revenue += parseFloat(sale.amount);
      acc.earnings += parseFloat(sale.providerEarnings);
      acc.commission += parseFloat(sale.adminCommission);
      return acc;
    },
    { revenue: 0, earnings: 0, commission: 0 }
  );

  const columns: Column<ProviderSale>[] = [
    {
      key: 'id',
      label: t('provider.sales.purchaseId'),
      render: (sale) => (
        <span className="font-mono text-xs">{sale.id.slice(0, 8)}...</span>
      ),
    },
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
          <p className="text-xs text-muted-foreground">
            {sale.buyerEmail}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      label: t('provider.sales.salePrice'),
      render: (sale) => <span className="font-medium">${sale.amount}</span>,
    },
    {
      key: 'adminCommission',
      label: t('provider.sales.commission'),
      render: (sale) => (
        <div>
          <p className="text-sm">${sale.adminCommission}</p>
          <p className="text-xs text-muted-foreground">
            ({(parseFloat(sale.commissionRate) * 100).toFixed(0)}%)
          </p>
        </div>
      ),
    },
    {
      key: 'providerEarnings',
      label: t('provider.sales.netEarnings'),
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
          ? format(new Date(sale.completedAt), 'MMM dd, yyyy hh:mm a')
          : '-',
    },
    {
      key: 'status',
      label: t('products.status'),
      render: (sale) => {
        const getStatusVariant = (status: string) => {
          switch (status) {
            case 'completed':
              return 'default';
            case 'refunded':
              return 'destructive';
            case 'pending':
              return 'secondary';
            default:
              return 'secondary';
          }
        };

        const getStatusLabel = (status: string) => {
          // Try to get translation
          const key = `purchases.status.${status}`;
          const translation = t(key);
          // If translation exists, use it. Otherwise use status as-is
          return translation !== key ? translation : status;
        };

        return (
          <div className="flex flex-col gap-1">
            <Badge variant={getStatusVariant(sale.status)}>
              {getStatusLabel(sale.status)}
            </Badge>
            {sale.refundedAt && (
              <span className="text-xs text-muted-foreground">
                {format(new Date(sale.refundedAt), 'MMM dd, yyyy')}
              </span>
            )}
            {sale.dispute && (
              <Badge variant="warning" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                {t('disputes.status')}: {sale.dispute.status}
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('provider.sales.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('provider.sales.subtitle')}
        </p>
      </div>

      {sales.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('provider.sales.totalRevenue')}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totals.revenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('provider.sales.fromSales')
                  .replace('{count}', sales.length.toString())
                  .replace('{plural}', sales.length !== 1 ? 's' : '')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('provider.sales.yourEarnings')}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totals.earnings.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('provider.sales.afterCommission')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('provider.sales.totalCommission')}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totals.commission.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('provider.sales.platformFees')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('provider.sales.filters')}</CardTitle>
          <CardDescription>{t('provider.sales.filtersDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">{t('provider.sales.startDate')}</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">{t('provider.sales.endDate')}</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('products.status')}</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as 'completed' | 'refunded' | 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder={t('provider.sales.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('provider.sales.allStatuses')}</SelectItem>
                  <SelectItem value="completed">{t('provider.sales.completed')}</SelectItem>
                  <SelectItem value="refunded">{t('provider.sales.refunded')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                onClick={() => {
                  setStatus('all');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="w-full"
              >
                {t('provider.sales.clearFilters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={sales}
        columns={columns}
        isLoading={isLoading}
        pagination={
          data
            ? {
              currentPage: data.pagination.page,
              totalPages: data.pagination.totalPages,
              onPageChange: setPage,
            }
            : undefined
        }
        emptyState={{
          icon: ShoppingBag,
          title: startDate || endDate || status !== 'all'
            ? t('provider.sales.noSalesFound') || 'No sales found'
            : t('provider.sales.noSales') || 'No sales yet',
          description: startDate || endDate || status !== 'all'
            ? t('provider.sales.noSalesFoundDesc') || 'No sales found with the current filters'
            : t('provider.sales.noSalesDesc') || 'Your sold products will appear here',
          variant: 'default',
        }}
      />
    </div>
  );
}
