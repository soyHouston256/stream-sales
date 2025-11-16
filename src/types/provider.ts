export type ProductCategory =
  | 'netflix'
  | 'spotify'
  | 'hbo'
  | 'disney'
  | 'prime'
  | 'youtube'
  | 'other';

export type ProductStatus = 'available' | 'reserved' | 'sold';

export type TransactionType = 'earning' | 'withdrawal' | 'refund';

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export type PaymentMethod = 'paypal' | 'bank_transfer' | 'crypto';

export interface Product {
  id: string;
  providerId: string;
  category: ProductCategory;
  name: string;
  description: string;
  price: string; // Decimal as string
  accountEmail: string;
  accountPassword: string; // Encrypted in backend
  accountDetails?: any; // JSON
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  soldAt?: string;
  purchaseId?: string; // If sold
}

export interface CreateProductDTO {
  category: ProductCategory;
  name: string;
  description: string;
  price: number;
  accountEmail: string;
  accountPassword: string;
  accountDetails?: any;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  price?: number;
  accountEmail?: string;
  accountPassword?: string;
  accountDetails?: any;
}

export interface ProviderSale {
  id: string; // Purchase ID
  productId: string;
  productName: string;
  productCategory: ProductCategory;
  buyerId: string;
  buyerEmail: string;
  buyerName?: string;
  amount: string; // Purchase price
  providerEarnings: string; // Net earnings after commission
  adminCommission: string; // Commission amount
  commissionRate: string; // Commission percentage (e.g., "0.10" for 10%)
  status: 'completed' | 'refunded';
  completedAt?: string;
  refundedAt?: string;
  createdAt: string;
}

export interface ProviderStats {
  totalProducts: number;
  availableProducts: number;
  reservedProducts: number;
  soldProducts: number;
  totalEarnings: string; // Lifetime earnings
  thisMonthEarnings: string;
  pendingBalance: string; // Current wallet balance
  totalSales: number; // Number of sales
  thisMonthSales: number;
}

export interface SalesByCategory {
  category: ProductCategory;
  count: number; // Number of sales
  totalAmount: string; // Total revenue for this category
  totalEarnings: string; // Total earnings (after commission)
}

export interface WalletBalance {
  balance: string; // Current available balance
  totalEarnings: string; // Lifetime earnings
  totalWithdrawals: string; // Total withdrawn
  pendingWithdrawals: string; // Total in pending withdrawals
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: string;
  balance: string; // Balance after transaction
  description?: string;
  purchaseId?: string; // If type is earning
  withdrawalId?: string; // If type is withdrawal
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  walletId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDetails: string; // Email, account number, wallet address
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt?: string;
  rejectionReason?: string;
  processedBy?: string; // Admin user ID
}

export interface CreateWithdrawalDTO {
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDetails: string;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  category?: ProductCategory;
  status?: ProductStatus;
  search?: string;
}

export interface SalesFilters {
  page?: number;
  limit?: number;
  status?: 'completed' | 'refunded';
  startDate?: string;
  endDate?: string;
}

export interface TransactionsFilters {
  page?: number;
  limit?: number;
  type?: TransactionType;
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
}
