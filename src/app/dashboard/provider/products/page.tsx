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
import { Edit, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data, isLoading } = useProducts({
    page,
    limit: 10,
    category: category || undefined,
    status: status || undefined,
    search: search || undefined,
  });

  const deleteProduct = useDeleteProduct();

  const handleDelete = async (id: string, productName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${productName}"? This action cannot be undone.`
      )
    ) {
      await deleteProduct.mutateAsync(id);
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'category',
      label: 'Category',
      render: (product) => <CategoryBadge category={product.category} />,
    },
    {
      key: 'name',
      label: 'Product Name',
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
      label: 'Price',
      render: (product) => (
        <span className="font-medium">${parseFloat(product.price).toFixed(2)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (product) => <ProductStatusBadge status={product.status} />,
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (product) => format(new Date(product.createdAt), 'MMM dd, yyyy'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (product) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingProduct(product)}
            disabled={product.status !== 'available'}
            title={
              product.status !== 'available'
                ? 'Only available products can be edited'
                : 'Edit product'
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
                ? 'Sold products cannot be deleted'
                : 'Delete product'
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
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground mt-2">
            Manage your digital product catalog
          </p>
        </div>
        <CreateProductDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter products by category, status, or search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search products..."
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
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value as ProductCategory | '');
                  setPage(1);
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
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
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as ProductStatus | '');
                  setPage(1);
                }}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                onClick={() => {
                  setCategory('');
                  setStatus('');
                  setSearch('');
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
        emptyMessage="No products found. Create your first product to get started!"
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
