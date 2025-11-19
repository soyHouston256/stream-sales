/**
 * Tests for affiliate utility functions
 */

import {
  replaceTemplateVariables,
  generateReferralLink,
  formatCommissionAmount,
  calculateConversionRate,
  getBalanceColorClass,
  formatMonthDisplay,
  getCommissionTypeLabel,
  getReferralStatusLabel,
  validatePaymentDetails,
} from '../affiliate';

describe('Affiliate Utilities', () => {
  describe('replaceTemplateVariables', () => {
    it('should replace all variables in template', () => {
      const template = 'Use my code {code} or link {link}. Thanks, {name}!';
      const variables = {
        code: 'ABC123',
        link: 'https://example.com/ref/ABC123',
        name: 'John',
      };

      const result = replaceTemplateVariables(template, variables);

      expect(result).toBe('Use my code ABC123 or link https://example.com/ref/ABC123. Thanks, John!');
    });

    it('should replace multiple occurrences of same variable', () => {
      const template = '{code} is my code. Share {code} with friends!';
      const variables = {
        code: 'XYZ789',
        link: 'https://example.com',
        name: 'Jane',
      };

      const result = replaceTemplateVariables(template, variables);

      expect(result).toBe('XYZ789 is my code. Share XYZ789 with friends!');
    });

    it('should handle template with no variables', () => {
      const template = 'This is a plain template';
      const variables = {
        code: 'ABC123',
        link: 'https://example.com',
        name: 'John',
      };

      const result = replaceTemplateVariables(template, variables);

      expect(result).toBe('This is a plain template');
    });
  });

  describe('generateReferralLink', () => {
    it('should generate link with referral code', () => {
      const code = 'MYCODE123';
      const result = generateReferralLink(code);

      expect(result).toContain('/register?ref=MYCODE123');
    });
  });

  describe('formatCommissionAmount', () => {
    it('should format number as USD currency', () => {
      expect(formatCommissionAmount(100)).toBe('$100.00');
      expect(formatCommissionAmount(1234.56)).toBe('$1,234.56');
      expect(formatCommissionAmount(0)).toBe('$0.00');
    });

    it('should format string as USD currency', () => {
      expect(formatCommissionAmount('100')).toBe('$100.00');
      expect(formatCommissionAmount('1234.56')).toBe('$1,234.56');
      expect(formatCommissionAmount('0')).toBe('$0.00');
    });
  });

  describe('calculateConversionRate', () => {
    it('should calculate conversion rate correctly', () => {
      expect(calculateConversionRate(10, 100)).toBe(10);
      expect(calculateConversionRate(25, 100)).toBe(25);
      expect(calculateConversionRate(1, 3)).toBe(33.33);
    });

    it('should return 0 when views is 0', () => {
      expect(calculateConversionRate(10, 0)).toBe(0);
    });

    it('should handle 100% conversion', () => {
      expect(calculateConversionRate(50, 50)).toBe(100);
    });
  });

  describe('getBalanceColorClass', () => {
    it('should return gray for zero balance', () => {
      expect(getBalanceColorClass(0)).toContain('gray');
      expect(getBalanceColorClass('0')).toContain('gray');
    });

    it('should return yellow for balance below 50', () => {
      expect(getBalanceColorClass(25)).toContain('yellow');
      expect(getBalanceColorClass('49.99')).toContain('yellow');
    });

    it('should return green for balance 50 or above', () => {
      expect(getBalanceColorClass(50)).toContain('green');
      expect(getBalanceColorClass(100)).toContain('green');
      expect(getBalanceColorClass('75.50')).toContain('green');
    });
  });

  describe('formatMonthDisplay', () => {
    it('should format YYYY-MM to readable format', () => {
      expect(formatMonthDisplay('2024-01')).toContain('Jan');
      expect(formatMonthDisplay('2024-12')).toContain('Dec');
    });
  });

  describe('getCommissionTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getCommissionTypeLabel('registration')).toBe('Registration');
      expect(getCommissionTypeLabel('sale')).toBe('Sale');
      expect(getCommissionTypeLabel('bonus')).toBe('Bonus');
    });
  });

  describe('getReferralStatusLabel', () => {
    it('should return correct labels', () => {
      expect(getReferralStatusLabel('active')).toBe('Active');
      expect(getReferralStatusLabel('inactive')).toBe('Inactive');
      expect(getReferralStatusLabel('suspended')).toBe('Suspended');
    });
  });

  describe('validatePaymentDetails', () => {
    describe('PayPal validation', () => {
      it('should validate correct PayPal email', () => {
        expect(validatePaymentDetails('paypal', 'user@example.com')).toBeNull();
      });

      it('should reject invalid email', () => {
        expect(validatePaymentDetails('paypal', 'invalid-email')).toBeTruthy();
        expect(validatePaymentDetails('paypal', 'user@')).toBeTruthy();
      });
    });

    describe('Bank transfer validation', () => {
      it('should validate bank details with sufficient length', () => {
        expect(validatePaymentDetails('bank_transfer', '1234567890')).toBeNull();
      });

      it('should reject short bank details', () => {
        expect(validatePaymentDetails('bank_transfer', '123')).toBeTruthy();
      });
    });

    describe('Crypto validation', () => {
      it('should validate crypto wallet with sufficient length', () => {
        expect(validatePaymentDetails('crypto', '1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T')).toBeNull();
      });

      it('should reject short crypto wallet', () => {
        expect(validatePaymentDetails('crypto', 'short')).toBeTruthy();
      });
    });
  });
});
