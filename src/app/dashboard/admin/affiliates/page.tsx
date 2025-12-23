'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Redirect page from old affiliate applications to new distributor management
 * This page exists only to redirect users who may have bookmarked the old URL
 */
export default function AffiliatesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/admin/distributors');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Redirecting to Distributor Management...</p>
      </div>
    </div>
  );
}
