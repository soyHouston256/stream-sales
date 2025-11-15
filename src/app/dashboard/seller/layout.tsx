'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { sellerNavItems } from '@/components/layout/navigation/SellerNav';

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="seller">
      <DashboardLayout navItems={sellerNavItems}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
