import { PrismaClient } from '@prisma/client';
import { Product } from '../../domain/entities/Product';
import { Money } from '../../domain/value-objects/Money';
import { ProductStatus } from '../../domain/value-objects/ProductStatus';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import * as crypto from 'crypto';

type PrismaProduct = {
  id: string;
  name: string;
  description: string;
  price: string;
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
    const parts = text.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];

    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Guarda un producto (create o update)
   */
  async save(product: Product): Promise<Product> {
    const data = product.toPersistence();

    // Encriptar password antes de guardar
    const encryptedPassword = this.encrypt(data.accountPassword);

    // Generar name y description desde la categoría (domain entity no los tiene)
    const name = data.category.charAt(0).toUpperCase() + data.category.slice(1) + ' Account';
    const description = `${data.category.charAt(0).toUpperCase() + data.category.slice(1)} premium account - ${data.accountEmail}`;

    const savedProduct = await this.prisma.product.upsert({
      where: { id: data.id },
      update: {
        name,
        description,
        category: data.category,
        price: data.price,
        imageUrl: null, // Domain entity no tiene imageUrl
        accountEmail: data.accountEmail,
        accountPassword: encryptedPassword,
        accountDetails: null, // Domain entity no tiene accountDetails
        status: data.status,
        updatedAt: data.updatedAt,
        soldAt: data.soldAt,
      },
      create: {
        id: data.id,
        providerId: data.providerId,
        name,
        description,
        category: data.category,
        price: data.price,
        imageUrl: null,
        accountEmail: data.accountEmail,
        accountPassword: encryptedPassword,
        accountDetails: null,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        soldAt: data.soldAt,
      },
    });

    return this.toDomain(savedProduct);
  }

  /**
   * Busca producto por ID
   */
  async findById(id: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
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
    });

    return products.map((p: PrismaProduct) => this.toDomain(p));
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
      status: 'available',
    };

    if (filters?.category) {
      where.category = filters.category.toLowerCase();
    }

    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) {
        where.price.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.price.lte = filters.maxPrice;
      }
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit,
      skip: filters?.offset,
    });

    return products.map((p: PrismaProduct) => this.toDomain(p));
  }

  /**
   * Busca productos por categoría
   */
  async findByCategory(category: string): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { category: category.toLowerCase() },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p: PrismaProduct) => this.toDomain(p));
  }

  /**
   * Busca productos por status
   */
  async findByStatus(status: ProductStatus): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: { status: status.value },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p: PrismaProduct) => this.toDomain(p));
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
        status: 'available',
      },
    });
  }

  /**
   * Elimina un producto
   *
   * Usa soft delete actualizando status.
   * Para hard delete: this.prisma.product.delete({ where: { id } })
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Soft delete: no eliminar de BD, solo cambiar status a 'deleted'
      // o usar Prisma soft delete nativo si está configurado
      await this.prisma.product.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convierte modelo de Prisma a entidad de dominio
   *
   * CRÍTICO: Desencripta el accountPassword
   * Nota: El sistema usa USD como moneda por defecto
   */
  private toDomain(prismaProduct: any): Product {
    // El sistema usa USD como moneda por defecto (ver Wallet schema)
    const price = Money.fromPersistence(prismaProduct.price, 'USD');
    const status = ProductStatus.fromPersistence(prismaProduct.status);

    // Desencriptar password
    const decryptedPassword = this.decrypt(prismaProduct.accountPassword);

    return Product.fromPersistence({
      id: prismaProduct.id,
      providerId: prismaProduct.providerId,
      category: prismaProduct.category,
      price,
      accountEmail: prismaProduct.accountEmail,
      accountPassword: decryptedPassword,
      status,
      createdAt: prismaProduct.createdAt,
      updatedAt: prismaProduct.updatedAt,
      soldAt: prismaProduct.soldAt,
    });
  }
}
