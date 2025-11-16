import { IWalletRepository } from '../../domain/repositories/IWalletRepository';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { IPurchaseRepository } from '../../domain/repositories/IPurchaseRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { Purchase } from '../../domain/entities/Purchase';
import { Money } from '../../domain/value-objects/Money';
import { Wallet } from '../../domain/entities/Wallet';
import { User } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { Password } from '../../domain/value-objects/Password';

/**
 * PurchaseProductUseCase
 *
 * Coordina la compra de un producto digital en el marketplace.
 *
 * Este es el Use Case MÁS COMPLEJO porque coordina 3 aggregates:
 * - Wallet (Seller, Provider, Admin)
 * - Product (cambio de estado)
 * - Purchase (creación de registro)
 *
 * Flow de negocio:
 * 1. Validar que el producto existe y está disponible
 * 2. Validar que el seller tiene saldo suficiente
 * 3. Obtener commission rate (actualmente hardcoded 5%)
 * 4. Crear Purchase entity con comisión calculada
 * 5. Reservar producto (status: available -> reserved)
 * 6. Debit de Seller wallet (amount completo)
 * 7. Credit a Admin wallet (adminCommission)
 * 8. Credit a Provider wallet (providerEarnings)
 * 9. Marcar producto como SOLD
 * 10. Guardar Purchase (audit trail)
 * 11. Guardar todas las wallets actualizadas
 *
 * IMPORTANTE: En producción esto debe estar en una transacción de base de datos
 * para garantizar atomicidad (all-or-nothing).
 *
 * Reglas de negocio:
 * - Un producto solo se puede vender UNA vez (productId unique en Purchase)
 * - Seller debe tener saldo suficiente
 * - Commission rate es un snapshot del momento de compra
 * - Flow de dinero: Seller -> (Admin + Provider)
 * - Si algo falla, todo se revierte (transacción)
 *
 * @example
 * const useCase = new PurchaseProductUseCase(walletRepo, productRepo, purchaseRepo);
 * const result = await useCase.execute({
 *   sellerId: 'user123',
 *   productId: 'prod456'
 * });
 * console.log(result.purchase.amount); // "15.9900"
 * console.log(result.purchase.adminCommission); // "0.7995"
 */

export interface PurchaseProductDTO {
  sellerId: string; // Usuario que compra
  productId: string; // Producto a comprar
}

export interface PurchaseProductResponse {
  purchase: {
    id: string;
    sellerId: string;
    productId: string;
    amount: string;
    currency: string;
    adminCommission: string;
    providerEarnings: string;
    commissionRate: number;
    commissionPercentage: string;
    createdAt: Date;
  };
  product: {
    id: string;
    category: string;
    status: string;
    accountEmail: string;
    accountPassword: string; // Ahora el seller puede acceder a las credenciales
  };
  walletBalance: string; // Nuevo balance del seller después de la compra
}

export class PurchaseProductUseCase {
  // Admin user ID (en producción vendría de configuración)
  private readonly ADMIN_USER_ID = 'admin';

  // Commission rate (en producción vendría de CommissionConfig)
  private readonly COMMISSION_RATE = 0.05; // 5%

  constructor(
    private walletRepository: IWalletRepository,
    private productRepository: IProductRepository,
    private purchaseRepository: IPurchaseRepository,
    private userRepository: IUserRepository
  ) {}

