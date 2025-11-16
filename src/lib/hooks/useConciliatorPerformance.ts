import { useQuery } from '@tanstack/react-query';
import { ConciliatorPerformance, HistoryResponse, DisputeFilters } from '@/types/conciliator';

/**
 * Hook para obtener estadísticas de performance del conciliator
 */
export function useConciliatorPerformance() {
  return useQuery<ConciliatorPerformance>({
    queryKey: ['conciliator', 'performance'],
    queryFn: async () => {
      const response = await fetch('/api/conciliator/performance', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conciliator performance');
      }

      return response.json();
    },
  });
}

/**
 * Hook para obtener historial de disputas resueltas por el conciliator
 */
export function useMyHistory(filters: Partial<DisputeFilters> = {}) {
  const queryParams = new URLSearchParams();

  if (filters.page) queryParams.append('page', filters.page.toString());
  if (filters.limit) queryParams.append('limit', filters.limit.toString());
  if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);

  return useQuery<HistoryResponse>({
    queryKey: ['conciliator', 'history', filters],
    queryFn: async () => {
      const response = await fetch(`/api/conciliator/history?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      return response.json();
    },
  });
}
