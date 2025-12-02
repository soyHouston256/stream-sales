import {
  LayoutDashboard,
  Users,
  Megaphone,
  Clock,
  Wallet,
  Settings,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const getAffiliateNavItems = (t: (key: string) => string): NavItem[] => [
  {
    title: t('navigation.dashboard'),
    href: '/dashboard/affiliate',
    icon: LayoutDashboard,
    description: t('navigation.overviewStats'),
  },
  {
    title: 'Referidos Pendientes',
    href: '/dashboard/affiliate/referrals-pending',
    icon: Clock,
    description: 'Aprobar o rechazar referidos',
  },
  {
    title: t('navigation.referrals'),
    href: '/dashboard/affiliate/referrals',
    icon: Users,
    description: t('navigation.referredUsers'),
  },
  {
    title: 'Mi Saldo',
    href: '/dashboard/affiliate/wallet',
    icon: Wallet,
    description: 'Gestiona tu saldo y recargas',
  },
  {
    title: t('navigation.marketing'),
    href: '/dashboard/affiliate/marketing',
    icon: Megaphone,
    description: t('navigation.marketingMaterial'),
  },
  {
    title: t('navigation.settings'),
    href: '/dashboard/affiliate/settings',
    icon: Settings,
    description: t('navigation.settingsDesc'),
  },
];
