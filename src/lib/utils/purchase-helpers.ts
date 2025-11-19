import { Decimal } from '@prisma/client/runtime/library';

/**
 * Helper function to compute effective status and amount for a purchase
 *
 * Business rules (priority-based):
 * 1. Dispute resolved with refund_seller → effectiveStatus: 'refunded', effectiveAmount: 0
 * 2. Dispute resolved with partial_refund → effectiveStatus: 'partial_refund', effectiveAmount: amount * 0.5
 * 3. Dispute resolved with favor_provider → effectiveStatus: 'completed', effectiveAmount: full amount
 * 4. Dispute open/under_review → effectiveStatus: 'disputed', effectiveAmount: full amount (not yet resolved)
 * 5. Purchase status refunded (no dispute) → effectiveStatus: 'refunded', effectiveAmount: 0
 * 6. Otherwise → effectiveStatus: purchase.status, effectiveAmount: full amount
 *
 * @param purchase - Purchase object with status, amount, and optional dispute
 * @returns Object with effectiveStatus and effectiveAmount
 */
export function computeEffectiveFields(purchase: {
  status: string;
  amount: Decimal | string;
  dispute?: {
    status: string;
    resolutionType?: string | null;
  } | null;
}): {
  effectiveStatus: string;
  effectiveAmount: string;
} {
  const amount =
    typeof purchase.amount === 'string'
      ? parseFloat(purchase.amount)
      : parseFloat(purchase.amount.toString());

  // Priority 1: Resolved dispute with refund_seller
  if (
    purchase.dispute?.status === 'resolved' &&
    purchase.dispute.resolutionType === 'refund_seller'
  ) {
    return {
      effectiveStatus: 'refunded',
      effectiveAmount: '0.00',
    };
  }

  // Priority 2: Resolved dispute with partial_refund
  if (
    purchase.dispute?.status === 'resolved' &&
    purchase.dispute.resolutionType === 'partial_refund'
  ) {
    return {
      effectiveStatus: 'partial_refund',
      effectiveAmount: (amount * 0.5).toFixed(2), // Seller paid full, got 50% back, so effective spent is 50%
    };
  }

  // Priority 3: Resolved dispute with favor_provider (seller keeps product, no refund)
  if (
    purchase.dispute?.status === 'resolved' &&
    purchase.dispute.resolutionType === 'favor_provider'
  ) {
    return {
      effectiveStatus: 'completed',
      effectiveAmount: amount.toFixed(2),
    };
  }

  // Priority 4: Open or under review dispute
  if (
    purchase.dispute &&
    (purchase.dispute.status === 'open' ||
      purchase.dispute.status === 'under_review')
  ) {
    return {
      effectiveStatus: 'disputed',
      effectiveAmount: amount.toFixed(2), // Still counts as spent until resolved
    };
  }

  // Priority 5: Direct refund (no dispute)
  if (purchase.status === 'refunded') {
    return {
      effectiveStatus: 'refunded',
      effectiveAmount: '0.00',
    };
  }

  // Default: Use purchase status as-is
  return {
    effectiveStatus: purchase.status,
    effectiveAmount: amount.toFixed(2),
  };
}
