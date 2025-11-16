'use client';

import { useQuery } from '@tanstack/react-query';
import { AdminStats, SalesData } from '@/types/admin';

async function fetchAdminStats(): Promise<AdminStats> {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/admin/stats', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch admin stats');
  }

  return response.json();
}

async function fetchSalesData(days: number = 7): Promise<SalesData[]> {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/admin/stats/sales?days=${days}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sales data');
  }

  return response.json();
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: fetchAdminStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useSalesData(days: number = 7) {
  return useQuery({
    queryKey: ['admin', 'sales', days],
    queryFn: () => fetchSalesData(days),
    refetchInterval: 60000, // Refetch every minute
  });
}
