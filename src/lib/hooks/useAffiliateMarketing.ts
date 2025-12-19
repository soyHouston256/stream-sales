'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useQuery } from '@tanstack/react-query';
import { MarketingTemplate, MarketingStats } from '@/types/affiliate';

async function fetchMarketingTemplates(lang: string = 'es'): Promise<MarketingTemplate[]> {
  const token = tokenManager.getToken();
  const response = await fetch(`/api/affiliate/marketing/templates?lang=${lang}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch marketing templates');
  }

  const data = await response.json();
  return data.templates;
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

  const data = await response.json();
  return data.stats;
}

export function useMarketingTemplates(lang: string = 'es') {
  return useQuery({
    queryKey: ['affiliate', 'marketing', 'templates', lang],
    queryFn: () => fetchMarketingTemplates(lang),
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
