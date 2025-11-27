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
import { CreateProductDialog } from '@/components/provider/CreateProductDialog';
import { EditProductDialog } from '@/components/provider/EditProductDialog';
import { ProductStatusBadge } from '@/components/provider/ProductStatusBadge';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { useProducts, useDeleteProduct } from '@/lib/hooks/useProducts';
import { Product, ProductCategory, ProductStatus } from '@/types/provider';
import { Edit, Trash2, Search, Package } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProductsPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [status, setStatus] = useState<ProductStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
      render: (product) => (
        <span className="font-medium">${parseFloat(product.price).toFixed(2)}</span>
      ),
    },
    {
      key: 'status',
      label: t('products.status'),
      render: (product) => <ProductStatusBadge status={product.status} />,
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
            onClick={() => setEditingProduct(product)}
            disabled={product.status !== 'available'}
            title={
              product.status !== 'available'
                ? t('provider.products.onlyAvailableEdit')
                : t('provider.products.editProduct')
            }
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(product.id, product.name)}
            disabled={product.status === 'sold'}
            title={
              product.status === 'sold'
                ? t('provider.products.soldCannotDelete')
                : t('provider.products.deleteProduct')
            }
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
        <CreateProductDialog />
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
            ? t('provider.products.noProductsFound') || 'No products found'
            : t('provider.products.noProducts') || 'No products yet',
          description: search
            ? t('provider.products.noProductsFoundDesc') || `No products match "${search}"`
            : t('provider.products.noProductsDesc') || 'Create your first product to get started',
          variant: search ? 'search' : 'default',
        }}
      />

      {editingProduct && (
        <EditProductDialog
          product={editingProduct}
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
        />
      )}
    </div>
  );
}
