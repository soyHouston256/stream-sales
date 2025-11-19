// Admin Hooks - Epic 2
// Export all admin-related hooks

export { useAdminStats, useSalesData } from './useAdminStats';
export { useUsers, useUpdateUser } from './useUsers';
export {
  useCommissionConfig,
  useUpdateCommissionConfig,
  useCommissionHistory,
} from './useCommissions';
export { useTransactions, exportTransactionsToCSV } from './useTransactions';
export { useToast, toast } from './useToast';

// Provider Hooks - Epic 3
export { useProviderStats, useSalesByCategory } from './useProviderStats';
export {
  useProducts,
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from './useProducts';
export { useProviderSales } from './useProviderSales';
export {
  useProviderBalance,
  useEarningsTransactions,
  useWithdrawals,
  useRequestWithdrawal,
} from './useProviderEarnings';

// Seller Hooks - Epic 4
export { useSellerStats } from './useSellerStats';
export { useMarketplace, useMarketplaceProduct } from './useMarketplace';
export {
  usePurchases,
  usePurchaseDetails,
  useCreatePurchase,
} from './usePurchases';
export {
  useWalletBalance,
  useWalletTransactions,
  useRecharges,
  useCreateRecharge,
} from './useSellerWallet';

// Affiliate Hooks - Epic 5
export { useAffiliateInfo } from './useAffiliateInfo';
export { useAffiliateStats, useReferralsByMonth } from './useAffiliateStats';
export { useReferrals, useReferralDetails } from './useReferrals';
export {
  useAffiliateCommissions,
  useCommissionBalance,
  useRequestPayment,
} from './useAffiliateCommissions';
export {
  useMarketingTemplates,
  useMarketingStats,
} from './useAffiliateMarketing';
