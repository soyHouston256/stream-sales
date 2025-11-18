'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getAdminNavItems } from '@/components/layout/navigation/AdminNav';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <ProtectedRoute requiredRole="admin">
      <DashboardLayout navItems={getAdminNavItems(t)}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
