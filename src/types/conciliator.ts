export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed';
export type DisputeOpenedBy = 'seller' | 'provider';
export type ResolutionType = 'refund_seller' | 'favor_provider' | 'partial_refund' | 'no_action';
export type ProductCategory = 'netflix' | 'spotify' | 'hbo' | 'disney' | 'prime' | 'youtube' | 'other';
export type UserRole = 'admin' | 'provider' | 'seller' | 'affiliate' | 'conciliator';

export interface Dispute {
  id: string;
  purchaseId: string;
  sellerId: string;
  providerId: string;
  conciliatorId?: string;
  openedBy: DisputeOpenedBy;
  reason: string;
  status: DisputeStatus;
  resolution?: string;
  resolutionType?: ResolutionType;
  partialRefundPercentage?: number; // 0-100
  createdAt: string;
  assignedAt?: string;
  resolvedAt?: string;
  // Información relacionada
  purchase: {
    id: string;
    amount: string;
    product: {
      id: string;
      category: ProductCategory;
      name: string;
      description: string;
      accountEmail?: string; // Solo si soy conciliator
      accountPassword?: string;
      accountDetails?: any;
    };
  };
  seller: {
    id: string;
    name: string;
    email: string;
  };
  provider: {
    id: string;
    name: string;
    email: string;
  };
  conciliator?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  sender: {
    id: string;
    name: string;
    role: UserRole;
  };
  message: string;
  attachments?: string[]; // URLs
  isInternal: boolean; // Solo visible para conciliators
  createdAt: string;
}

export interface ConciliatorStats {
  pendingDisputes: number; // open
  myAssigned: number; // under_review asignadas a mí
  resolvedToday: number;
  totalResolved: number; // lifetime
  overdueDisputes: number; // pasadas de SLA
}

export interface ResolutionsByDay {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ConciliatorPerformance {
  totalResolved: number;
  averageResolutionTimeHours: number;
  refundRate: number; // % de refunds del total
  thisWeekResolved: number;
  resolutionsByType: {
    refund_seller: number;
    favor_provider: number;
    partial_refund: number;
    no_action: number;
  };
}

export interface ResolveDisputeRequest {
  resolutionType: ResolutionType;
  partialRefundPercentage?: number;
  resolution: string;
}

export interface AddMessageRequest {
  message: string;
  isInternal: boolean;
  attachments?: string[];
}

export interface DisputeFilters {
  status?: DisputeStatus;
  dateFrom?: string;
  dateTo?: string;
  sellerId?: string;
  providerId?: string;
  conciliatorId?: string;
  page?: number;
  limit?: number;
}

export interface DisputesResponse {
  disputes: Dispute[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MessagesResponse {
  messages: DisputeMessage[];
}

export interface HistoryResponse {
  disputes: Dispute[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type SLAStatus = 'on_time' | 'warning' | 'overdue';

export interface DisputeWithSLA extends Dispute {
  slaStatus: SLAStatus;
  timeSinceCreated?: string;
  timeSinceAssigned?: string;
  resolutionTimeHours?: number;
}
