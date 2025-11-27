import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import type { NavItem } from '../Sidebar';

export const getPaymentValidatorNavItems = (t: (key: string) => string): NavItem[] => [
  {
    title: t('paymentValidator.navigation.dashboard'),
    href: '/dashboard/payment-validator',
    icon: LayoutDashboard,
    description: t('paymentValidator.navigation.overviewStats'),
  },
  {
    title: t('paymentValidator.navigation.recharges'),
    href: '/dashboard/payment-validator/recharges',
    icon: Wallet,
    description: t('paymentValidator.navigation.validateRecharges'),
  },
  {
    title: t('paymentValidator.navigation.withdrawals'),
    href: '/dashboard/payment-validator/withdrawals',
    icon: TrendingUp,
    description: t('paymentValidator.navigation.validateWithdrawals'),
  },
];
