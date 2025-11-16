/**
 * Affiliate Validation Schemas
 * Zod schemas for affiliate-related form validation
 */

import { z } from 'zod';

export const paymentRequestSchema = z.object({
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .min(50, 'Minimum payment request is $50')
    .max(100000, 'Maximum payment request is $100,000'),
  paymentMethod: z.enum(['paypal', 'bank_transfer', 'crypto'], {
    required_error: 'Payment method is required',
  }),
  paymentDetails: z
    .string({
      required_error: 'Payment details are required',
    })
    .min(5, 'Payment details must be at least 5 characters')
    .max(500, 'Payment details must be less than 500 characters'),
});

export const referralFiltersSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  role: z.enum(['admin', 'provider', 'seller', 'affiliate', 'conciliator']).optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

export const commissionFiltersSchema = z.object({
  type: z.enum(['registration', 'sale', 'bonus']).optional(),
  referralId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
});

// Type inference from schemas
export type PaymentRequestInput = z.infer<typeof paymentRequestSchema>;
export type ReferralFiltersInput = z.infer<typeof referralFiltersSchema>;
export type CommissionFiltersInput = z.infer<typeof commissionFiltersSchema>;
