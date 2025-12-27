export type ProductCategory =
  | 'streaming'
  | 'license'
  | 'course'
  | 'ebook'
  | 'ai'
  | 'netflix'
  | 'spotify'
  | 'hbo'
  | 'disney'
  | 'prime'
  | 'youtube'
  | 'other';

/**
 * Account details types for different product categories
 */
export interface StreamingAccountDetails {
  email?: string;
  password?: string;
  profiles?: { name: string; pin?: string }[];
  platformType?: string;
}

export interface LicenseAccountDetails {
  licenseKey?: string;
  activationType?: 'serial' | 'email_invite';
}

export interface DigitalContentDetails {
  resourceUrl?: string;
  liveDate?: string;
  contentType?: 'live_meet' | 'recorded_iframe' | 'ebook_drive';
}

export type AccountDetails =
  | StreamingAccountDetails
  | LicenseAccountDetails
  | DigitalContentDetails
  | Record<string, unknown>;

export type ProductStatus = 'available' | 'reserved' | 'sold';

export type TransactionType = 'earning' | 'withdrawal' | 'refund';

export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export type PaymentMethod = 'paypal' | 'bank_transfer' | 'crypto';

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  price: string; // Decimal
  durationDays?: number;
  isRenewable: boolean;
}

export interface Product {
  id: string;
  providerId: string;
  category: ProductCategory;
  name: string;
  description: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  variants?: ProductVariant[];
  // Flattened fields from API
  price?: string;
  durationDays?: number;
  accountEmail?: string;
  accountPassword?: string;
  accountDetails?: AccountDetails;
}

export interface CreateProductDTO {
  name: string;
  description?: string;
  price: string | number;
  durationDays?: number;
  imageUrl?: string;
  category: ProductCategory;

  // Inventory Data (Optional based on category)
  platformType?: string;
  accountType?: 'profile' | 'full';
  email?: string;
  password?: string;
  profiles?: { name: string; pin?: string }[];

  licenseType?: 'serial' | 'email_invite';
  licenseKeys?: string;

  contentType?: 'live_meet' | 'recorded_iframe' | 'ebook_drive';
  resourceUrl?: string;
  liveDate?: string;
  coverImageUrl?: string;
}

export interface UpdateProductDTO {
  name?: string;
  description?: string;
  price?: number;
  durationDays?: number;
  imageUrl?: string;
  deliveryDetails?: string[];
  accountEmail?: string;
  accountPassword?: string;
  accountDetails?: AccountDetails;
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
  dispute?: {
    id: string;
    status: string;
  };
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
