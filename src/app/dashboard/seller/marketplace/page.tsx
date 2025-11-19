'use client';

import { useState } from 'react';
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
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground mt-2">
          Browse and purchase digital products
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search by name</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Search products..."
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
              <Label htmlFor="category">Category</Label>
              <Select
                value={filters.categories?.[0] || 'all'}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger id="category">
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

            {/* Max Price */}
            <div className="space-y-2">
              <Label htmlFor="maxPrice">
                Max Price: ${maxPriceInput[0]}
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
                  Apply
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
              ? `Showing ${products.length} of ${pagination.total} products`
              : 'Loading...'}
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
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No products found matching your criteria.
              </p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  onClick={handleClearFilters}
                  className="mt-2"
                >
                  Clear filters
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