  async execute(data: PurchaseProductDTO): Promise<PurchaseProductResponse> {
    // ============================================
    // 1. VALIDAR PRODUCTO
    // ============================================

    const product = await this.productRepository.findById(data.productId);

    if (!product) {
      throw new Error('Product not found');
    }

    if (!product.status.canBePurchased()) {
      throw new Error(
        `Product cannot be purchased. Current status: ${product.status.value}`
      );
    }

    // Validar que el producto no haya sido vendido ya
    const existingPurchase = await this.purchaseRepository.findByProductId(
      data.productId
    );

    if (existingPurchase) {
      throw new Error('Product already sold');
    }

    // ============================================
    // 2. VALIDAR WALLETS
    // ============================================

    // Seller wallet (quien compra)
    const sellerWallet = await this.walletRepository.findByUserId(data.sellerId);

    if (!sellerWallet) {
      throw new Error('Seller wallet not found');
    }

    // Verificar saldo suficiente
    if (!sellerWallet.hasSufficientBalance(product.price)) {
      throw new Error(
        `Insufficient balance. Required: ${product.price.toString()}, Available: ${sellerWallet.balance.toString()}`
      );
    }

    // Provider wallet (dueño del producto)
    const providerWallet = await this.walletRepository.findByUserId(
      product.providerId
    );

    if (!providerWallet) {
      throw new Error('Provider wallet not found');
    }

    // Admin wallet (recibe comisiones)
    let adminWallet = await this.walletRepository.findByUserId(
      this.ADMIN_USER_ID
    );

    // Auto-crear usuario admin y wallet si no existe (para facilitar desarrollo)
    if (!adminWallet) {
      console.warn('[PurchaseProductUseCase] Admin wallet not found. Creating admin user and wallet automatically...');

      // Verificar si existe el usuario admin
      let adminUser = await this.userRepository.findById(this.ADMIN_USER_ID);

      // Si no existe el usuario, crearlo
      if (!adminUser) {
        const adminEmail = Email.create('admin@streamsales.com');
        const adminPassword = await Password.create('admin123'); // Password temporal

        adminUser = User.create({
          id: this.ADMIN_USER_ID,
          email: adminEmail,
          password: adminPassword,
          name: 'Administrator',
          role: 'admin',
        });

        await this.userRepository.save(adminUser);
        console.log('[PurchaseProductUseCase] Admin user created');
      }

      // Crear wallet para el admin
      adminWallet = Wallet.create({ userId: this.ADMIN_USER_ID });
      await this.walletRepository.save(adminWallet);
      console.log('[PurchaseProductUseCase] Admin wallet created successfully');
    }

    // ============================================
    // 3. CREAR PURCHASE
    // ============================================

    const purchase = Purchase.create({
      sellerId: data.sellerId,
      productId: data.productId,
      amount: product.price,
      commissionRate: this.COMMISSION_RATE,
    });

    // ============================================
    // 4. EJECUTAR TRANSACCIONES DE DINERO
    // ============================================

    // Debit de Seller (paga el precio completo)
    sellerWallet.debit(product.price);

    // Credit a Admin (comisión)
    adminWallet.credit(purchase.adminCommission);

    // Credit a Provider (ganancias = precio - comisión)
    providerWallet.credit(purchase.providerEarnings);

    // ============================================
    // 5. ACTUALIZAR ESTADO DEL PRODUCTO
    // ============================================

    // Primero reservar
    product.reserve();

    // Luego marcar como vendido
    product.markAsSold(data.sellerId);

    // ============================================
    // 6. PERSISTIR TODO (IDEALMENTE EN TRANSACCIÓN DB)
    // ============================================

    // TODO: Envolver en transacción de base de datos cuando esté disponible
    // await prisma.$transaction([...])

    // Guardar Purchase (audit trail)
    const savedPurchase = await this.purchaseRepository.save(purchase);

    // Guardar Product actualizado
    await this.productRepository.save(product);

    // Guardar wallets actualizadas
    await this.walletRepository.save(sellerWallet);
    await this.walletRepository.save(providerWallet);
    await this.walletRepository.save(adminWallet);

    // ============================================
    // 7. RETORNAR RESULTADO
    // ============================================

    return {
      purchase: savedPurchase.toJSON(),
      product: {
        id: product.id,
        category: product.category,
        status: product.status.value,
        accountEmail: product.accountEmail,
        accountPassword: product.accountPassword, // Ahora el seller tiene acceso
      },
      walletBalance: sellerWallet.balance.toPlainString(),
    };
  }
}
