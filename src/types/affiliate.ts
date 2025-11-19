/**
 * Affiliate Domain Types
 * Defines TypeScript interfaces for the affiliate system
 */

import { UserRole } from './auth';

export interface AffiliateInfo {
  id: string;
  userId: string;
  referralCode: string;
  referralLink: string; // Full URL
  status: 'pending' | 'approved' | 'active' | 'suspended' | 'rejected';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalEarnings: string;
  pendingBalance: string;
  paidBalance: string;
  totalReferrals: number;
  activeReferrals: number;
  applicationNote?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateApplication {
  applicationNote: string;
}

export type AffiliateProfileStatus = 'pending' | 'approved' | 'active' | 'suspended' | 'rejected';
export type AffiliateTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Referral {
  id: string; // Affiliation ID
  affiliateId: string;
  referredUserId: string;
  referredUser: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  status: 'active' | 'inactive' | 'suspended';
  commissionPaid: boolean;
  commissionAmount?: string; // Snapshot del monto de comisión de registro
  totalCommissionEarned: string; // Total de todas las comisiones de este referido
  createdAt: string; // Fecha de registro del referido
}

export interface Commission {
  id: string;
  affiliateId: string;
  referralId: string; // Affiliation ID
  referralUser: {
    name: string;
    email: string;
  };
  type: 'registration' | 'sale' | 'bonus';
  amount: string;
  status: 'pending' | 'paid' | 'rejected';
  metadata?: any; // Info adicional (purchase ID si es sale, etc.)
  createdAt: string;
  paidAt?: string;
}

export interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  inactiveReferrals: number;
  thisMonthReferrals: number;
  totalCommissionEarned: string;
  availableBalance: string; // Comisiones no pagadas
  thisMonthEarned: string;
  pendingPayments: number;
  pendingPaymentsAmount: string;
}

export interface ReferralsByMonth {
  month: string; // YYYY-MM
  count: number;
}

export interface PaymentRequest {
  amount: number;
  paymentMethod: 'paypal' | 'bank_transfer' | 'crypto';
  paymentDetails: string;
}

export interface MarketingTemplate {
  id: string;
  title: string;
  content: string; // Con variables {code}, {link}, {name}
  category: 'email' | 'social' | 'message';
}

export interface MarketingStats {
  linkViews: number;
  registrations: number;
  conversionRate: number; // registrations / linkViews * 100
}

export interface ReferralFilters {
  status?: 'active' | 'inactive' | 'suspended';
  role?: UserRole;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CommissionFilters {
  type?: 'registration' | 'sale' | 'bonus';
  referralId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedReferrals {
  data: Referral[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedCommissions {
  data: Commission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CommissionBalance {
  availableBalance: string;
  totalEarned: string;
  thisMonthEarned: string;
  pendingPayments: number;
  pendingPaymentsAmount: string;
}

export interface ReferralDetails extends Referral {
  activitySummary: {
    totalPurchases?: number;
    totalProducts?: number;
    totalSales?: number;
  };
  commissionTimeline: Commission[];
}

export type PaymentMethod = 'paypal' | 'bank_transfer' | 'crypto';
export type CommissionType = 'registration' | 'sale' | 'bonus';
export type AffiliateStatus = 'pending' | 'approved' | 'active' | 'suspended' | 'rejected';
export type CommissionStatus = 'pending' | 'paid' | 'rejected';
