'use client';

import { useQuery } from '@tanstack/react-query';
import {
  MarketplaceProduct,
  MarketplaceFilters,
  PaginatedResponse,
} from '@/types/seller';
import { tokenManager } from '@/lib/utils/tokenManager';

async function fetchMarketplaceProducts(
  filters: MarketplaceFilters
): Promise<PaginatedResponse<MarketplaceProduct>> {
  const token = tokenManager.getToken();
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.categories && filters.categories.length > 0) {
    filters.categories.forEach((cat) => params.append('category', cat));
  }
  if (filters.maxPrice !== undefined) {
    params.append('maxPrice', filters.maxPrice.toString());
  }
  if (filters.search) params.append('search', filters.search);

  const response = await fetch(`/api/seller/marketplace?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch marketplace products');
  }

  return response.json();
}

async function fetchMarketplaceProduct(
  id: string
): Promise<MarketplaceProduct> {
  const token = tokenManager.getToken();
  const response = await fetch(`/api/seller/marketplace/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch product details');
  }

  return response.json();
}

export function useMarketplace(filters: MarketplaceFilters = {}) {
  return useQuery({
    queryKey: ['seller', 'marketplace', filters],
    queryFn: () => fetchMarketplaceProducts(filters),
  });
}

export function useMarketplaceProduct(id: string) {
  return useQuery({
    queryKey: ['seller', 'marketplace', id],
    queryFn: () => fetchMarketplaceProduct(id),
    enabled: !!id,
  });
}
