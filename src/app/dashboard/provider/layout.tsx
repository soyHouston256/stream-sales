'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { providerNavItems } from '@/components/layout/navigation/ProviderNav';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="provider">
      <DashboardLayout navItems={providerNavItems}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
