'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useQuery } from '@tanstack/react-query';
import { MarketingTemplate, MarketingStats } from '@/types/affiliate';

async function fetchMarketingTemplates(): Promise<MarketingTemplate[]> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/affiliate/marketing/templates', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch marketing templates');
  }

  return response.json();
}

async function fetchMarketingStats(): Promise<MarketingStats> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/affiliate/marketing/stats', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch marketing stats');
  }

  return response.json();
}

export function useMarketingTemplates() {
  return useQuery({
    queryKey: ['affiliate', 'marketing', 'templates'],
    queryFn: fetchMarketingTemplates,
    staleTime: 10 * 60 * 1000, // 10 minutes - templates don't change often
  });
}

export function useMarketingStats() {
  return useQuery({
    queryKey: ['affiliate', 'marketing', 'stats'],
    queryFn: fetchMarketingStats,
    refetchInterval: 60000, // Refetch every minute
  });
}
