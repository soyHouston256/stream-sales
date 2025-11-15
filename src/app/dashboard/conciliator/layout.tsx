'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { conciliatorNavItems } from '@/components/layout/navigation/ConciliatorNav';

export default function ConciliatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="conciliator">
      <DashboardLayout navItems={conciliatorNavItems}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
