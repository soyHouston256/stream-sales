import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tokenManager } from '@/lib/utils/tokenManager';

interface CreateDisputeRequest {
  purchaseId: string;
  reason: string;
  userType: 'seller' | 'provider' | 'affiliate';
}

interface CreateDisputeResponse {
  dispute: {
    id: string;
    purchaseId: string;
    reason: string;
    status: string;
    createdAt: string;
  };
}

/**
 * Hook para crear una disputa (seller, affiliate o provider)
 */
export function useCreateDispute() {
  const queryClient = useQueryClient();

  return useMutation<CreateDisputeResponse, Error, CreateDisputeRequest>({
    mutationFn: async ({ purchaseId, reason, userType }) => {
      // Determinar el endpoint según el tipo de usuario
      let endpoint: string;
      if (userType === 'seller') {
        endpoint = `/api/seller/purchases/${purchaseId}/dispute`;
      } else if (userType === 'affiliate') {
        endpoint = `/api/affiliate/purchases/${purchaseId}/dispute`;
      } else {
        endpoint = `/api/provider/sales/${purchaseId}/dispute`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getToken()}`,
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dispute');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidar queries relacionadas
      if (variables.userType === 'seller' || variables.userType === 'affiliate') {
        queryClient.invalidateQueries({ queryKey: [variables.userType, 'purchases'] });
        queryClient.invalidateQueries({ queryKey: [variables.userType, 'purchase', variables.purchaseId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['sale', variables.purchaseId] });
      }

      // Invalidar disputes
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });
}

