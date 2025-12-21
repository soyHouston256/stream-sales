'use client';

import { tokenManager } from '@/lib/utils/tokenManager';
import { useQuery } from '@tanstack/react-query';

export interface PurchaseCredentials {
    email: string;
    password: string;
    profiles: Array<{
        name: string;
        pin: string | null;
    }>;
    productName: string;
    category: string;
}

type UserType = 'seller' | 'affiliate';

/**
 * Fetch decrypted credentials for a purchase
 * Only the purchase owner can access these credentials
 */
async function fetchCredentials(purchaseId: string, userType: UserType = 'seller'): Promise<PurchaseCredentials> {
    const token = tokenManager.getToken();
    const endpoint = userType === 'affiliate' ? '/api/affiliate/purchases' : '/api/seller/purchases';

    const response = await fetch(`${endpoint}/${purchaseId}/credentials`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch credentials');
    }

    return response.json();
}

/**
 * Hook to fetch purchase credentials
 * 
 * @param purchaseId - The ID of the purchase (OrderItem)
 * @param enabled - Whether to enable the query (default: false for security)
 * @param userType - Type of user ('seller' or 'affiliate')
 * 
 * @example
 * const { data, isLoading, error, refetch } = usePurchaseCredentials('purchase_id', false, 'affiliate');
 * // Later, when user clicks "Ver Credenciales":
 * refetch();
 */
export function usePurchaseCredentials(purchaseId: string, enabled: boolean = false, userType: UserType = 'seller') {
    return useQuery({
        queryKey: [userType, 'purchase', 'credentials', purchaseId],
        queryFn: () => fetchCredentials(purchaseId, userType),
        enabled: enabled && !!purchaseId, // Only fetch when explicitly enabled
        staleTime: 0, // Always refetch for security
        gcTime: 0, // Don't cache credentials (previously cacheTime)
        retry: false, // Don't retry on error
    });
}

