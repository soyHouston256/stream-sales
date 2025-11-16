'use client';

import { tokenManager } from '@/lib/utils/tokenManager';

import { useQuery } from '@tanstack/react-query';
import { AffiliateInfo } from '@/types/affiliate';

async function fetchAffiliateInfo(): Promise<AffiliateInfo> {
  const token = tokenManager.getToken();
  const response = await fetch('/api/affiliate/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch affiliate info');
  }

  return response.json();
}

export function useAffiliateInfo() {
  return useQuery({
    queryKey: ['affiliate', 'info'],
    queryFn: fetchAffiliateInfo,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
