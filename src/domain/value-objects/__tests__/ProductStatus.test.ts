import { ProductStatus, ProductStatusEnum } from '../ProductStatus';

describe('ProductStatus Value Object', () => {
  describe('create', () => {
    it('should create ProductStatus from valid string', () => {
      const status = ProductStatus.create('available');

      expect(status.value).toBe('available');
    });

    it('should normalize status to lowercase', () => {
      const status = ProductStatus.create('AVAILABLE');

      expect(status.value).toBe('available');
    });

    it('should create all valid statuses', () => {
      expect(ProductStatus.create('available').value).toBe('available');
      expect(ProductStatus.create('sold').value).toBe('sold');
      expect(ProductStatus.create('reserved').value).toBe('reserved');
      expect(ProductStatus.create('suspended').value).toBe('suspended');
    });

    it('should throw error for invalid status', () => {
      expect(() => ProductStatus.create('invalid')).toThrow('Invalid product status');
    });

    it('should throw error for empty string', () => {
      expect(() => ProductStatus.create('')).toThrow('Invalid product status');
    });
  });

  describe('factory methods', () => {
    it('should create available status', () => {
      const status = ProductStatus.available();

      expect(status.isAvailable()).toBe(true);
      expect(status.value).toBe('available');
    });

    it('should create sold status', () => {
      const status = ProductStatus.sold();

      expect(status.isSold()).toBe(true);
      expect(status.value).toBe('sold');
    });

    it('should create reserved status', () => {
      const status = ProductStatus.reserved();

      expect(status.isReserved()).toBe(true);
      expect(status.value).toBe('reserved');
    });

    it('should create suspended status', () => {
      const status = ProductStatus.suspended();

      expect(status.isSuspended()).toBe(true);
      expect(status.value).toBe('suspended');
    });
  });

  describe('status checks', () => {
    it('should correctly identify available status', () => {
      const status = ProductStatus.available();

      expect(status.isAvailable()).toBe(true);
      expect(status.isSold()).toBe(false);
      expect(status.isReserved()).toBe(false);
      expect(status.isSuspended()).toBe(false);
    });

    it('should correctly identify sold status', () => {
      const status = ProductStatus.sold();

      expect(status.isAvailable()).toBe(false);
      expect(status.isSold()).toBe(true);
      expect(status.isReserved()).toBe(false);
      expect(status.isSuspended()).toBe(false);
    });

    it('should correctly identify reserved status', () => {
      const status = ProductStatus.reserved();

      expect(status.isAvailable()).toBe(false);
      expect(status.isSold()).toBe(false);
      expect(status.isReserved()).toBe(true);
      expect(status.isSuspended()).toBe(false);
    });

    it('should correctly identify suspended status', () => {
      const status = ProductStatus.suspended();

      expect(status.isAvailable()).toBe(false);
      expect(status.isSold()).toBe(false);
      expect(status.isReserved()).toBe(false);
      expect(status.isSuspended()).toBe(true);
    });
  });

  describe('canBePurchased', () => {
    it('should return true for available products', () => {
      const status = ProductStatus.available();

      expect(status.canBePurchased()).toBe(true);
    });

    it('should return false for sold products', () => {
      const status = ProductStatus.sold();

      expect(status.canBePurchased()).toBe(false);
    });

    it('should return false for reserved products', () => {
      const status = ProductStatus.reserved();

      expect(status.canBePurchased()).toBe(false);
    });

    it('should return false for suspended products', () => {
      const status = ProductStatus.suspended();

      expect(status.canBePurchased()).toBe(false);
    });
  });

  describe('canBeEdited', () => {
    it('should return true for available products', () => {
      const status = ProductStatus.available();

      expect(status.canBeEdited()).toBe(true);
    });

    it('should return true for suspended products', () => {
      const status = ProductStatus.suspended();

      expect(status.canBeEdited()).toBe(true);
    });

    it('should return false for sold products', () => {
      const status = ProductStatus.sold();

      expect(status.canBeEdited()).toBe(false);
    });

    it('should return false for reserved products', () => {
      const status = ProductStatus.reserved();

      expect(status.canBeEdited()).toBe(false);
    });
  });

  describe('canBeDeleted', () => {
    it('should return true for available products', () => {
      const status = ProductStatus.available();

      expect(status.canBeDeleted()).toBe(true);
    });

    it('should return true for reserved products', () => {
      const status = ProductStatus.reserved();

      expect(status.canBeDeleted()).toBe(true);
    });

    it('should return true for suspended products', () => {
      const status = ProductStatus.suspended();

      expect(status.canBeDeleted()).toBe(true);
    });

    it('should return false for sold products', () => {
      const status = ProductStatus.sold();

      expect(status.canBeDeleted()).toBe(false);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow AVAILABLE -> RESERVED transition', () => {
      const current = ProductStatus.available();
      const next = ProductStatus.reserved();

      expect(current.canTransitionTo(next)).toBe(true);
    });

    it('should allow AVAILABLE -> SUSPENDED transition', () => {
      const current = ProductStatus.available();
      const next = ProductStatus.suspended();

      expect(current.canTransitionTo(next)).toBe(true);
    });

    it('should not allow AVAILABLE -> SOLD transition', () => {
      const current = ProductStatus.available();
      const next = ProductStatus.sold();

      expect(current.canTransitionTo(next)).toBe(false);
    });

    it('should allow RESERVED -> SOLD transition', () => {
      const current = ProductStatus.reserved();
      const next = ProductStatus.sold();

      expect(current.canTransitionTo(next)).toBe(true);
    });

    it('should allow RESERVED -> AVAILABLE transition (cancel)', () => {
      const current = ProductStatus.reserved();
      const next = ProductStatus.available();

      expect(current.canTransitionTo(next)).toBe(true);
    });

    it('should not allow RESERVED -> SUSPENDED transition', () => {
      const current = ProductStatus.reserved();
      const next = ProductStatus.suspended();

      expect(current.canTransitionTo(next)).toBe(false);
    });

    it('should allow SUSPENDED -> AVAILABLE transition', () => {
      const current = ProductStatus.suspended();
      const next = ProductStatus.available();

      expect(current.canTransitionTo(next)).toBe(true);
    });

    it('should not allow SUSPENDED -> SOLD transition', () => {
      const current = ProductStatus.suspended();
      const next = ProductStatus.sold();

      expect(current.canTransitionTo(next)).toBe(false);
    });

    it('should not allow any transition from SOLD', () => {
      const sold = ProductStatus.sold();

      expect(sold.canTransitionTo(ProductStatus.available())).toBe(false);
      expect(sold.canTransitionTo(ProductStatus.reserved())).toBe(false);
      expect(sold.canTransitionTo(ProductStatus.suspended())).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('should not throw for valid transitions', () => {
      const current = ProductStatus.available();
      const next = ProductStatus.reserved();

      expect(() => current.validateTransition(next)).not.toThrow();
    });

    it('should throw for invalid transitions', () => {
      const current = ProductStatus.available();
      const next = ProductStatus.sold();

      expect(() => current.validateTransition(next)).toThrow(
        'Invalid status transition from available to sold'
      );
    });

    it('should throw when trying to transition from SOLD', () => {
      const sold = ProductStatus.sold();
      const available = ProductStatus.available();

      expect(() => sold.validateTransition(available)).toThrow(
        'Invalid status transition from sold to available'
      );
    });
  });

  describe('equals', () => {
    it('should return true for same status', () => {
      const status1 = ProductStatus.available();
      const status2 = ProductStatus.available();

      expect(status1.equals(status2)).toBe(true);
    });

    it('should return false for different statuses', () => {
      const status1 = ProductStatus.available();
      const status2 = ProductStatus.sold();

      expect(status1.equals(status2)).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string', () => {
      const status = ProductStatus.available();

      expect(status.toString()).toBe('available');
    });

    it('should serialize to JSON', () => {
      const status = ProductStatus.reserved();

      expect(status.toJSON()).toBe('reserved');
    });
  });

  describe('immutability', () => {
    it('should be frozen (immutable)', () => {
      const status = ProductStatus.available();

      expect(Object.isFrozen(status)).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should handle complete purchase flow', () => {
      // Product starts as available
      let status = ProductStatus.available();
      expect(status.canBePurchased()).toBe(true);

      // User initiates purchase -> reserved
      const reserved = ProductStatus.reserved();
      expect(status.canTransitionTo(reserved)).toBe(true);
      status = reserved;

      // Purchase completed -> sold
      const sold = ProductStatus.sold();
      expect(status.canTransitionTo(sold)).toBe(true);
      status = sold;

      // Cannot purchase sold product
      expect(status.canBePurchased()).toBe(false);
      expect(status.canBeDeleted()).toBe(false);
    });

    it('should handle purchase cancellation', () => {
      // Product reserved during checkout
      let status = ProductStatus.reserved();

      // User cancels or timeout -> back to available
      const available = ProductStatus.available();
      expect(status.canTransitionTo(available)).toBe(true);
      status = available;

      // Product can be purchased again
      expect(status.canBePurchased()).toBe(true);
    });

    it('should handle admin suspension', () => {
      // Product available
      let status = ProductStatus.available();

      // Admin reports fraud -> suspended
      const suspended = ProductStatus.suspended();
      expect(status.canTransitionTo(suspended)).toBe(true);
      status = suspended;

      // Cannot be purchased but can be edited
      expect(status.canBePurchased()).toBe(false);
      expect(status.canBeEdited()).toBe(true);

      // After investigation -> reactivate
      const reactivated = ProductStatus.available();
      expect(status.canTransitionTo(reactivated)).toBe(true);
    });
  });
});
