import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { User } from '@/domain/entities/User';
import { Email } from '@/domain/value-objects/Email';
import { Password } from '@/domain/value-objects/Password';
import { prisma } from '../database/prisma';

export class PrismaUserRepository implements IUserRepository {
  async save(user: User): Promise<User> {
    const data = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email.value,
        password: user.password.value,
        name: user.name,
        role: user.role,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        username: user.username,
      },
    });

    return User.fromPersistence({
      id: data.id,
      email: Email.create(data.email),
      password: Password.fromHash(data.password),
      name: data.name ?? undefined,
      role: data.role,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      phoneNumber: data.phoneNumber ?? undefined,
      countryCode: data.countryCode ?? undefined,
      username: data.username ?? undefined,
    });
  }

  async findById(id: string): Promise<User | null> {
    const data = await prisma.user.findUnique({
      where: { id },
    });

    if (!data) return null;

    return User.fromPersistence({
      id: data.id,
      email: Email.create(data.email),
      password: Password.fromHash(data.password),
      name: data.name ?? undefined,
      role: data.role,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      phoneNumber: data.phoneNumber ?? undefined,
      countryCode: data.countryCode ?? undefined,
      username: data.username ?? undefined,
    });
  }

  async findByEmail(email: Email): Promise<User | null> {
    const data = await prisma.user.findUnique({
      where: { email: email.value },
    });

    if (!data) return null;

    return User.fromPersistence({
      id: data.id,
      email: Email.create(data.email),
      password: Password.fromHash(data.password),
      name: data.name ?? undefined,
      role: data.role,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async existsByEmail(email: Email): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email: email.value },
    });

    return count > 0;
  }
  async update(user: User): Promise<User> {
    const data = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email.value,
        password: user.password.value,
        name: user.name,
        role: user.role,
        phoneNumber: user.phoneNumber,
        countryCode: user.countryCode,
        username: user.username,
      },
    });

    return User.fromPersistence({
      id: data.id,
      email: Email.create(data.email),
      password: Password.fromHash(data.password),
      name: data.name ?? undefined,
      role: data.role,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      phoneNumber: data.phoneNumber ?? undefined,
      countryCode: data.countryCode ?? undefined,
      username: data.username ?? undefined,
    });
  }
}
