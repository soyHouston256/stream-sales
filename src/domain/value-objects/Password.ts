import bcrypt from 'bcryptjs';

export class Password {
  private constructor(private readonly hashedPassword: string) {}

  static async create(plainPassword: string): Promise<Password> {
    // SECURITY: Enforce strong password requirements
    if (plainPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (plainPassword.length > 128) {
      throw new Error('Password must not exceed 128 characters');
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(plainPassword)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(plainPassword)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    // Check for at least one number
    if (!/[0-9]/.test(plainPassword)) {
      throw new Error('Password must contain at least one number');
    }

    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(plainPassword)) {
      throw new Error('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)');
    }

    // SECURITY: Use bcrypt with cost factor of 12 for better security (default 10 is now considered weak)
    const hashed = await bcrypt.hash(plainPassword, 12);
    return new Password(hashed);
  }

  static fromHash(hashedPassword: string): Password {
    return new Password(hashedPassword);
  }

  async compare(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.hashedPassword);
  }

  get value(): string {
    return this.hashedPassword;
  }
}
