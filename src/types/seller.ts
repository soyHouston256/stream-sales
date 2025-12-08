import { ProductCategory } from './provider';

export type PurchaseStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type EffectivePurchaseStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partial_refund'
  | 'disputed';

export type RechargeStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export type PaymentMethod =
  | 'credit_card'
  | 'paypal'
  | 'bank_transfer'
  | 'crypto'
  | 'mock';

export type WalletTransactionType = 'credit' | 'debit' | 'transfer';

export interface MarketplaceProduct {
  id: string;
  providerId: string;
  providerName: string;
  category: ProductCategory;
  name: string;
  description: string;
  price: string; // Decimal as string
  durationDays?: number;
  imageUrl?: string;
  status: 'available'; // Solo available en marketplace
  createdAt: string;
}

export interface Purchase {
  id: string;
  sellerId: string;
  productId: string;
  providerId: string;
  amount: string;
  status: PurchaseStatus;
  createdAt: string;
  completedAt?: string;
  refundedAt?: string;
  // Computed fields for UI
  effectiveStatus: EffectivePurchaseStatus;
  effectiveAmount: string; // Amount after considering refunds (full, partial, or none)
  // Dispute info (if exists)
  dispute?: {
    id: string;
    status: string;
    resolutionType?: string | null;
  };
  // Producto info
  product: {
    id: string;
    category: ProductCategory;
    name: string;
    description: string;
    accountEmail: string;
    accountPassword: string; // Solo visible en detalles de compra
    accountDetails?: any;
  };
  // Provider info
  provider: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WalletBalance {
  balance: string;
  currency: string;
  status: 'active' | 'frozen' | 'closed';
}

export interface WalletTransaction {
  id: string;
  type: WalletTransactionType;
  amount: string;
  description: string;
  relatedEntityType?: string; // 'Purchase', 'Recharge', etc.
  relatedEntityId?: string;
  createdAt: string;
  // Balance after this transaction (helpful for display)
  balanceAfter?: string;
}

export interface Recharge {
  id: string;
  walletId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentGateway: string;
  externalTransactionId?: string;
  status: RechargeStatus;
  createdAt: string;
  completedAt?: string;
}

export interface RechargeRequest {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: string; // Email, account number, wallet address
}

export interface PurchaseRequest {
  productId: string;
}

export interface SellerStats {
  walletBalance: string;
  totalPurchases: number;
  totalSpent: string;
  thisMonthPurchases: number;
  thisMonthSpent: string;
  pendingRecharges: number;
  pendingRechargesAmount: string;
}

export interface MarketplaceFilters {
  categories?: ProductCategory[];
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PurchasesFilters {
  page?: number;
  limit?: number;
  category?: ProductCategory;
  status?: PurchaseStatus;
  startDate?: string;
  endDate?: string;
}

export interface TransactionsFilters {
  page?: number;
  limit?: number;
  type?: WalletTransactionType;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: {
    totalEffectiveSpent: string;
  };
}
