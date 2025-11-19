import { useQuery } from '@tanstack/react-query';
import { tokenManager } from '@/lib/utils/tokenManager';

interface DisputeProduct {
  id: string;
  name: string;
  category: string;
}

interface DisputePurchase {
  id: string;
  amount: number;
  product: DisputeProduct;
}

interface DisputeProvider {
  id: string;
  name: string;
  email: string;
}

interface Dispute {
  id: string;
  reason: string;
  status: string;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
  purchase: DisputePurchase;
  provider: DisputeProvider;
}

interface SellerDisputesResponse {
  disputes: Dispute[];
}

/**
 * Hook para obtener las disputas del seller actual
 */
export function useSellerDisputes() {
  return useQuery<SellerDisputesResponse>({
    queryKey: ['seller', 'disputes'],
    queryFn: async () => {
      const response = await fetch('/api/seller/disputes', {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch disputes');
      }

      return response.json();
    },
  });
}

/**
 * Hook para obtener detalles de una disputa específica
 */
export function useSellerDisputeDetails(id: string) {
  return useQuery<Dispute>({
    queryKey: ['seller', 'disputes', id],
    queryFn: async () => {
      const response = await fetch(`/api/seller/disputes/${id}`, {
        headers: {
          'Authorization': `Bearer ${tokenManager.getToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch dispute details');
      }

      return response.json();
    },
    enabled: !!id,
  });
}
