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
import { TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
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
      label: 'Purchase ID',
      render: (sale) => (
        <span className="font-mono text-xs">{sale.id.slice(0, 8)}...</span>
      ),
    },
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
          <p className="text-xs text-muted-foreground">
            {sale.buyerEmail}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Sale Price',
      render: (sale) => <span className="font-medium">${sale.amount}</span>,
    },
    {
      key: 'adminCommission',
      label: 'Commission',
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
      label: 'Net Earnings',
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
          ? format(new Date(sale.completedAt), 'MMM dd, yyyy HH:mm')
          : '-',
    },
    {
      key: 'status',
      label: 'Status',
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
        <h1 className="text-3xl font-bold">Sales History</h1>
        <p className="text-muted-foreground mt-2">
          Track all purchases of your products
        </p>
      </div>

      {sales.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totals.revenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {sales.length} sale{sales.length !== 1 ? 's' : ''} on this
                page
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Your Earnings
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totals.earnings.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                After commission deductions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Commission
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totals.commission.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Platform fees
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter sales by date range and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
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
              <Label htmlFor="endDate">End Date</Label>
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
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as 'completed' | 'refunded' | 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
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
                Clear Filters
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
        emptyMessage="No sales found. Your sold products will appear here."
      />
    </div>
  );
}
