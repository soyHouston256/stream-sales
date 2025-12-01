export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
  }
}

export class UserAlreadyExistsException extends DomainException {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = 'UserAlreadyExistsException';
  }
}

export class UserNotFoundException extends DomainException {
  constructor(userId?: string) {
    super(userId ? `User with ID ${userId} not found` : 'User not found');
    this.name = 'UserNotFoundException';
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('Invalid credentials');
    this.name = 'InvalidCredentialsException';
  }
}

export class InvalidPasswordException extends DomainException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPasswordException';
  }
}
