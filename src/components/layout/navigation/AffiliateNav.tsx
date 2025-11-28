import {
  LayoutDashboard,
  Users,
  DollarSign,
  Megaphone,
  Clock,
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
    title: t('navigation.commissions'),
    href: '/dashboard/affiliate/commissions',
    icon: DollarSign,
    description: t('navigation.earnedCommissions'),
  },
  {
    title: t('navigation.marketing'),
    href: '/dashboard/affiliate/marketing',
    icon: Megaphone,
    description: t('navigation.marketingMaterial'),
  },
];
