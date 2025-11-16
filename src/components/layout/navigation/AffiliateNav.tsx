import {
  LayoutDashboard,
  Users,
  DollarSign,
  Megaphone,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const affiliateNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/affiliate',
    icon: LayoutDashboard,
    description: 'Vista general',
  },
  {
    title: 'Referrals',
    href: '/dashboard/affiliate/referrals',
    icon: Users,
    description: 'Usuarios referidos',
  },
  {
    title: 'Commissions',
    href: '/dashboard/affiliate/commissions',
    icon: DollarSign,
    description: 'Comisiones ganadas',
  },
  {
    title: 'Marketing',
    href: '/dashboard/affiliate/marketing',
    icon: Megaphone,
    description: 'Material de marketing',
  },
];
