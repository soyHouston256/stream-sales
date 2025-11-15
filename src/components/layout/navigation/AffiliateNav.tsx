import {
  LayoutDashboard,
  Users,
  Link as LinkIcon,
  TrendingUp,
  DollarSign,
  FileText,
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
    title: 'Mis Enlaces',
    href: '/dashboard/affiliate/links',
    icon: LinkIcon,
    description: 'Enlaces de referido',
  },
  {
    title: 'Referidos',
    href: '/dashboard/affiliate/referrals',
    icon: Users,
    description: 'Usuarios referidos',
  },
  {
    title: 'Comisiones',
    href: '/dashboard/affiliate/commissions',
    icon: DollarSign,
    description: 'Earnings por referido',
  },
  {
    title: 'Performance',
    href: '/dashboard/affiliate/performance',
    icon: TrendingUp,
    description: 'Métricas de rendimiento',
  },
  {
    title: 'Reportes',
    href: '/dashboard/affiliate/reports',
    icon: FileText,
    description: 'Reportes mensuales',
  },
];
