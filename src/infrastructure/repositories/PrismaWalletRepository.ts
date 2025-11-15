import { PrismaClient } from '@prisma/client';
import { Wallet, WalletStatus } from '../../domain/entities/Wallet';
import { Money } from '../../domain/value-objects/Money';
import { IWalletRepository } from '../../domain/repositories/IWalletRepository';

/**
 * PrismaWalletRepository
 *
 * Implementación de IWalletRepository usando Prisma ORM.
 *
 * Responsabilidades:
 * - Convertir entre domain entities y Prisma models
 * - Ejecutar queries contra PostgreSQL
 * - Manejar errores de persistencia
 *
 * NO debe contener lógica de negocio - solo persistencia.
 */
export class PrismaWalletRepository implements IWalletRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Guarda una wallet (create o update)
   *
   * Usa Prisma upsert para manejar ambos casos.
   */
  async save(wallet: Wallet): Promise<Wallet> {
    const data = wallet.toPersistence();

    const savedWallet = await this.prisma.wallet.upsert({
      where: { id: data.id },
      update: {
        balance: data.balance,
        currency: data.currency,
        status: data.status,
        updatedAt: data.updatedAt,
      },
      create: {
        id: data.id,
        userId: data.userId,
        balance: data.balance,
        currency: data.currency,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });

    return this.toDomain(savedWallet);
  }

  /**
   * Busca wallet por ID
   */
  async findById(id: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { id },
    });

    return wallet ? this.toDomain(wallet) : null;
  }

  /**
   * Busca wallet por ID de usuario
   *
   * Usa findUnique porque userId tiene constraint UNIQUE en Prisma schema.
   */
  async findByUserId(userId: string): Promise<Wallet | null> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    return wallet ? this.toDomain(wallet) : null;
  }

  /**
   * Verifica si un usuario ya tiene wallet
   */
  async existsByUserId(userId: string): Promise<boolean> {
    const count = await this.prisma.wallet.count({
      where: { userId },
    });

    return count > 0;
  }

  /**
   * Elimina una wallet
   *
   * IMPORTANTE: Se usa soft delete actualizando status a 'closed'.
   * Para hard delete, usar: this.prisma.wallet.delete({ where: { id } })
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.wallet.update({
        where: { id },
        data: {
          status: WalletStatus.CLOSED,
          updatedAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      // Si no existe el registro, retornar false
      return false;
    }
  }

  /**
   * Convierte modelo de Prisma a entidad de dominio
   *
   * CRÍTICO: Prisma retorna Decimal como tipo Decimal de Prisma.
   * Necesitamos convertir correctamente al Money Value Object.
   */
  private toDomain(prismaWallet: any): Wallet {
    const balance = Money.fromPersistence(prismaWallet.balance, prismaWallet.currency);

    return Wallet.fromPersistence({
      id: prismaWallet.id,
      userId: prismaWallet.userId,
      balance,
      status: prismaWallet.status as WalletStatus,
      createdAt: prismaWallet.createdAt,
      updatedAt: prismaWallet.updatedAt,
    });
  }
}
