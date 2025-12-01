'use client';

import { useQuery } from '@tanstack/react-query';
import {
    MarketplaceProduct,
    MarketplaceFilters,
    PaginatedResponse,
} from '@/types/seller';

async function fetchPublicMarketplaceProducts(
    filters: MarketplaceFilters
): Promise<PaginatedResponse<MarketplaceProduct>> {
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

    const response = await fetch(`/api/marketplace?${params.toString()}`);

    if (!response.ok) {
        throw new Error('Failed to fetch marketplace products');
    }

    return response.json();
}

export function usePublicMarketplace(filters: MarketplaceFilters = {}) {
    return useQuery({
        queryKey: ['public', 'marketplace', filters],
        queryFn: () => fetchPublicMarketplaceProducts(filters),
    });
}
