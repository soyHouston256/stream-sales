'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { affiliateNavItems } from '@/components/layout/navigation/AffiliateNav';

export default function AffiliateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="affiliate">
      <DashboardLayout navItems={affiliateNavItems}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
