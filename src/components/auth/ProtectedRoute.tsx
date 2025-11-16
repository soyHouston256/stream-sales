'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

/**
 * Higher-order component to protect routes that require authentication
 * Redirects to login if not authenticated
 * Optionally checks for specific role requirements
 */
export function ProtectedRoute({
  children,
  requiredRole,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    redirect('/login');
  }

  // Check if specific role is required
  if (requiredRole && user.role !== requiredRole) {
    redirect('/login');
  }

  // Check if user's role is in allowed roles list
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect('/login');
  }

  // Render protected content
  return <>{children}</>;
}
