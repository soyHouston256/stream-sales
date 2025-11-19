/**
 * Security Logger
 * Logs security-related events for monitoring and auditing
 */

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  REGISTRATION = 'REGISTRATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  CSRF_ATTEMPT = 'CSRF_ATTEMPT',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  identifier?: string; // IP, user ID, email, etc.
  userId?: string;
  message: string;
  metadata?: Record<string, any>;
}

export class SecurityLogger {
  private static events: SecurityEvent[] = [];
  private static readonly MAX_EVENTS = 10000; // Prevent memory overflow

  /**
   * Log a security event
   */
  static log(
    type: SecurityEventType,
    message: string,
    options?: {
      identifier?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    const event: SecurityEvent = {
      type,
      timestamp: new Date(),
      identifier: options?.identifier,
      userId: options?.userId,
      message,
      metadata: options?.metadata,
    };

    // Add to in-memory store
    this.events.push(event);

    // Prevent memory overflow
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Log to console with severity
    const severity = this.getSeverity(type);
    const logMessage = `[SECURITY ${severity}] ${type}: ${message}`;

    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        console.error(logMessage, options?.metadata);
        break;
      case 'MEDIUM':
        console.warn(logMessage, options?.metadata);
        break;
      default:
        console.log(logMessage, options?.metadata);
    }

    // In production, send to external logging service (e.g., Sentry, LogRocket, DataDog)
    // this.sendToExternalService(event);
  }

  /**
   * Get recent security events
   */
  static getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get events for specific user/identifier
   */
  static getEventsFor(identifier: string, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(
        event =>
          event.identifier === identifier ||
          event.userId === identifier ||
          event.metadata?.email === identifier
      )
      .slice(-limit);
  }

  /**
   * Get failed login attempts for identifier
   */
  static getFailedLoginAttempts(identifier: string, withinMinutes: number = 15): number {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);

    return this.events.filter(
      event =>
        event.type === SecurityEventType.LOGIN_FAILURE &&
        (event.identifier === identifier || event.metadata?.email === identifier) &&
        event.timestamp > cutoff
    ).length;
  }

  /**
   * Clear old events (for testing or manual cleanup)
   */
  static clear(): void {
    this.events = [];
  }

  /**
   * Determine severity of event type
   */
  private static getSeverity(
    type: SecurityEventType
  ): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' {
    switch (type) {
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
      case SecurityEventType.XSS_ATTEMPT:
      case SecurityEventType.ACCOUNT_LOCKED:
        return 'CRITICAL';

      case SecurityEventType.RATE_LIMIT_EXCEEDED:
      case SecurityEventType.INVALID_TOKEN:
      case SecurityEventType.UNAUTHORIZED_ACCESS:
      case SecurityEventType.CSRF_ATTEMPT:
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        return 'HIGH';

      case SecurityEventType.LOGIN_FAILURE:
        return 'MEDIUM';

      case SecurityEventType.LOGIN_SUCCESS:
      case SecurityEventType.LOGOUT:
      case SecurityEventType.REGISTRATION:
        return 'INFO';

      default:
        return 'LOW';
    }
  }

  /**
   * Check for suspicious patterns
   * Returns true if suspicious activity detected
   */
  static detectSuspiciousActivity(identifier: string): boolean {
    const recentEvents = this.getEventsFor(identifier, 100);
    const last15Min = Date.now() - 15 * 60 * 1000;

    // Count events in last 15 minutes
    const recentCount = recentEvents.filter(e => e.timestamp.getTime() > last15Min).length;

    // Flag if too many events in short period
    if (recentCount > 50) {
      this.log(SecurityEventType.SUSPICIOUS_ACTIVITY, 'High event count detected', {
        identifier,
        metadata: { eventCount: recentCount, timeWindow: '15min' },
      });
      return true;
    }

    // Flag if multiple failed logins
    const failedLogins = this.getFailedLoginAttempts(identifier, 15);
    if (failedLogins >= 5) {
      this.log(SecurityEventType.SUSPICIOUS_ACTIVITY, 'Multiple failed login attempts', {
        identifier,
        metadata: { failedAttempts: failedLogins },
      });
      return true;
    }

    return false;
  }
}
