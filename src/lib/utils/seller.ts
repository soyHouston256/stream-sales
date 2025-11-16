import { toast } from '@/lib/hooks/useToast';

/**
 * Copy text to clipboard with user feedback
 */
export async function copyToClipboard(text: string, label: string = 'Text'): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
    return true;
  } catch (error) {
    toast({
      title: 'Copy failed',
      description: 'Could not copy to clipboard',
      variant: 'destructive',
    });
    return false;
  }
}

/**
 * Validate if a purchase can be made with current balance
 */
export function validatePurchase(balance: string, price: string): {
  canPurchase: boolean;
  balanceAfter: string;
  warning?: string;
} {
  const balanceNum = parseFloat(balance);
  const priceNum = parseFloat(price);
  const after = balanceNum - priceNum;

  return {
    canPurchase: balanceNum >= priceNum,
    balanceAfter: after.toFixed(2),
    warning: after > 0 && after < 10 ? 'Your balance will be low after this purchase' : undefined,
  };
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: string | number, currency: string = 'USD'): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(numAmount);
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Parse account details JSON safely
 */
export function parseAccountDetails(accountDetails: any): Record<string, any> | null {
  if (!accountDetails) return null;

  try {
    if (typeof accountDetails === 'string') {
      return JSON.parse(accountDetails);
    }
    return accountDetails;
  } catch (error) {
    return null;
  }
}
