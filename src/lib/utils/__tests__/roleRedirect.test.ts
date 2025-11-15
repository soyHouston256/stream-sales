import { getDashboardRoute, canAccessRoute } from '../roleRedirect';
import type { UserRole } from '@/types/auth';

describe('roleRedirect', () => {
  describe('getDashboardRoute', () => {
    it('should return correct route for admin', () => {
      expect(getDashboardRoute('admin')).toBe('/dashboard/admin');
    });

    it('should return correct route for provider', () => {
      expect(getDashboardRoute('provider')).toBe('/dashboard/provider');
    });

    it('should return correct route for seller', () => {
      expect(getDashboardRoute('seller')).toBe('/dashboard/seller');
    });

    it('should return correct route for affiliate', () => {
      expect(getDashboardRoute('affiliate')).toBe('/dashboard/affiliate');
    });

    it('should return correct route for conciliator', () => {
      expect(getDashboardRoute('conciliator')).toBe('/dashboard/conciliator');
    });
  });

  describe('canAccessRoute', () => {
    it('should allow admin to access admin routes', () => {
      expect(canAccessRoute('admin', '/dashboard/admin')).toBe(true);
      expect(canAccessRoute('admin', '/dashboard/admin/users')).toBe(true);
    });

    it('should not allow admin to access seller routes', () => {
      expect(canAccessRoute('admin', '/dashboard/seller')).toBe(false);
    });

    it('should allow seller to access seller routes', () => {
      expect(canAccessRoute('seller', '/dashboard/seller')).toBe(true);
      expect(canAccessRoute('seller', '/dashboard/seller/purchases')).toBe(true);
    });

    it('should not allow seller to access admin routes', () => {
      expect(canAccessRoute('seller', '/dashboard/admin')).toBe(false);
    });

    it('should allow provider to access provider routes', () => {
      expect(canAccessRoute('provider', '/dashboard/provider')).toBe(true);
      expect(canAccessRoute('provider', '/dashboard/provider/products')).toBe(true);
    });
  });
});
