import { PrismaClient, Prisma } from '@prisma/client';
import { Product } from '../../domain/entities/Product';
import { Money } from '../../domain/value-objects/Money';
import { ProductStatus } from '../../domain/value-objects/ProductStatus';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import * as crypto from 'crypto';

type PrismaProduct = {
  id: string;
  name: string;
  description: string;
  price: Prisma.Decimal;
  providerId: string;
  category: string;
  accountEmail: string;
  accountPassword: string;
  accountDetails: any;
  imageUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  soldAt: Date | null;
};

/**
 * PrismaProductRepository
 *
 * Implementación de IProductRepository usando Prisma ORM.
 *
 * Responsabilidades:
 * - Convertir entre domain entities y Prisma models
 * - Ejecutar queries contra PostgreSQL
 * - Encriptar/desencriptar accountPassword
 * - Manejar errores de persistencia
 *
 * SEGURIDAD CRÍTICA:
 * - accountPassword SIEMPRE se almacena encriptado en BD
 * - Se usa AES-256-CBC para encriptación
 * - La clave de encriptación viene de process.env.ENCRYPTION_KEY
 *
 * NO debe contener lógica de negocio - solo persistencia.
 */
export class PrismaProductRepository implements IProductRepository {
  // Encryption configuration
  private readonly ALGORITHM = 'aes-256-cbc';
  private readonly ENCRYPTION_KEY: Buffer;
  private readonly IV_LENGTH = 16; // For AES, this is always 16

  constructor(private prisma: PrismaClient) {
    // Initialize encryption key from environment variable
    // In production, this should be a secure 32-byte key
    const key = process.env.ENCRYPTION_KEY || 'default-insecure-key-change-this-in-production-32bytes';

    // Ensure key is exactly 32 bytes for AES-256
    this.ENCRYPTION_KEY = Buffer.alloc(32);
    const keyBuffer = Buffer.from(key, 'utf-8');
    keyBuffer.copy(this.ENCRYPTION_KEY, 0, 0, Math.min(32, keyBuffer.length));
  }

  /**
   * Encripta el password usando AES-256-CBC
   */
  private encrypt(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Retornar IV + encrypted data (separados por :)
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Desencripta el password
   */
  private decrypt(text: string): string {
    if (!text) return '';
    const parts = text.split(':');

    // Si no tiene el formato esperado (iv:encrypted), asumir texto plano
    if (parts.length !== 2) {
      return text;
    }

    try {
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];

      const decipher = crypto.createDecipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // Si falla la desencriptación, asumir que es texto plano
      console.warn('Failed to decrypt password, returning as-is:', error);
      return text;
    }
  }

