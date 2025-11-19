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
    // SECURITY: More robust email validation using RFC 5322 compliant regex
    // This prevents common email validation bypasses
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(email)) {
      return false;
    }

    // Additional validation checks
    if (email.length > 254) {
      return false; // RFC 5321 maximum length
    }

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
