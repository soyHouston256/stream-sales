'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/lib/auth/useAuth';
import { redirect } from 'next/navigation';
import { getDashboardRoute } from '@/lib/utils/roleRedirect';

export default function LoginPage() {
  const { user, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if already authenticated (using Next.js redirect)
  if (user) {
    const dashboardRoute = getDashboardRoute(user.role);
    redirect(dashboardRoute);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <LoginForm />
    </div>
  );
}
