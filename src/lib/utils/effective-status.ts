import { EffectivePurchaseStatus } from '@/types/seller';

/**
 * Badge variant mapping for effective purchase status
 */
export function getEffectiveStatusBadgeVariant(
  status: EffectivePurchaseStatus
): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' {
  switch (status) {
    case 'completed':
      return 'default'; // Green/success
    case 'pending':
      return 'secondary'; // Gray
    case 'disputed':
      return 'warning'; // Yellow/orange
    case 'refunded':
      return 'destructive'; // Red
    case 'partial_refund':
      return 'outline'; // Outline style for partial
    case 'failed':
      return 'destructive'; // Red
    default:
      return 'secondary';
  }
}

/**
 * Display label for effective purchase status
 *
 * NOTE: These are fallback labels. Use t('purchases.status.{key}') for i18n translations.
 */
export function getEffectiveStatusLabel(
  status: EffectivePurchaseStatus,
  t?: (key: string) => string
): string {
  // If translation function provided, use it
  if (t) {
    const translationKey = `purchases.status.${status}`;
    const translation = t(translationKey);
    // Only use translation if it's not the key itself (means translation exists)
    if (translation !== translationKey) {
      return translation;
    }
  }

  // Fallback to English
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'pending':
      return 'Pending';
    case 'disputed':
      return 'Under Dispute';
    case 'refunded':
      return 'Refunded';
    case 'partial_refund':
      return 'Partially Refunded';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

/**
 * Description for effective purchase status (for tooltips or detailed views)
 *
 * NOTE: These are fallback descriptions. Use t('purchases.{status}Notice') for i18n translations.
 */
export function getEffectiveStatusDescription(
  status: EffectivePurchaseStatus,
  t?: (key: string) => string
): string {
  // If translation function provided, use it for refunded/partial_refund
  if (t) {
    if (status === 'refunded') {
      const translation = t('purchases.refundedNotice');
      if (translation !== 'purchases.refundedNotice') {
        return translation;
      }
    }
    if (status === 'partial_refund') {
      const translation = t('purchases.partialRefundNotice', { percentage: '50' });
      if (translation !== 'purchases.partialRefundNotice') {
        return translation;
      }
    }
  }

  // Fallback to English
  switch (status) {
    case 'completed':
      return 'Purchase completed successfully. Product credentials are available.';
    case 'pending':
      return 'Purchase is being processed.';
    case 'disputed':
      return 'This purchase is under dispute review. Awaiting conciliator resolution.';
    case 'refunded':
      return 'This purchase was refunded. Amount returned to your wallet.';
    case 'partial_refund':
      return 'This purchase was partially refunded (50%). Half the amount returned to your wallet.';
    case 'failed':
      return 'Purchase failed. No charges applied.';
    default:
      return '';
  }
}

/**
 * Check if purchase credentials should be visible based on effective status
 */
export function shouldShowCredentials(
  status: EffectivePurchaseStatus
): boolean {
  return status === 'completed' || status === 'disputed';
}