  /**
   * Guarda un producto (create o update)
   * Maps Domain Product -> DB Product + Variant + InventoryAccount
   */
  async save(product: Product): Promise<Product> {
    const data = product.toPersistence();

    // Encriptar password antes de guardar
    const encryptedPassword = this.encrypt(data.accountPassword);

    // Generar name y description
    const name = data.category.charAt(0).toUpperCase() + data.category.slice(1) + ' Account';
    const description = `${data.category.charAt(0).toUpperCase() + data.category.slice(1)} premium account - ${data.accountEmail}`;

    // Transaction to ensure consistency
    const savedProduct = await this.prisma.$transaction(async (tx) => {
      // 1. Upsert Product
      const p = await tx.product.upsert({
        where: { id: data.id },
        update: {
          name,
          description,
          category: data.category,
          isActive: data.status === 'available', // Map status to isActive
          updatedAt: data.updatedAt,
        },
        create: {
          id: data.id,
          providerId: data.providerId,
          name,
          description,
          category: data.category,
          isActive: data.status === 'available',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
      });

      // 2. Upsert Variant (Price)
      // Assuming 1 variant per product for now
      // We need to find existing variant or create new
      const existingVariant = await tx.productVariant.findFirst({
        where: { productId: p.id },
      });

      if (existingVariant) {
        await tx.productVariant.update({
          where: { id: existingVariant.id },
          data: {
            price: data.price,
            name: 'Standard License',
          },
        });
      } else {
        await tx.productVariant.create({
          data: {
            productId: p.id,
            name: 'Standard License',
            price: data.price,
            durationDays: 30,
          },
        });
      }

      // 3. Upsert InventoryAccount (Credentials)
      const existingAccount = await tx.inventoryAccount.findFirst({
        where: { productId: p.id },
      });

      if (existingAccount) {
        await tx.inventoryAccount.update({
          where: { id: existingAccount.id },
          data: {
            email: data.accountEmail,
            passwordHash: encryptedPassword,
            platformType: data.category,
          },
        });
      } else {
        await tx.inventoryAccount.create({
          data: {
            productId: p.id,
            email: data.accountEmail,
            passwordHash: encryptedPassword,
            platformType: data.category,
            totalSlots: 1,
            availableSlots: 1,
          },
        });
      }

      // Return full structure for toDomain
      return tx.product.findUnique({
        where: { id: p.id },
        include: {
          variants: true,
          inventoryAccounts: true,
        },
      });
    });

    if (!savedProduct) throw new Error('Failed to save product');
    return this.toDomain(savedProduct);
  }

  /**
   * Busca producto por ID
   */
  async findById(id: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        inventoryAccounts: true,
      },
    });

    return product ? this.toDomain(product) : null;
  }

  /**
   * Lista productos de un provider
   */
  async findByProviderId(providerId: string): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { providerId },
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true,
        inventoryAccounts: true,
      },
    });

    return products.map((p: any) => this.toDomain(p));
  }

  /**
   * Lista productos disponibles con filtros
   */
  async findAvailable(filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    const where: any = {
      isActive: true,
    };

    if (filters?.category) {
      where.category = filters.category.toLowerCase();
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.variants = {
        some: {
          price: {},
        },
      };
      if (filters.minPrice !== undefined) {
        where.variants.some.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.variants.some.price.lte = filters.maxPrice;
      }
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit,
      skip: filters?.offset,
      include: {
        variants: true,
        inventoryAccounts: true,
      },
    });

    return products.map((p: any) => this.toDomain(p));
  }

  /**
   * Busca productos por categoría
   */
  async findByCategory(category: string): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { category: category.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true,
        inventoryAccounts: true,
      },
    });

    return products.map((p: any) => this.toDomain(p));
  }

  /**
   * Busca productos por status
   */
  async findByStatus(status: ProductStatus): Promise<Product[]> {
    const isActive = status.isAvailable();
    const products = await this.prisma.product.findMany({
      where: { isActive },
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true,
        inventoryAccounts: true,
      },
    });

    return products.map((p: any) => this.toDomain(p));
  }

  /**
   * Cuenta productos de un provider
   */
  async countByProviderId(providerId: string): Promise<number> {
    return this.prisma.product.count({
      where: { providerId },
    });
  }

  /**
   * Cuenta productos disponibles por categoría
   */
  async countAvailableByCategory(category: string): Promise<number> {
    return this.prisma.product.count({
      where: {
        category: category.toLowerCase(),
        isActive: true,
      },
    });
  }

  /**
   * Elimina un producto
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convierte modelo de Prisma a entidad de dominio
   */
  private toDomain(prismaProduct: any): Product {
    const variant = prismaProduct.variants?.[0];
    const account = prismaProduct.inventoryAccounts?.[0];

    // Price fallback
    const priceAmount = variant ? variant.price : new Prisma.Decimal(0);
    const price = Money.fromPersistence(priceAmount, 'USD');

    // Status mapping
    // If isActive is true -> available
    // If isActive is false -> suspended (or sold, but we don't track sold on Product anymore)
    const statusStr = prismaProduct.isActive ? 'available' : 'suspended';
    const status = ProductStatus.fromPersistence(statusStr);

    // Credentials
    const accountEmail = account ? account.email : '';
    const encryptedPassword = account ? account.passwordHash : '';
    const decryptedPassword = this.decrypt(encryptedPassword);

    return Product.fromPersistence({
      id: prismaProduct.id,
      providerId: prismaProduct.providerId,
      category: prismaProduct.category,
      price,
      accountEmail,
      accountPassword: decryptedPassword,
      status,
      createdAt: prismaProduct.createdAt,
      updatedAt: prismaProduct.updatedAt,
      // soldAt: null, // Not tracked on Product anymore
    });
  }
}
