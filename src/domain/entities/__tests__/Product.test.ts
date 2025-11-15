import { Product } from '../Product';
import { Money } from '../../value-objects/Money';
import { ProductStatus } from '../../value-objects/ProductStatus';

describe('Product Entity', () => {
  describe('create', () => {
    it('should create a new product with valid data', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(product.id).toBeDefined();
      expect(product.providerId).toBe('provider123');
      expect(product.category).toBe('netflix');
      expect(product.price.toNumber()).toBe(15.99);
      expect(product.accountEmail).toBe('account@netflix.com');
      expect(product.status.isAvailable()).toBe(true);
    });

    it('should normalize category to lowercase', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'NETFLIX',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(product.category).toBe('netflix');
    });

    it('should trim whitespace from category and email', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: '  spotify  ',
        price: Money.create(10.99),
        accountEmail: '  account@spotify.com  ',
        accountPassword: 'encrypted_password',
      });

      expect(product.category).toBe('spotify');
      expect(product.accountEmail).toBe('account@spotify.com');
    });

    it('should set timestamps', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(product.createdAt).toBeInstanceOf(Date);
      expect(product.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error if category is empty', () => {
      expect(() =>
        Product.create({
          providerId: 'provider123',
          category: '',
          price: Money.create(15.99),
          accountEmail: 'account@netflix.com',
          accountPassword: 'encrypted_password',
        })
      ).toThrow('Product category is required');
    });

    it('should throw error if accountEmail is empty', () => {
      expect(() =>
        Product.create({
          providerId: 'provider123',
          category: 'netflix',
          price: Money.create(15.99),
          accountEmail: '',
          accountPassword: 'encrypted_password',
        })
      ).toThrow('Account email is required');
    });

    it('should throw error if accountPassword is empty', () => {
      expect(() =>
        Product.create({
          providerId: 'provider123',
          category: 'netflix',
          price: Money.create(15.99),
          accountEmail: 'account@netflix.com',
          accountPassword: '',
        })
      ).toThrow('Account password is required');
    });

    it('should throw error if price is not positive', () => {
      expect(() =>
        Product.create({
          providerId: 'provider123',
          category: 'netflix',
          price: Money.create(0),
          accountEmail: 'account@netflix.com',
          accountPassword: 'encrypted_password',
        })
      ).toThrow('Product price must be positive');
    });

    it('should throw error if price is negative', () => {
      expect(() =>
        Product.create({
          providerId: 'provider123',
          category: 'netflix',
          price: Money.create(-10),
          accountEmail: 'account@netflix.com',
          accountPassword: 'encrypted_password',
        })
      ).toThrow('Product price must be positive');
    });
  });

  describe('reserve', () => {
    it('should reserve an available product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.reserve();

      expect(product.status.isReserved()).toBe(true);
    });

    it('should update timestamp after reservation', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      const originalTimestamp = product.updatedAt;
      setTimeout(() => {
        product.reserve();
        expect(product.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());
      }, 10);
    });

    it('should throw error when reserving sold product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.reserve();
      product.markAsSold('buyer123');

      expect(() => product.reserve()).toThrow('Cannot reserve product');
    });

    it('should throw error when reserving suspended product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.suspend();

      expect(() => product.reserve()).toThrow('Cannot reserve product');
    });
  });

  describe('markAsSold', () => {
    it('should mark reserved product as sold', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.reserve();
      product.markAsSold('buyer123');

      expect(product.status.isSold()).toBe(true);
      expect(product.soldToUserId).toBe('buyer123');
      expect(product.soldAt).toBeInstanceOf(Date);
    });

    it('should throw error if buyerUserId is empty', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.reserve();

      expect(() => product.markAsSold('')).toThrow('Buyer user ID is required');
    });

    it('should throw error when marking available product as sold', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(() => product.markAsSold('buyer123')).toThrow('Invalid status transition');
    });
  });

  describe('cancelReservation', () => {
    it('should cancel reservation and make product available again', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.reserve();
      product.cancelReservation();

      expect(product.status.isAvailable()).toBe(true);
    });

    it('should throw error when canceling non-reserved product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(() => product.cancelReservation()).toThrow('product is not reserved');
    });
  });

  describe('suspend', () => {
    it('should suspend available product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.suspend();

      expect(product.status.isSuspended()).toBe(true);
    });

    it('should throw error when suspending non-available product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.reserve();

      expect(() => product.suspend()).toThrow('Can only suspend available products');
    });
  });

  describe('reactivate', () => {
    it('should reactivate suspended product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.suspend();
      product.reactivate();

      expect(product.status.isAvailable()).toBe(true);
    });

    it('should throw error when reactivating non-suspended product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(() => product.reactivate()).toThrow('Can only reactivate suspended products');
    });
  });

  describe('updateCredentials', () => {
    it('should update credentials for available product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'old@netflix.com',
        accountPassword: 'old_password',
      });

      product.updateCredentials('new@netflix.com', 'new_password');

      expect(product.accountEmail).toBe('new@netflix.com');
      expect(product.accountPassword).toBe('new_password');
    });

    it('should trim whitespace from email', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'old@netflix.com',
        accountPassword: 'old_password',
      });

      product.updateCredentials('  new@netflix.com  ', 'new_password');

      expect(product.accountEmail).toBe('new@netflix.com');
    });

    it('should throw error if email is empty', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'old@netflix.com',
        accountPassword: 'old_password',
      });

      expect(() => product.updateCredentials('', 'new_password')).toThrow(
        'Account email is required'
      );
    });

    it('should throw error if password is empty', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'old@netflix.com',
        accountPassword: 'old_password',
      });

      expect(() => product.updateCredentials('new@netflix.com', '')).toThrow(
        'Account password is required'
      );
    });

    it('should throw error when updating credentials of sold product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'old@netflix.com',
        accountPassword: 'old_password',
      });

      product.reserve();
      product.markAsSold('buyer123');

      expect(() => product.updateCredentials('new@netflix.com', 'new_password')).toThrow(
        'Cannot edit product'
      );
    });
  });

  describe('updatePrice', () => {
    it('should update price for available product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.updatePrice(Money.create(19.99));

      expect(product.price.toNumber()).toBe(19.99);
    });

    it('should throw error if new price is not positive', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(() => product.updatePrice(Money.create(0))).toThrow('price must be positive');
    });

    it('should throw error when updating price of sold product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.reserve();
      product.markAsSold('buyer123');

      expect(() => product.updatePrice(Money.create(19.99))).toThrow('Cannot edit product');
    });
  });

  describe('updateCategory', () => {
    it('should update category for available product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.updateCategory('spotify');

      expect(product.category).toBe('spotify');
    });

    it('should normalize category to lowercase', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.updateCategory('SPOTIFY');

      expect(product.category).toBe('spotify');
    });

    it('should throw error if category is empty', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(() => product.updateCategory('')).toThrow('Category is required');
    });
  });

  describe('isOwnedBy', () => {
    it('should return true if user is the owner', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(product.isOwnedBy('provider123')).toBe(true);
    });

    it('should return false if user is not the owner', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(product.isOwnedBy('other_user')).toBe(false);
    });
  });

  describe('canBePurchased', () => {
    it('should return true for available product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(product.canBePurchased()).toBe(true);
    });

    it('should return false for sold product', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      product.reserve();
      product.markAsSold('buyer123');

      expect(product.canBePurchased()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize product for API response', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      const json = product.toJSON();

      expect(json.id).toBeDefined();
      expect(json.providerId).toBe('provider123');
      expect(json.category).toBe('netflix');
      expect(json.price).toBe('15.9900');
      expect(json.accountEmail).toBe('account@netflix.com');
      expect(json.accountPassword).toBeUndefined(); // Security: not included
      expect(json.status).toBe('available');
    });
  });

  describe('toJSONWithCredentials', () => {
    it('should include credentials in response', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      const json = product.toJSONWithCredentials();

      expect(json.accountPassword).toBe('encrypted_password');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle complete purchase flow', () => {
      // Provider creates product
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      expect(product.canBePurchased()).toBe(true);

      // Buyer initiates purchase -> reserved
      product.reserve();
      expect(product.status.isReserved()).toBe(true);
      expect(product.canBePurchased()).toBe(false);

      // Purchase completed -> sold
      product.markAsSold('buyer123');
      expect(product.status.isSold()).toBe(true);
      expect(product.soldToUserId).toBe('buyer123');
      expect(product.canBeEdited()).toBe(false);
      expect(product.canBeDeleted()).toBe(false);
    });

    it('should handle purchase cancellation', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      // Reserve product
      product.reserve();

      // User cancels or payment fails
      product.cancelReservation();

      // Product available again
      expect(product.canBePurchased()).toBe(true);
    });

    it('should handle product suspension and reactivation', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'account@netflix.com',
        accountPassword: 'encrypted_password',
      });

      // Admin suspends product (fraud report)
      product.suspend();
      expect(product.canBePurchased()).toBe(false);
      expect(product.canBeEdited()).toBe(true);

      // After investigation -> reactivate
      product.reactivate();
      expect(product.canBePurchased()).toBe(true);
    });

    it('should handle provider updating product details', () => {
      const product = Product.create({
        providerId: 'provider123',
        category: 'netflix',
        price: Money.create(15.99),
        accountEmail: 'old@netflix.com',
        accountPassword: 'old_password',
      });

      // Provider updates credentials
      product.updateCredentials('new@netflix.com', 'new_password');
      expect(product.accountEmail).toBe('new@netflix.com');

      // Provider updates price
      product.updatePrice(Money.create(19.99));
      expect(product.price.toNumber()).toBe(19.99);

      // Provider changes category
      product.updateCategory('hbo');
      expect(product.category).toBe('hbo');
    });
  });
});
