'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { useAuth } from '@/lib/auth/useAuth';
import { getDashboardRoute } from '@/lib/utils/roleRedirect';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Handle redirect in useEffect to avoid render loop
  useEffect(() => {
    if (!isLoading && user && !shouldRedirect) {
      setShouldRedirect(true);
      const dashboardRoute = getDashboardRoute(user.role);
      router.replace(dashboardRoute);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, shouldRedirect]);

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

  // Don't render login form if redirecting
  if (shouldRedirect || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <LoginForm />
    </div>
  );
}
