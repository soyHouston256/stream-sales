'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getConciliatorNavItems } from '@/components/layout/navigation/ConciliatorNav';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ConciliatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <ProtectedRoute requiredRole="conciliator">
      <DashboardLayout navItems={getConciliatorNavItems(t)}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
