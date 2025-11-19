import { z } from 'zod';

export const resolveDisputeSchema = z.object({
  resolutionType: z.enum(['refund_seller', 'favor_provider', 'partial_refund', 'no_action'], {
    required_error: 'Please select a resolution type',
  }),
  partialRefundPercentage: z.number().min(0).max(100).optional(),
  resolution: z.string().min(20, 'Please provide a detailed explanation (min 20 characters)'),
}).refine((data) => {
  // Si es partial refund, debe tener porcentaje
  if (data.resolutionType === 'partial_refund' && (data.partialRefundPercentage === undefined || data.partialRefundPercentage === null)) {
    return false;
  }
  return true;
}, {
  message: 'Partial refund percentage is required for partial refund type',
  path: ['partialRefundPercentage'],
});

export const addMessageSchema = z.object({
  message: z.string().min(5, 'Message must be at least 5 characters'),
  isInternal: z.boolean(),
  attachments: z.array(z.string().url()).optional(),
});

export type ResolveDisputeFormData = z.infer<typeof resolveDisputeSchema>;
export type AddMessageFormData = z.infer<typeof addMessageSchema>;
