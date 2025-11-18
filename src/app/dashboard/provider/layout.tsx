'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getProviderNavItems } from '@/components/layout/navigation/ProviderNav';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <ProtectedRoute requiredRole="provider">
      <DashboardLayout navItems={getProviderNavItems(t)}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
