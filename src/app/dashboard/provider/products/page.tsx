'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
import { ProductCreatorWizard } from '@/components/provider/products/wizard/ProductCreatorWizard';
import { ProductStatusBadge } from '@/components/provider/ProductStatusBadge';
import { CategoryBadge } from '@/components/provider/CategoryBadge';
import { AddStockDialog } from '@/components/provider/AddStockDialog';
import { InventoryDetailsDialog } from '@/components/provider/InventoryDetailsDialog';
import { useProducts, useDeleteProduct } from '@/lib/hooks/useProducts';
import { Product, ProductCategory, ProductStatus } from '@/types/provider';
import {
  Edit,
  Trash2,
  Search,
  Package,
  Plus,
  CheckCircle2,
  ShoppingCart,
  Users,
  Clock,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { tokenManager } from '@/lib/utils/tokenManager';
import { cn } from '@/lib/utils';

// Enhanced Stat Card Component
const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  trend
}: {
  label: string;
  value: string;
  icon: any;
  color: 'blue' | 'red' | 'green' | 'purple';
  trend?: string;
}) => {
  const colorStyles = {
    blue: "from-blue-500 to-blue-600",
    red: "from-rose-500 to-rose-600",
    green: "from-emerald-500 to-emerald-600",
    purple: "from-violet-500 to-violet-600",
  };

  const bgStyles = {
    blue: "bg-blue-50 dark:bg-blue-950/30",
    red: "bg-rose-50 dark:bg-rose-950/30",
    green: "bg-emerald-50 dark:bg-emerald-950/30",
    purple: "bg-violet-50 dark:bg-violet-950/30",
  };

  return (
    // eslint-disable-next-line security/detect-object-injection
    <Card className={cn("relative overflow-hidden border-0 shadow-lg", bgStyles[color])}>
      {/* eslint-disable-next-line security/detect-object-injection */}
      <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 bg-gradient-to-br", colorStyles[color])} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
            <h3 className="text-3xl font-black">{value}</h3>
            {trend && (
              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                <TrendingUp size={12} />
                <span>{trend}</span>
              </div>
            )}
          </div>
          {/* eslint-disable-next-line security/detect-object-injection */}
          <div className={cn("p-3 rounded-2xl bg-gradient-to-br shadow-lg text-white", colorStyles[color])}>
            <Icon size={24} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Pending Approval Banner
const PendingApprovalBanner = ({ status }: { status: string }) => {
  const configs = {
    pending: {
      icon: Clock,
      title: 'Tu cuenta está en revisión',
      description: 'Estamos verificando tu información. Te notificaremos cuando sea aprobada.',
      color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
      iconColor: 'text-amber-500',
      badge: 'Pendiente'
    },
    rejected: {
      icon: XCircle,
      title: 'Cuenta no aprobada',
      description: 'Tu solicitud fue rechazada. Contacta soporte para más información.',
      color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
      iconColor: 'text-red-500',
      badge: 'Rechazada'
    },
    suspended: {
      icon: AlertTriangle,
      title: 'Cuenta suspendida',
      description: 'Tu cuenta ha sido suspendida temporalmente.',
      color: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800',
      iconColor: 'text-gray-500',
      badge: 'Suspendida'
    }
  };

  const config = configs[status as keyof typeof configs] || configs.pending;
  const Icon = config.icon;

  return (
    <div className={cn("rounded-2xl border-2 p-6 mb-6", config.color)}>
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-xl bg-white dark:bg-gray-900 shadow-sm", config.iconColor)}>
          <Icon size={28} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold text-lg">{config.title}</h3>
            <Badge variant="outline" className={cn("text-xs", config.iconColor)}>
              {config.badge}
            </Badge>
          </div>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
      </div>
    </div>
  );
};

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [status, setStatus] = useState<ProductStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [providerStatus, setProviderStatus] = useState<string | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false);
  const [stockDialogProduct, setStockDialogProduct] = useState<{ id: string; name: string } | null>(null);
  const [inventoryDialogProduct, setInventoryDialogProduct] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useProducts({
    page,
    limit: 10,
    category: category === 'all' ? undefined : category,
    status: status === 'all' ? undefined : status,
    search: search || undefined,
  });

  const deleteProduct = useDeleteProduct();

  const handleDelete = async (id: string, productName: string) => {
    if (window.confirm(t('provider.products.confirmDelete').replace('{name}', productName))) {
      await deleteProduct.mutateAsync(id);
    }
  };

  // Fetch provider status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = tokenManager.getToken();
        if (!token) {
          setIsStatusLoading(false);
          return;
        }

        const res = await fetch('/api/provider/status', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store'
        });

        if (res.ok) {
          const data = await res.json();
          setProviderStatus(data.status);
        }
      } catch (err) {
        console.error('Error fetching provider status', err);
      } finally {
        setIsStatusLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const isApproved = providerStatus?.toLowerCase() === 'approved';

  const handleNewProductClick = () => {
    if (isStatusLoading) return;
    if (isApproved) {
      setIsWizardOpen(true);
    } else {
      setShowRestrictionDialog(true);
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
      render: (product: any) => (
        <div className="min-w-[200px]">
          <p className="font-semibold">{product.name}</p>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {product.description}
          </p>
          {product.accountType && (
            <Badge
              variant="outline"
              className={cn(
                "mt-1 text-[10px] font-medium",
                product.accountType === 'full'
                  ? "border-indigo-300 text-indigo-600 dark:border-indigo-700 dark:text-indigo-400"
                  : "border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400"
              )}
            >
              {product.accountType === 'full'
                ? (t('provider.products.fullAccount') || 'Cuenta Completa')
                : (t('provider.products.profile') || 'Perfil')}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'price',
      label: t('products.price'),
      render: (product) => {
        const price = product.variants?.[0]?.price;
        return (
          <span className="font-bold text-lg">
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
      key: 'stock',
      label: t('provider.products.stock') || 'Stock',
      render: (product: any) => {
        const total = product.stockTotal || 0;
        const available = product.stockAvailable || 0;
        if (total === 0) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return (
          <button
            onClick={() => setInventoryDialogProduct({ id: product.id, name: product.name })}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer group"
          >
            <Package className="h-4 w-4 text-muted-foreground group-hover:text-indigo-500" />
            <span className={cn(
              "font-bold underline decoration-dashed underline-offset-2",
              available === 0 ? "text-red-500" : available <= 2 ? "text-amber-500" : "text-emerald-500"
            )}>
              {available}/{total}
            </span>
          </button>
        );
      },
    },
    {
      key: 'createdAt',
      label: t('provider.products.created'),
      render: (product) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(product.createdAt), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (product) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            onClick={() => setStockDialogProduct({ id: product.id, name: product.name })}
            title={t('provider.products.addStock') || 'Agregar Stock'}
          >
            <Plus className="h-4 w-4 text-emerald-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            onClick={() => router.push(`/dashboard/provider/products/${product.id}`)}
            title={t('common.edit')}
          >
            <Edit className="h-4 w-4 text-indigo-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => handleDelete(product.id, product.name)}
            disabled={product.isActive}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{t('provider.products.title')}</h1>
            {isApproved && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                <ShieldCheck size={14} className="mr-1" />
                Verificado
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            {t('provider.products.subtitle')}
          </p>
        </div>
        <Button
          onClick={handleNewProductClick}
          disabled={isStatusLoading}
          className="px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95 hover:shadow-xl hover:shadow-primary/30"
          size="lg"
        >
          <Plus size={20} />
          <span className="hidden sm:inline">{t('provider.products.newProduct')}</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {/* Pending Approval Banner - Only show if not approved */}
      {!isStatusLoading && !isApproved && providerStatus && (
        <PendingApprovalBanner status={providerStatus} />
      )}

      {/* Stats Cards - Only show if approved */}
      {isApproved && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={t('provider.products.totalProducts')}
            value={data?.pagination?.total?.toString() || "0"}
            icon={Package}
            color="blue"
          />
          <StatCard
            label={t('provider.products.stockCritical')}
            value="0"
            icon={CheckCircle2}
            color="red"
          />
          <StatCard
            label={t('provider.products.salesToday')}
            value="$0"
            icon={ShoppingCart}
            color="green"
            trend="+0% hoy"
          />
          <StatCard
            label={t('provider.products.activeClients')}
            value="0"
            icon={Users}
            color="purple"
          />
        </div>
      )}

      {/* Filters Card */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{t('provider.products.filters')}</CardTitle>
          </div>
          <CardDescription>{t('provider.products.filtersDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-xs font-bold uppercase text-muted-foreground">
                {t('common.search')}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder={t('provider.products.searchPlaceholder')}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-xs font-bold uppercase text-muted-foreground">
                {t('products.category')}
              </Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value as ProductCategory | 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger id="category" className="rounded-xl">
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
              <Label htmlFor="status" className="text-xs font-bold uppercase text-muted-foreground">
                {t('products.status')}
              </Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as ProductStatus | 'all');
                  setPage(1);
                }}
              >
                <SelectTrigger id="status" className="rounded-xl">
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
              <Label className="text-xs font-bold uppercase text-muted-foreground">&nbsp;</Label>
              <Button
                variant="outline"
                onClick={() => {
                  setCategory('all');
                  setStatus('all');
                  setSearch('');
                  setPage(1);
                }}
                className="w-full rounded-xl"
              >
                {t('provider.products.clearFilters')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
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
          icon: search ? Search : Package,
          title: search
            ? t('provider.products.noProductsFound')
            : t('provider.products.noProducts'),
          description: search
            ? t('provider.products.noProductsFoundDesc').replace('{search}', search)
            : t('provider.products.noProductsDesc'),
          variant: search ? 'search' : 'default',
        }}
      />

      {/* Product Creator Wizard */}
      {isWizardOpen && (
        <ProductCreatorWizard onClose={() => setIsWizardOpen(false)} />
      )}

      {/* Restriction Dialog - Cleaned up without debug info */}
      <Dialog open={showRestrictionDialog} onOpenChange={setShowRestrictionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <DialogTitle className="text-xl">
              {t('provider.products.restriction.title')}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              {t('provider.products.restriction.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Estado actual de tu cuenta:
            </p>
            <Badge
              variant="outline"
              className="mt-2 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30"
            >
              <Clock size={14} className="mr-1" />
              Pendiente de aprobación
            </Badge>
          </div>

          <DialogFooter className="pt-4">
            <Button
              onClick={() => setShowRestrictionDialog(false)}
              className="w-full rounded-xl"
            >
              {t('provider.products.restriction.button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stock Dialog */}
      {stockDialogProduct && (
        <AddStockDialog
          productId={stockDialogProduct.id}
          productName={stockDialogProduct.name}
          isOpen={!!stockDialogProduct}
          onClose={() => setStockDialogProduct(null)}
          onSuccess={() => {
            // Invalidate products cache to refresh the list
            queryClient.invalidateQueries({ queryKey: ['provider', 'products'] });
            setStockDialogProduct(null);
          }}
        />
      )}

      {/* Inventory Details Dialog */}
      <InventoryDetailsDialog
        productId={inventoryDialogProduct?.id || null}
        productName={inventoryDialogProduct?.name || ''}
        isOpen={!!inventoryDialogProduct}
        onClose={() => {
          // Invalidate products cache when closing inventory dialog (may have deleted items)
          queryClient.invalidateQueries({ queryKey: ['provider', 'products'] });
          setInventoryDialogProduct(null);
        }}
      />
    </div>
  );
}
