'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getAffiliateNavItems } from '@/components/layout/navigation/AffiliateNav';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AffiliateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <ProtectedRoute requiredRole="affiliate">
      <DashboardLayout navItems={getAffiliateNavItems(t)}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
