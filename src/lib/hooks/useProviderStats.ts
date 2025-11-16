'use client';

import { useQuery } from '@tanstack/react-query';
import { ProviderStats, SalesByCategory } from '@/types/provider';

async function fetchProviderStats(): Promise<ProviderStats> {
  const token = localStorage.getItem('token');
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
  const token = localStorage.getItem('token');
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
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useSalesByCategory() {
  return useQuery({
    queryKey: ['provider', 'sales', 'by-category'],
    queryFn: fetchSalesByCategory,
    refetchInterval: 60000, // Refetch every minute
  });
}
