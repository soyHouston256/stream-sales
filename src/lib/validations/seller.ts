import { z } from 'zod';

export const rechargeSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required' })
    .min(10, 'Minimum recharge is $10')
    .max(10000, 'Maximum recharge is $10,000'),
  paymentMethod: z.enum(['credit_card', 'paypal', 'bank_transfer', 'crypto', 'mock'], {
    required_error: 'Payment method is required',
  }),
  paymentDetails: z.string().optional(),
});

export type RechargeInput = z.infer<typeof rechargeSchema>;

export const purchaseSchema = z.object({
  productId: z.string().cuid('Invalid product ID'),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const marketplaceFiltersSchema = z.object({
  categories: z
    .array(
      z.enum(['netflix', 'spotify', 'hbo', 'disney', 'prime', 'youtube', 'other'])
    )
    .optional(),
  maxPrice: z.number().min(0).optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(12),
});

export type MarketplaceFiltersInput = z.infer<typeof marketplaceFiltersSchema>;
