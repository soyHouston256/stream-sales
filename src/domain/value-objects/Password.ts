import bcrypt from 'bcryptjs';

export class Password {
  private constructor(private readonly hashedPassword: string) {}

  static async create(plainPassword: string): Promise<Password> {
    if (plainPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    const hashed = await bcrypt.hash(plainPassword, 10);
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
