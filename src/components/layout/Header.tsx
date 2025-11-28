'use client';

import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/LanguageSelector';
import { LogOut, User, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { tokenManager } from '@/lib/utils/tokenManager';

export function Header() {
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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">Stream Sales</h1>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSelector />

            {user && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{user.name || user.email}</span>

                  {/* Wallet Balance - Only for seller, affiliate, provider */}
                  {['seller', 'affiliate', 'provider'].includes(user.role) && walletBalance && (
                    <span className="hidden md:flex items-center gap-1 font-medium text-emerald-600">
                      <Wallet className="h-3.5 w-3.5" />
                      ${walletBalance.balance || '0.00'}
                    </span>
                  )}

                  <span className="inline-block rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    {user.role}
                  </span>
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
