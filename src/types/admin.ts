export interface User {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'seller' | 'affiliate' | 'provider' | 'conciliator';
  createdAt: string;
  updatedAt: string;
  status?: 'active' | 'suspended';
}

export interface AdminStats {
  totalUsers: number;
  totalSales: number;
  totalCommissions: number;
  activeDisputes: number;
  salesGrowth?: number;
  usersGrowth?: number;
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit' | 'transfer';
  amount: number;
  sourceWalletId: string;
  destinationWalletId?: string;
  description?: string;
  createdAt: string;
  sourceUser?: {
    email: string;
    name: string | null;
  };
  destinationUser?: {
    email: string;
    name: string | null;
  };
}

export interface CommissionConfig {
  saleCommission: number;
  registrationCommission: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CommissionHistory {
  id: string;
  saleCommission: number;
  registrationCommission: number;
  updatedBy: string;
  createdAt: string;
}

export interface SalesData {
  date: string;
  sales: number;
  revenue: number;
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
