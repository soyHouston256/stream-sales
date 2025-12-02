import { z } from 'zod';

export class Email {
  private readonly email: string;

  private constructor(email: string) {
    this.email = email;
  }

  static create(email: string): Email {
    const normalizedEmail = email.toLowerCase().trim();
    if (!Email.isValid(normalizedEmail)) {
      throw new Error('Invalid email format');
    }
    return new Email(normalizedEmail);
  }

  private static isValid(email: string): boolean {
    // SECURITY: Use Zod for robust email validation instead of custom regex
    const emailSchema = z.string().email().max(254);
    const result = emailSchema.safeParse(email);

    if (!result.success) {
      return false;
    }

    // Additional checks not always covered by standard email regex
    const parts = email.split('@');
    if (parts.length !== 2) {
      return false;
    }

    const [localPart, domainPart] = parts;

    // Local part (before @) validation
    if (localPart.length === 0 || localPart.length > 64) {
      return false; // RFC 5321 local part max length
    }

    // Domain part validation
    if (domainPart.length === 0 || domainPart.length > 253) {
      return false;
    }

    // Check for consecutive dots
    if (email.includes('..')) {
      return false;
    }

    // Domain must have at least one dot
    if (!domainPart.includes('.')) {
      return false;
    }

    return true;
  }

  get value(): string {
    return this.email;
  }

  equals(other: Email): boolean {
    return this.email === other.email;
  }
}
