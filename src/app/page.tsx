'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeSelector } from '@/components/ThemeSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useWalletBalance } from '@/lib/hooks/useSellerWallet';
import { usePublicMarketplace } from '@/lib/hooks/usePublicMarketplace';
import { MarketplaceProduct, MarketplaceFilters } from '@/types/seller';
import { ProductCategory } from '@/types/provider';
import { ProductCard, ProductDetailsDialog, MarketplaceHero } from '@/components/seller';
import { Search, Filter, X, LogIn, User, LogOut, LayoutDashboard, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/useAuth';

export default function LandingPage() {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const { data: walletBalance } = useWalletBalance();
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [filters, setFilters] = useState<MarketplaceFilters>({
    page: 1,
    limit: 12,
  });
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = usePublicMarketplace(filters);

  const products = data?.data || [];
  const pagination = data?.pagination;

  const handleProductClick = (product: MarketplaceProduct) => {
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  const handleCategoryChange = (category: string) => {
    if (category === 'all') {
      setFilters((prev) => ({
        ...prev,
        categories: undefined,
        page: 1,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        categories: [category as ProductCategory],
        page: 1,
      }));
    }
  };

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setFilters((prev) => ({
      ...prev,
      search: value,
      page: 1,
    }));
  };

  return (
    <div className="space-y-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
                StreamSales
              </span>
            </div>

            <div className="flex items-center gap-4">
              <LanguageSelector />
              <ThemeSelector />
              {user ? (
                <>
                  {walletBalance && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-100">
                      <Wallet className="h-4 w-4" />
                      <span>
                        {walletBalance.currency} {walletBalance.balance}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <User className="h-4 w-4" />
                    </div>
                    <span className="hidden sm:inline">{user.name || user.email}</span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard/seller">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500 hover:text-red-600">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/login">
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </Link>
                  </Button>
                  <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
                    <Link href="/register">Register</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="p-4 md:p-8">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto">
          <MarketplaceHero />
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder={t('seller.marketplace.searchPlaceholder') || 'Search products...'}
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-12 rounded-full border-slate-200 dark:border-slate-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-900 dark:text-white"
            />
            {searchInput && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-2 max-w-full">
            {[
              { id: 'all', label: 'Todo' },
              { id: 'streaming', label: 'Streaming' },
              { id: 'spotify', label: 'Música' },
              { id: 'ai', label: 'IA Tools' },
              { id: 'other', label: 'Diseño' },
              { id: 'course', label: 'Educación' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`
                  px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-200 whitespace-nowrap shadow-sm border
                  ${(filters.categories?.[0] || 'all') === cat.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200 dark:shadow-none'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }
                `}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="h-[400px] rounded-3xl border-none shadow-sm">
                  <CardContent className="p-0 h-full">
                    <Skeleton className="h-32 w-full rounded-t-3xl" />
                    <div className="p-6 space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-10 w-full rounded-xl" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onBuyClick={handleProductClick}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, page: prev.page! - 1 }))
                    }
                    disabled={filters.page === 1}
                    className="rounded-full px-6"
                  >
                    {t('seller.marketplace.previous')}
                  </Button>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border dark:border-slate-800">
                    {t('seller.marketplace.page')} {filters.page} {t('seller.marketplace.of')} {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))
                    }
                    disabled={filters.page === pagination.totalPages}
                    className="rounded-full px-6"
                  >
                    {t('seller.marketplace.next')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={Search}
              title={t('seller.marketplace.noProductsFound')}
              description={t('seller.marketplace.noProductsDesc')}
            />
          )}
        </div>

        {/* Product Details Dialog */}
        <ProductDetailsDialog
          product={selectedProduct}
          isOpen={showProductDetails}
          onClose={() => {
            setShowProductDetails(false);
            setSelectedProduct(null);
          }}
          isGuest={true}
        />
      </div>
    </div>
  );
}
