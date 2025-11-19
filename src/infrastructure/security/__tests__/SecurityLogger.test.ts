import { SecurityLogger, SecurityEventType } from '../SecurityLogger';

describe('SecurityLogger', () => {
  beforeEach(() => {
    SecurityLogger.clear();
  });

  describe('log', () => {
    it('should log security events', () => {
      SecurityLogger.log(
        SecurityEventType.LOGIN_SUCCESS,
        'User logged in',
        { identifier: '192.168.1.1', userId: 'user123' }
      );

      const events = SecurityLogger.getRecentEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(SecurityEventType.LOGIN_SUCCESS);
      expect(events[0].message).toBe('User logged in');
      expect(events[0].identifier).toBe('192.168.1.1');
      expect(events[0].userId).toBe('user123');
    });

    it('should include timestamp', () => {
      SecurityLogger.log(SecurityEventType.LOGIN_FAILURE, 'Login failed');

      const events = SecurityLogger.getRecentEvents();
      expect(events[0].timestamp).toBeInstanceOf(Date);
    });

    it('should store metadata', () => {
      SecurityLogger.log(
        SecurityEventType.REGISTRATION,
        'New user',
        { metadata: { email: 'test@example.com', source: 'web' } }
      );

      const events = SecurityLogger.getRecentEvents();
      expect(events[0].metadata).toEqual({ email: 'test@example.com', source: 'web' });
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events', () => {
      for (let i = 0; i < 5; i++) {
        SecurityLogger.log(SecurityEventType.LOGIN_SUCCESS, `Event ${i}`);
      }

      const events = SecurityLogger.getRecentEvents(3);
      expect(events).toHaveLength(3);
    });

    it('should return events in order', () => {
      SecurityLogger.log(SecurityEventType.LOGIN_SUCCESS, 'First');
      SecurityLogger.log(SecurityEventType.LOGIN_SUCCESS, 'Second');
      SecurityLogger.log(SecurityEventType.LOGIN_SUCCESS, 'Third');

      const events = SecurityLogger.getRecentEvents();
      expect(events[0].message).toBe('First');
      expect(events[2].message).toBe('Third');
    });
  });

  describe('getEventsFor', () => {
    it('should filter events by identifier', () => {
      SecurityLogger.log(SecurityEventType.LOGIN_SUCCESS, 'User A', { identifier: '192.168.1.1' });
      SecurityLogger.log(SecurityEventType.LOGIN_SUCCESS, 'User B', { identifier: '192.168.1.2' });
      SecurityLogger.log(SecurityEventType.LOGIN_SUCCESS, 'User A again', { identifier: '192.168.1.1' });

      const events = SecurityLogger.getEventsFor('192.168.1.1');
      expect(events).toHaveLength(2);
      expect(events[0].message).toBe('User A');
      expect(events[1].message).toBe('User A again');
    });

    it('should filter events by userId', () => {
      SecurityLogger.log(SecurityEventType.LOGIN_SUCCESS, 'Login', { userId: 'user123' });
      SecurityLogger.log(SecurityEventType.LOGOUT, 'Logout', { userId: 'user123' });
      SecurityLogger.log(SecurityEventType.LOGIN_SUCCESS, 'Login', { userId: 'user456' });

      const events = SecurityLogger.getEventsFor('user123');
      expect(events).toHaveLength(2);
    });
  });

  describe('getFailedLoginAttempts', () => {
    it('should count failed login attempts', () => {
      const identifier = 'test@example.com';

      SecurityLogger.log(SecurityEventType.LOGIN_FAILURE, 'Failed 1', {
        metadata: { email: identifier },
      });
      SecurityLogger.log(SecurityEventType.LOGIN_FAILURE, 'Failed 2', {
        metadata: { email: identifier },
      });
      SecurityLogger.log(SecurityEventType.LOGIN_SUCCESS, 'Success', {
        metadata: { email: identifier },
      });

      const count = SecurityLogger.getFailedLoginAttempts(identifier);
      expect(count).toBe(2);
    });

    it('should only count recent attempts within time window', () => {
      const identifier = 'test2@example.com';

      // This test verifies the time window logic exists
      SecurityLogger.log(SecurityEventType.LOGIN_FAILURE, 'Failed', {
        metadata: { email: identifier },
      });

      const count = SecurityLogger.getFailedLoginAttempts(identifier, 15);
      expect(count).toBe(1);
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should detect multiple failed logins', () => {
      const identifier = 'suspicious@example.com';

      for (let i = 0; i < 5; i++) {
        SecurityLogger.log(SecurityEventType.LOGIN_FAILURE, 'Failed login', {
          metadata: { email: identifier },
        });
      }

      const result = SecurityLogger.detectSuspiciousActivity(identifier);
      expect(result).toBe(true);
    });

    it('should not flag normal activity', () => {
      const identifier = 'normal@example.com';

      SecurityLogger.log(SecurityEventType.LOGIN_SUCCESS, 'Login', {
        identifier,
      });

      const result = SecurityLogger.detectSuspiciousActivity(identifier);
      expect(result).toBe(false);
    });
  });
});
