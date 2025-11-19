'use client';

import { useQuery } from '@tanstack/react-query';
import { SellerStats } from '@/types/seller';
import { tokenManager } from '@/lib/utils/tokenManager';

async function fetchSellerStats(): Promise<SellerStats> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/seller/stats', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch seller stats');
  }

  return response.json();
}

export function useSellerStats() {
  return useQuery({
    queryKey: ['seller', 'stats'],
    queryFn: fetchSellerStats,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
