'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { adminNavItems } from '@/components/layout/navigation/AdminNav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute requiredRole="admin">
      <DashboardLayout navItems={adminNavItems}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
