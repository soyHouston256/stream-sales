import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tokenManager } from '@/lib/utils/tokenManager';

interface CreateDisputeRequest {
  purchaseId: string;
  reason: string;
  userType: 'seller' | 'provider';
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
 * Hook para crear una disputa (seller o provider)
 */
export function useCreateDispute() {
  const queryClient = useQueryClient();

  return useMutation<CreateDisputeResponse, Error, CreateDisputeRequest>({
    mutationFn: async ({ purchaseId, reason, userType }) => {
      // Determinar el endpoint según el tipo de usuario
      const endpoint = userType === 'seller'
        ? `/api/seller/purchases/${purchaseId}/dispute`
        : `/api/provider/sales/${purchaseId}/dispute`;

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
      if (variables.userType === 'seller') {
        queryClient.invalidateQueries({ queryKey: ['purchases'] });
        queryClient.invalidateQueries({ queryKey: ['purchase', variables.purchaseId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['sales'] });
        queryClient.invalidateQueries({ queryKey: ['sale', variables.purchaseId] });
      }

      // Invalidar disputes
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });
}
