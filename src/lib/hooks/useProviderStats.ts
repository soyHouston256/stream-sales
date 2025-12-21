'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useQuery } from '@tanstack/react-query';
import { ProviderStats, SalesByCategory } from '@/types/provider';

async function fetchProviderStats(): Promise<ProviderStats> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/provider/stats', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch provider stats');
  }

  return response.json();
}

async function fetchSalesByCategory(): Promise<SalesByCategory[]> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/provider/stats/sales-by-category', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sales by category');
  }

  return response.json();
}

export function useProviderStats() {
  return useQuery({
    queryKey: ['provider', 'stats'],
    queryFn: fetchProviderStats,
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
  });
}

export function useSalesByCategory() {
  return useQuery({
    queryKey: ['provider', 'sales', 'by-category'],
    queryFn: fetchSalesByCategory,
    staleTime: 1000 * 60 * 10, // Consider fresh for 10 minutes
  });
}
