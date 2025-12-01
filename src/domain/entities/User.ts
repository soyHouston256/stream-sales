import { Email } from '../value-objects/Email';
import { Password } from '../value-objects/Password';

export interface UserProps {
  id: string;
  email: Email;
  password: Password;
  name?: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private props: UserProps) { }

  static create(props: Omit<UserProps, 'id' | 'createdAt' | 'updatedAt'>): User {
    return new User({
      ...props,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): Email {
    return this.props.email;
  }

  get password(): Password {
    return this.props.password;
  }

  get name(): string | undefined {
    return this.props.name;
  }

  get role(): string {
    return this.props.role;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateName(name: string): void {
    this.props.name = name;
    this.props.updatedAt = new Date();
  }

  updatePassword(password: Password): void {
    this.props.password = password;
    this.props.updatedAt = new Date();
  }

  async verifyPassword(plainPassword: string): Promise<boolean> {
    return this.props.password.compare(plainPassword);
  }

  toJSON() {
    return {
      id: this.props.id,
      email: this.props.email.value,
      name: this.props.name,
      role: this.props.role,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
