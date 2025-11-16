import { z } from 'zod';

export const createProductSchema = z.object({
  category: z.enum(['netflix', 'spotify', 'hbo', 'disney', 'prime', 'youtube', 'other'], {
    required_error: 'Category is required',
    invalid_type_error: 'Invalid category',
  }),
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters'),
  price: z
    .number({
      required_error: 'Price is required',
      invalid_type_error: 'Price must be a number',
    })
    .min(0.01, 'Price must be greater than 0')
    .max(10000, 'Price must not exceed $10,000'),
  accountEmail: z.string().email('Invalid email format'),
  accountPassword: z.string().min(6, 'Password must be at least 6 characters'),
  accountDetails: z.any().optional(),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must not exceed 100 characters')
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  price: z
    .number({
      invalid_type_error: 'Price must be a number',
    })
    .min(0.01, 'Price must be greater than 0')
    .max(10000, 'Price must not exceed $10,000')
    .optional(),
  accountEmail: z.string().email('Invalid email format').optional(),
  accountPassword: z.string().min(6, 'Password must be at least 6 characters').optional(),
  accountDetails: z.any().optional(),
});

export const withdrawalSchema = z.object({
  amount: z
    .number({
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .min(10, 'Minimum withdrawal amount is $10')
    .max(50000, 'Maximum withdrawal amount is $50,000'),
  paymentMethod: z.enum(['paypal', 'bank_transfer', 'crypto'], {
    required_error: 'Payment method is required',
    invalid_type_error: 'Invalid payment method',
  }),
  paymentDetails: z
    .string()
    .min(5, 'Payment details are required (email, account number, or wallet address)')
    .max(200, 'Payment details must not exceed 200 characters'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
