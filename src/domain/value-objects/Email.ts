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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  get value(): string {
    return this.email;
  }

  equals(other: Email): boolean {
    return this.email === other.email;
  }
}
