import { Password } from '../Password';

describe('Password Value Object', () => {
  describe('create', () => {
    it('should create a password and hash it', async () => {
      const password = await Password.create('TestPass123!');
      expect(password.value).toBeDefined();
      expect(password.value).not.toBe('TestPass123!');
      expect(password.value.length).toBeGreaterThan(20);
    });

    it('should throw error for password less than 8 characters', async () => {
      await expect(Password.create('Short1!')).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should throw error for password without uppercase', async () => {
      await expect(Password.create('testpass123!')).rejects.toThrow(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should throw error for password without lowercase', async () => {
      await expect(Password.create('TESTPASS123!')).rejects.toThrow(
        'Password must contain at least one lowercase letter'
      );
    });

    it('should throw error for password without number', async () => {
      await expect(Password.create('TestPassword!')).rejects.toThrow(
        'Password must contain at least one number'
      );
    });

    it('should throw error for password without special character', async () => {
      await expect(Password.create('TestPass123')).rejects.toThrow(
        'Password must contain at least one special character'
      );
    });
  });

  describe('compare', () => {
    it('should return true for correct password', async () => {
      const password = await Password.create('TestPass123!');
      const isValid = await password.compare('TestPass123!');
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = await Password.create('TestPass123!');
      const isValid = await password.compare('WrongPass456!');
      expect(isValid).toBe(false);
    });
  });

  describe('fromHash', () => {
    it('should create password from hash', async () => {
      const originalPassword = await Password.create('TestPass123!');
      const hash = originalPassword.value;

      const passwordFromHash = Password.fromHash(hash);
      expect(passwordFromHash.value).toBe(hash);

      const isValid = await passwordFromHash.compare('TestPass123!');
      expect(isValid).toBe(true);
    });
  });
});
