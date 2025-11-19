'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getSellerNavItems } from '@/components/layout/navigation/SellerNav';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <ProtectedRoute requiredRole="seller">
      <DashboardLayout navItems={getSellerNavItems(t)}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
