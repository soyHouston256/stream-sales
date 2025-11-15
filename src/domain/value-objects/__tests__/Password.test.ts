import { Password } from '../Password';

describe('Password Value Object', () => {
  describe('create', () => {
    it('should create a password and hash it', async () => {
      const password = await Password.create('password123');
      expect(password.value).toBeDefined();
      expect(password.value).not.toBe('password123');
      expect(password.value.length).toBeGreaterThan(20);
    });

    it('should throw error for password less than 6 characters', async () => {
      await expect(Password.create('12345')).rejects.toThrow(
        'Password must be at least 6 characters long'
      );
    });
  });

  describe('compare', () => {
    it('should return true for correct password', async () => {
      const password = await Password.create('password123');
      const isValid = await password.compare('password123');
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = await Password.create('password123');
      const isValid = await password.compare('wrongpassword');
      expect(isValid).toBe(false);
    });
  });

  describe('fromHash', () => {
    it('should create password from hash', async () => {
      const originalPassword = await Password.create('password123');
      const hash = originalPassword.value;

      const passwordFromHash = Password.fromHash(hash);
      expect(passwordFromHash.value).toBe(hash);

      const isValid = await passwordFromHash.compare('password123');
      expect(isValid).toBe(true);
    });
  });
});
