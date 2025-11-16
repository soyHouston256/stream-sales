import { useQuery } from '@tanstack/react-query';
import { ConciliatorStats, ResolutionsByDay } from '@/types/conciliator';

/**
 * Hook para obtener estadísticas del dashboard del conciliator
 */
export function useConciliatorStats() {
  return useQuery<ConciliatorStats>({
    queryKey: ['conciliator', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/conciliator/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch conciliator stats');
      }

      return response.json();
    },
    refetchInterval: 60000, // Refetch cada minuto para stats en tiempo real
  });
}

/**
 * Hook para obtener resoluciones por día (para gráfico)
 */
export function useResolutionsByDay(days: number = 30) {
  return useQuery<ResolutionsByDay[]>({
    queryKey: ['conciliator', 'resolutions-by-day', days],
    queryFn: async () => {
      const response = await fetch(`/api/conciliator/stats/resolutions-by-day?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch resolutions by day');
      }

      return response.json();
    },
  });
}
