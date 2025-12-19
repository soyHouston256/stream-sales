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
  // eslint-disable-next-line security/detect-object-injection
  return Object.hasOwn(ROLE_DASHBOARD_MAP, role) ? ROLE_DASHBOARD_MAP[role] : '/dashboard/seller';
}

/**
 * Checks if a user has access to a specific route
 */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  // eslint-disable-next-line security/detect-object-injection
  const allowedRoute = Object.hasOwn(ROLE_DASHBOARD_MAP, userRole) ? ROLE_DASHBOARD_MAP[userRole] : '/dashboard/seller';
  return route.startsWith(allowedRoute);
}

