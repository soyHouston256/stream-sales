'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable, Column } from '@/components/admin/DataTable';
import { ProductCreatorWizard } from '@/components/provider/products/wizard/ProductCreatorWizard';
import { ProductStatusBadge } from '@/components/provider/ProductStatusBadge';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { useProducts, useDeleteProduct } from '@/lib/hooks/useProducts';
import { Product, ProductCategory, ProductStatus } from '@/types/provider';
import { Edit, Trash2, Search, Package, Plus, CheckCircle2, ShoppingCart, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

// Simple Stat Card Component
const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: 'blue' | 'red' | 'green' | 'purple' }) => {
  const colorStyles = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">{label}</p>
        <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colorStyles[color]}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

import { useRouter } from 'next/navigation';

export default function ProductsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [status, setStatus] = useState<ProductStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const { data, isLoading } = useProducts({
    page,
    limit: 10,
    category: category === 'all' ? undefined : category,
    status: status === 'all' ? undefined : status,
    search: search || undefined,
  });

  const deleteProduct = useDeleteProduct();

  const handleDelete = async (id: string, productName: string) => {
    if (
      window.confirm(
        t('provider.products.confirmDelete').replace('{name}', productName)
      )
    ) {
      await deleteProduct.mutateAsync(id);
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'category',
      label: t('provider.category'),
      render: (product) => <CategoryBadge category={product.category} />,
    },
    {
      key: 'name',
      label: t('provider.products.productName'),
      render: (product) => (
        <div>
          <p className="font-medium">{product.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {product.description}
          </p>
        </div>
      ),
    },
    {
      key: 'price',
      label: t('products.price'),
      render: (product) => {
        const price = product.variants?.[0]?.price;
        return (
          <span className="font-medium">
            {price ? `$${parseFloat(price).toFixed(2)}` : '-'}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: t('products.status'),
      render: (product) => (
        <ProductStatusBadge status={product.isActive ? 'available' : 'reserved'} />
      ),
    },
    {
      key: 'createdAt',
      label: t('provider.products.created'),
      render: (product) => format(new Date(product.createdAt), 'MMM dd, yyyy'),
    },
    {
      key: 'actions',
      label: t('provider.products.actions'),
      render: (product) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/provider/products/${product.id}`)}
            title={t('common.edit')}
          >
            <Edit className="h-4 w-4 text-indigo-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(product.id, product.name)}
            disabled={product.isActive} // Example logic: cannot delete active products? Or maybe just allow it.
            title={t('provider.products.deleteProduct')}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('provider.products.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('provider.products.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setIsWizardOpen(true)}
          className="px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 active:scale-95"
        >
          <Plus size={20} /> {t('provider.products.newProduct')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label={t('provider.products.totalProducts')} value={data?.pagination?.total?.toString() || "0"} icon={Package} color="blue" />
        <StatCard label={t('provider.products.stockCritical')} value="0" icon={CheckCircle2} color="red" />
        <StatCard label={t('provider.products.salesToday')} value="$0" icon={ShoppingCart} color="green" />
        <StatCard label={t('provider.products.activeClients')} value="0" icon={Users} color="purple" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('provider.products.filters')}</CardTitle>
          <CardDescription>{t('provider.products.filtersDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">{t('common.search')}</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={t('provider.products.searchPlaceholder')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">{t('products.category')}</Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value as ProductCategory | 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder={t('provider.products.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('provider.products.allCategories')}</SelectItem>
                  <SelectItem value="netflix">Netflix</SelectItem>
                  <SelectItem value="spotify">Spotify</SelectItem>
                  <SelectItem value="hbo">HBO</SelectItem>
                  <SelectItem value="disney">Disney+</SelectItem>
                  <SelectItem value="prime">Prime Video</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('products.status')}</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as ProductStatus | 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder={t('provider.products.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('provider.products.allStatuses')}</SelectItem>
                  <SelectItem value="available">{t('products.available')}</SelectItem>
                  <SelectItem value="reserved">{t('products.reserved')}</SelectItem>
                  <SelectItem value="sold">{t('products.sold')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                onClick={() => {
                  setCategory('all');
                  setStatus('all');
                  setSearch('');
                  setPage(1);
                }}
                className="w-full"
              >
                {t('provider.products.clearFilters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        data={data?.data || []}
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
          icon: Package,
          title: search
            ? t('provider.products.noProductsFound')
            : t('provider.products.noProducts'),
          description: search
            ? t('provider.products.noProductsFoundDesc').replace('{search}', search)
            : t('provider.products.noProductsDesc'),
          variant: search ? 'search' : 'default',
        }}
      />

      {isWizardOpen && (
        <ProductCreatorWizard onClose={() => setIsWizardOpen(false)} />
      )}
    </div>
  );
}
