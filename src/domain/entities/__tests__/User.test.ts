import { User } from '../User';
import { Email } from '../../value-objects/Email';
import { Password } from '../../value-objects/Password';

describe('User Entity', () => {
  describe('create', () => {
    it('should create a new user', async () => {
      const email = Email.create('test@example.com');
      const password = await Password.create('TestPass123!');

      const user = User.create({
        email,
        password,
        name: 'Test User',
        role: 'user',
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.password).toBe(password);
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('user');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create user without name', async () => {
      const email = Email.create('test@example.com');
      const password = await Password.create('TestPass123!');

      const user = User.create({
        email,
        password,
        role: 'user',
      });

      expect(user.name).toBeUndefined();
    });
  });

  describe('fromPersistence', () => {
    it('should create user from persistence data', async () => {
      const email = Email.create('test@example.com');
      const password = await Password.create('TestPass123!');
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      const user = User.fromPersistence({
        id: 'user-123',
        email,
        password,
        name: 'Test User',
        role: 'admin',
        createdAt,
        updatedAt,
      });

      expect(user.id).toBe('user-123');
      expect(user.email).toBe(email);
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('admin');
      expect(user.createdAt).toBe(createdAt);
      expect(user.updatedAt).toBe(updatedAt);
    });
  });

  describe('updateName', () => {
    it('should update user name', async () => {
      const email = Email.create('test@example.com');
      const password = await Password.create('TestPass123!');

      const user = User.create({
        email,
        password,
        name: 'Old Name',
        role: 'user',
      });

      const oldUpdatedAt = user.updatedAt;

      // Wait a bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      user.updateName('New Name');

      expect(user.name).toBe('New Name');
      expect(user.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const email = Email.create('test@example.com');
      const password = await Password.create('TestPass123!');

      const user = User.create({
        email,
        password,
        role: 'user',
      });

      const isValid = await user.verifyPassword('TestPass123!');
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const email = Email.create('test@example.com');
      const password = await Password.create('TestPass123!');

      const user = User.create({
        email,
        password,
        role: 'user',
      });

      const isValid = await user.verifyPassword('wrongpassword');
      expect(isValid).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should convert user to JSON without password', async () => {
      const email = Email.create('test@example.com');
      const password = await Password.create('TestPass123!');

      const user = User.create({
        email,
        password,
        name: 'Test User',
        role: 'user',
      });

      const json = user.toJSON();

      expect(json).toEqual({
        id: user.id,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
      expect(json).not.toHaveProperty('password');
    });
  });
});
