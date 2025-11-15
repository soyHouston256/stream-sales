'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { canAccessRoute } from '@/lib/utils/roleRedirect';
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
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    // Wait for authentication check to complete
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check role-based access if specified
    if (user) {
      // Check if specific role is required
      if (requiredRole && user.role !== requiredRole) {
        router.push('/login');
        return;
      }

      // Check if user's role is in allowed roles list
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/login');
        return;
      }
    }
  }, [user, isLoading, isAuthenticated, requiredRole, allowedRoles, router]);

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

  // Don't render content if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  // Don't render if role check fails
  if (requiredRole && user.role !== requiredRole) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
}
