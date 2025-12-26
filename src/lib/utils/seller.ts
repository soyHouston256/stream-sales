import { toast } from '@/lib/hooks/useToast';

export const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  netflix: { bg: 'bg-red-900', text: 'text-red-100', label: 'N' },
  spotify: { bg: 'bg-green-900', text: 'text-green-100', label: 'S' },
  hbo: { bg: 'bg-purple-900', text: 'text-purple-100', label: 'H' },
  disney: { bg: 'bg-blue-900', text: 'text-blue-100', label: 'D' },
  prime: { bg: 'bg-blue-800', text: 'text-blue-100', label: 'P' },
  youtube: { bg: 'bg-red-800', text: 'text-red-100', label: 'Y' },
  ai: { bg: 'bg-teal-900', text: 'text-teal-100', label: 'AI' },
  other: { bg: 'bg-slate-800', text: 'text-slate-100', label: '?' },
};

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
export function parseAccountDetails(accountDetails: unknown): Record<string, unknown> | null {
  if (!accountDetails) return null;

  try {
    if (typeof accountDetails === 'string') {
      return JSON.parse(accountDetails) as Record<string, unknown>;
    }
    if (typeof accountDetails === 'object') {
      return accountDetails as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Format a numeric amount to exactly two decimal places.
 * Use this for all monetary values in API responses and UI display.
 */
export function formatAmount(value: string | number | { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return '0.00';
  const numValue = typeof value === 'number' ? value : parseFloat(value.toString());
  if (isNaN(numValue)) return '0.00';
  return numValue.toFixed(2);
}

/**
 * Generate a WhatsApp message with purchase details for third-party customers.
 */
export interface WhatsAppMessageData {
  customerName: string;
  productName: string;
  productCategory: string;
  accountEmail: string;
  accountPassword: string;
  profileName?: string;
  pin?: string;
  durationDays?: number;
  purchaseDate: string;
  expirationDate?: string;
  providerName: string;
  providerPhone?: string;
  termsOfUse?: string;
}

export function generateWhatsAppMessage(data: WhatsAppMessageData): string {
  const expirationStr = data.expirationDate || 'N/A';
  const durationStr = data.durationDays ? `${data.durationDays} días` : 'Ilimitado';
  
  const message = `Hola *${data.customerName}* 👋🏻
🍿Tu subscripción a *${data.productName.toUpperCase()} (${data.productCategory.toUpperCase()})*🍿
✉ *usuario*: ${data.accountEmail}
🔐 *Contraseña:* ${data.accountPassword}
${data.profileName ? `👥 *Perfil:* ${data.profileName}` : ''}
${data.pin ? `🔐 *Pin:* ${data.pin}` : ''}
⏳ *Contratado:* ${durationStr}
🗓 *Compra:* ${data.purchaseDate}
🗓 *Vencimiento:* ${expirationStr}
${data.termsOfUse ? `⚠️ *Condiciones de uso:* ${data.termsOfUse}` : ''}
👤 *Proveedor:* ${data.providerName}
${data.providerPhone ? `📞 *Teléfono:* ${data.providerPhone}` : ''}
🎬🍿🎬🍿🎬🍿🎬🍿🎬🍿🎬
*¡¡Muchas gracias por su compra!!*`;

  return message.split('\n').filter(line => line.trim()).join('\n');
}

/**
 * Open WhatsApp with a pre-filled message to a phone number.
 */
export function openWhatsApp(phone: string, message: string): void {
  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
  window.open(url, '_blank');
}
