'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getPaymentValidatorNavItems } from '@/components/layout/navigation/PaymentValidatorNav';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PaymentValidatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLanguage();

  return (
    <ProtectedRoute requiredRole="payment_validator">
      <DashboardLayout navItems={getPaymentValidatorNavItems(t)}>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
