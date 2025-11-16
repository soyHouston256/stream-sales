'use client';

import { useQuery } from '@tanstack/react-query';
import { ProviderSale, SalesFilters, PaginatedResponse } from '@/types/provider';

async function fetchProviderSales(
  filters: SalesFilters
): Promise<PaginatedResponse<ProviderSale>> {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.limit) params.append('limit', filters.limit.toString());
  if (filters.status) params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  const response = await fetch(`/api/provider/sales?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sales');
  }

  return response.json();
}

async function fetchProviderSaleDetails(id: string): Promise<ProviderSale> {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/provider/sales/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sale details');
  }

  return response.json();
}

export function useProviderSales(filters: SalesFilters = {}) {
  return useQuery({
    queryKey: ['provider', 'sales', filters],
    queryFn: () => fetchProviderSales(filters),
  });
}

export function useProviderSaleDetails(id: string) {
  return useQuery({
    queryKey: ['provider', 'sales', id],
    queryFn: () => fetchProviderSaleDetails(id),
    enabled: !!id,
  });
}
