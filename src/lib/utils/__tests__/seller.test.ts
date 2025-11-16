import {
  validatePurchase,
  formatCurrency,
  truncateText,
  parseAccountDetails,
} from '../seller';

describe('Seller Utils', () => {
  describe('validatePurchase', () => {
    it('returns canPurchase true when balance is sufficient', () => {
      const result = validatePurchase('100.00', '50.00');

      expect(result.canPurchase).toBe(true);
      expect(result.balanceAfter).toBe('50.00');
      expect(result.warning).toBeUndefined();
    });

    it('returns canPurchase false when balance is insufficient', () => {
      const result = validatePurchase('30.00', '50.00');

      expect(result.canPurchase).toBe(false);
      expect(result.balanceAfter).toBe('-20.00');
    });

    it('returns warning when balance after purchase is low but positive', () => {
      const result = validatePurchase('15.00', '8.00');

      expect(result.canPurchase).toBe(true);
      expect(result.balanceAfter).toBe('7.00');
      expect(result.warning).toBe(
        'Your balance will be low after this purchase'
      );
    });

    it('does not return warning when balance after purchase is >= 10', () => {
      const result = validatePurchase('100.00', '50.00');

      expect(result.canPurchase).toBe(true);
      expect(result.balanceAfter).toBe('50.00');
      expect(result.warning).toBeUndefined();
    });

    it('handles exact balance scenario', () => {
      const result = validatePurchase('50.00', '50.00');

      expect(result.canPurchase).toBe(true);
      expect(result.balanceAfter).toBe('0.00');
      expect(result.warning).toBeUndefined();
    });
  });

  describe('formatCurrency', () => {
    it('formats string amount correctly', () => {
      expect(formatCurrency('100.50')).toBe('$100.50');
      expect(formatCurrency('1000')).toBe('$1,000.00');
    });

    it('formats number amount correctly', () => {
      expect(formatCurrency(100.5)).toBe('$100.50');
      expect(formatCurrency(1000)).toBe('$1,000.00');
    });

    it('handles zero correctly', () => {
      expect(formatCurrency('0')).toBe('$0.00');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('handles large numbers correctly', () => {
      expect(formatCurrency('1234567.89')).toBe('$1,234,567.89');
    });

    it('uses custom currency when provided', () => {
      expect(formatCurrency('100', 'EUR')).toBe('€100.00');
    });
  });

  describe('truncateText', () => {
    it('returns original text when length is within limit', () => {
      const text = 'Short text';
      expect(truncateText(text, 20)).toBe('Short text');
    });

    it('truncates text when length exceeds limit', () => {
      const text = 'This is a very long text that needs to be truncated';
      const result = truncateText(text, 20);

      expect(result).toBe('This is a very long ...');
      expect(result.length).toBe(23); // 20 chars + '...'
    });

    it('handles exact length correctly', () => {
      const text = 'Exactly twenty chars';
      expect(truncateText(text, 20)).toBe('Exactly twenty chars');
    });
  });

  describe('parseAccountDetails', () => {
    it('parses valid JSON string', () => {
      const jsonString = '{"profile": "Profile 1", "pin": "1234"}';
      const result = parseAccountDetails(jsonString);

      expect(result).toEqual({ profile: 'Profile 1', pin: '1234' });
    });

    it('returns object as-is when already parsed', () => {
      const obj = { profile: 'Profile 1', pin: '1234' };
      const result = parseAccountDetails(obj);

      expect(result).toEqual(obj);
    });

    it('returns null for invalid JSON string', () => {
      const invalidJson = '{ invalid json }';
      const result = parseAccountDetails(invalidJson);

      expect(result).toBeNull();
    });

    it('returns null for null/undefined input', () => {
      expect(parseAccountDetails(null)).toBeNull();
      expect(parseAccountDetails(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseAccountDetails('')).toBeNull();
    });
  });
});
