'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMarketplace } from '@/lib/hooks/useMarketplace';
import { MarketplaceProduct, MarketplaceFilters } from '@/types/seller';
import { ProductCategory } from '@/types/provider';
import { ProductCard, ProductDetailsDialog } from '@/components/seller';
import { Search, Filter, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MarketplacePage() {
  const { t } = useLanguage();
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [filters, setFilters] = useState<MarketplaceFilters>({
    page: 1,
    limit: 12,
  });
  const [searchInput, setSearchInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState<number[]>([1000]);

  const { data, isLoading } = useMarketplace(filters);

  const products = data?.data || [];
  const pagination = data?.pagination;

  const handleProductClick = (product: MarketplaceProduct) => {
    setSelectedProduct(product);
    setShowProductDetails(true);
  };

  const handleSearch = () => {
    setFilters((prev) => ({
      ...prev,
      search: searchInput || undefined,
      page: 1,
    }));
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

  const handleMaxPriceChange = () => {
    setFilters((prev) => ({
      ...prev,
      maxPrice: maxPriceInput[0],
      page: 1,
    }));
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setMaxPriceInput([1000]);
    setFilters({
      page: 1,
      limit: 12,
    });
  };

  const hasActiveFilters = filters.search || filters.categories || filters.maxPrice;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('seller.marketplace.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('seller.marketplace.subtitle')}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('seller.marketplace.filters')}
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                {t('seller.marketplace.clearFilters')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">{t('seller.marketplace.searchByName')}</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder={t('seller.marketplace.searchPlaceholder')}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">{t('seller.marketplace.category')}</Label>
              <Select
                value={filters.categories?.[0] || 'all'}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder={t('seller.marketplace.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('seller.marketplace.allCategories')}</SelectItem>
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

            {/* Max Price */}
            <div className="space-y-2">
              <Label htmlFor="maxPrice">
                {t('seller.marketplace.maxPrice')}: ${maxPriceInput[0]}
              </Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="maxPrice"
                  min={0}
                  max={1000}
                  step={10}
                  value={maxPriceInput}
                  onValueChange={setMaxPriceInput}
                  className="flex-1"
                />
                <Button onClick={handleMaxPriceChange} size="sm">
                  {t('seller.marketplace.apply')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {pagination
              ? `${t('seller.marketplace.showing')} ${products.length} ${t('seller.marketplace.of')} ${pagination.total} ${t('seller.marketplace.products')}`
              : t('seller.marketplace.loading')}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-24 mb-2" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page! - 1 }))
                  }
                  disabled={filters.page === 1}
                >
                  {t('seller.marketplace.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('seller.marketplace.page')} {filters.page} {t('seller.marketplace.of')} {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, page: prev.page! + 1 }))
                  }
                  disabled={filters.page === pagination.totalPages}
                >
                  {t('seller.marketplace.next')}
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {t('seller.marketplace.noProductsFound')}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  onClick={handleClearFilters}
                  className="mt-2"
                >
                  {t('seller.marketplace.clearFiltersLink')}
                </Button>
              )}
            </CardContent>
          </Card>
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
      />
    </div>
  );
}
