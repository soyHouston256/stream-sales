'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ThemeSelector } from '@/components/ThemeSelector';
import { LogOut, User, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { tokenManager } from '@/lib/utils/tokenManager';

import { MobileNav } from './MobileNav';
import { type NavItem } from './Sidebar';

interface HeaderProps {
  navItems?: NavItem[];
}

export function Header({ navItems = [] }: HeaderProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  // Fetch wallet balance based on user role
  const { data: walletBalance } = useQuery({
    queryKey: ['header-wallet-balance', user?.role],
    queryFn: async () => {
      if (!user?.role) return null;

      const token = tokenManager.getToken();
      if (!token) return null;

      // Determine the correct endpoint based on role
      let endpoint = '';
      if (user.role === 'seller') {
        endpoint = '/api/seller/wallet/balance';
      } else if (user.role === 'affiliate') {
        endpoint = '/api/affiliate/wallet/balance';
      } else if (user.role === 'provider') {
        endpoint = '/api/provider/earnings/balance';
      } else {
        return null; // No wallet for admin, conciliator, payment-validator
      }

      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return null;

      return response.json();
    },
    enabled: !!user && ['seller', 'affiliate', 'provider'].includes(user.role),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getWalletRoute = () => {
    if (!user) return null;

    switch (user.role) {
      case 'seller':
        return '/dashboard/seller/wallet';
      case 'affiliate':
        return '/dashboard/affiliate/wallet';
      case 'provider':
        return '/dashboard/provider/earnings';
      default:
        return null;
    }
  };

  const getDashboardRoute = () => {
    if (!user) return '/';

    switch (user.role) {
      case 'admin':
        return '/dashboard/admin';
      case 'affiliate':
        return '/dashboard/affiliate';
      case 'provider':
        return '/dashboard/provider';
      case 'seller':
        return '/dashboard/seller';
      case 'conciliator':
        return '/dashboard/conciliator';
      case 'payment_validator':
        return '/dashboard/payment-validator';
      default:
        return '/';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            {navItems.length > 0 && <MobileNav items={navItems} />}
            <button
              onClick={() => router.push('/')}
              className="text-xl font-bold hover:opacity-80 transition-opacity cursor-pointer"
            >
              Stream Sales
            </button>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeSelector />

            {user && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={() => router.push(getDashboardRoute())}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline-block">{user.name || user.email}</span>
                  </button>

                  {/* Wallet Balance - Only for seller, affiliate, provider */}
                  {['seller', 'affiliate', 'provider'].includes(user.role) && walletBalance && getWalletRoute() && (
                    <button
                      onClick={() => {
                        const route = getWalletRoute();
                        if (route) router.push(route);
                      }}
                      className="flex items-center gap-1 font-medium text-emerald-600 mr-2 md:mr-0 hover:text-emerald-700 transition-colors cursor-pointer"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      <span className="text-sm">${walletBalance.balance || '0.00'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => router.push(getDashboardRoute())}
                    className="inline-block rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    {user.role}
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{t('auth.logout')}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
