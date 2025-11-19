/**
 * Affiliate Utility Functions
 * Helper functions for affiliate-related operations
 */

/**
 * Copy referral code to clipboard
 * @param code - The referral code to copy
 * @returns Promise that resolves with success status
 */
export async function copyReferralCode(code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch (error) {
    console.error('Failed to copy referral code:', error);
    return false;
  }
}

/**
 * Copy referral link to clipboard
 * @param link - The referral link to copy
 * @returns Promise that resolves with success status
 */
export async function copyReferralLink(link: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch (error) {
    console.error('Failed to copy referral link:', error);
    return false;
  }
}

/**
 * Share referral link using native share API
 * @param code - The referral code
 * @param link - The referral link
 * @returns Promise that resolves with success status
 */
export async function shareReferralLink(
  code: string,
  link: string
): Promise<boolean> {
  if (!navigator.share) {
    console.warn('Share API not supported');
    return false;
  }

  try {
    await navigator.share({
      title: 'Join Stream Sales',
      text: `Use my referral code: ${code} to join Stream Sales and start earning!`,
      url: link,
    });
    return true;
  } catch (error) {
    // User cancelled share or error occurred
    if (error instanceof Error && error.name === 'AbortError') {
      // User cancelled, not really an error
      return false;
    }
    console.error('Failed to share referral link:', error);
    return false;
  }
}

/**
 * Check if native share API is available
 * @returns True if share API is supported
 */
export function isShareSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

/**
 * Replace template variables with actual values
 * @param template - Template string with variables {code}, {link}, {name}
 * @param variables - Object with variable values
 * @returns String with variables replaced
 */
export function replaceTemplateVariables(
  template: string,
  variables: { code: string; link: string; name: string }
): string {
  return template
    .replace(/{code}/g, variables.code)
    .replace(/{link}/g, variables.link)
    .replace(/{name}/g, variables.name);
}

/**
 * Generate referral link from code
 * @param code - The referral code
 * @returns Full referral link URL
 */
export function generateReferralLink(code: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/register?ref=${code}`;
}

/**
 * Format commission amount for display
 * @param amount - Amount as string or number
 * @returns Formatted currency string
 */
export function formatCommissionAmount(amount: string | number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numAmount);
}

/**
 * Calculate conversion rate
 * @param registrations - Number of registrations
 * @param views - Number of link views
 * @returns Conversion rate as percentage
 */
export function calculateConversionRate(
  registrations: number,
  views: number
): number {
  if (views === 0) return 0;
  return Math.round((registrations / views) * 100 * 100) / 100; // 2 decimal places
}

/**
 * Determine commission balance color based on amount
 * @param balance - Balance as string or number
 * @returns Tailwind color class
 */
export function getBalanceColorClass(balance: string | number): string {
  const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance;

  if (numBalance === 0) return 'text-gray-500 dark:text-gray-400';
  if (numBalance < 50) return 'text-yellow-600 dark:text-yellow-500';
  return 'text-green-600 dark:text-green-500';
}

/**
 * Format month string for display
 * @param month - Month in YYYY-MM format
 * @returns Formatted month string (e.g., "Jan 2024")
 */
export function formatMonthDisplay(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Get commission type display text
 * @param type - Commission type
 * @returns Display text
 */
export function getCommissionTypeLabel(
  type: 'registration' | 'sale' | 'bonus'
): string {
  const labels = {
    registration: 'Registration',
    sale: 'Sale',
    bonus: 'Bonus',
  };
  return labels[type];
}

/**
 * Get referral status display text
 * @param status - Referral status
 * @returns Display text
 */
export function getReferralStatusLabel(
  status: 'active' | 'inactive' | 'suspended'
): string {
  const labels = {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
  };
  return labels[status];
}

/**
 * Validate payment details based on payment method
 * @param method - Payment method
 * @param details - Payment details string
 * @returns Error message or null if valid
 */
export function validatePaymentDetails(
  method: 'paypal' | 'bank_transfer' | 'crypto',
  details: string
): string | null {
  switch (method) {
    case 'paypal':
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(details)) {
        return 'Please enter a valid PayPal email address';
      }
      break;
    case 'bank_transfer':
      // Should contain account number or IBAN
      if (details.length < 10) {
        return 'Please provide complete bank account details';
      }
      break;
    case 'crypto':
      // Basic crypto wallet validation (should start with specific characters)
      if (details.length < 20) {
        return 'Please enter a valid crypto wallet address';
      }
      break;
  }
  return null;
}
