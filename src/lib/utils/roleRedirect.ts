import type { UserRole } from '@/types/auth';

/**
 * Maps user roles to their respective dashboard routes
 */
const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  admin: '/dashboard/admin',
  provider: '/dashboard/provider',
  seller: '/dashboard/seller',
  affiliate: '/dashboard/affiliate',
  conciliator: '/dashboard/conciliator',
  payment_validator: '/dashboard/payment-validator',
};

/**
 * Returns the dashboard URL for a given user role
 */
export function getDashboardRoute(role: UserRole): string {
  return ROLE_DASHBOARD_MAP[role] || '/dashboard/seller';
}

/**
 * Checks if a user has access to a specific route
 */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  const allowedRoute = ROLE_DASHBOARD_MAP[userRole];
  return route.startsWith(allowedRoute);
}
