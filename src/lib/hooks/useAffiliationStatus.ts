import { useQuery } from '@tanstack/react-query';
import { tokenManager } from '@/lib/utils/tokenManager';

interface AffiliationStatus {
    hasAffiliation: boolean;
    approvalStatus?: string;
    canRecharge: boolean;
    affiliateName?: string;
    affiliateEmail?: string;
    approvedAt?: string;
    rejectedAt?: string;
    createdAt?: string;
}

export function useAffiliationStatus() {
    return useQuery<AffiliationStatus>({
        queryKey: ['affiliation-status'],
        queryFn: async () => {
            const token = tokenManager.getToken();
            const response = await fetch('/api/seller/affiliation/status', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch affiliation status');
            }

            return response.json();
        },
    });
}
