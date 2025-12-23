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
import { prisma } from '../../infrastructure/database/prisma';

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
 * 3. Obtener platform fee desde PricingConfig (percentage o fixed)
 * 4. Crear Purchase entity con platform fee calculada
 * 5. Reservar producto (status: available -> reserved)
 * 6. Debit de Seller wallet (amount completo)
 * 7. Credit a Admin wallet (platform fee)
 * 8. Credit a Provider wallet (providerEarnings = price - platform fee)
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
 * - Platform fee es calculada desde PricingConfig (puede ser percentage o fixed)
 * - Flow de dinero: Seller -> (Platform fee a Admin + Resto a Provider)
 * - NO SE COBRAN comisiones de afiliado al provider
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

  // Default platform fee if no config is found (10%)
  private readonly DEFAULT_COMMISSION_RATE = 0.10;

  constructor(
    private walletRepository: IWalletRepository,
    private productRepository: IProductRepository,
    private purchaseRepository: IPurchaseRepository,
    private userRepository: IUserRepository,
    // NOTE: commissionConfigRepository removed - now using PricingConfig instead
  ) { }

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

    // NOTE: For profile-based products, multiple purchases are allowed
    // as long as there are available slots. Availability is validated
    // by the API route checking inventoryAccount.availableSlots.
    // The old validation below is commented out to support multi-slot products.

    // const existingPurchase = await this.purchaseRepository.findByProductId(
    //   data.productId
    // );
    // if (existingPurchase) {
    //   throw new Error('Product already sold');
    // }

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

    // ============================================
    // PASO 1: Encontrar o crear usuario admin
    // ============================================

    // Verificar si existe el usuario admin (por ID o por email)
    let adminUser = await this.userRepository.findById(this.ADMIN_USER_ID);

    if (!adminUser) {
      // Buscar por email por si existe con otro ID
      const adminEmail = Email.create('admin@streamsales.com');
      adminUser = await this.userRepository.findByEmail(adminEmail);
    }

    // Si no existe el usuario, crearlo
    if (!adminUser) {
      console.warn('[PurchaseProductUseCase] Admin user not found. Creating admin user...');

      const adminEmail = Email.create('admin@streamsales.com');
      const adminPassword = await Password.create('admin123'); // Password temporal

      adminUser = User.create({
        email: adminEmail,
        password: adminPassword,
        name: 'Administrator',
        role: 'admin',
      });

      await this.userRepository.save(adminUser);
      console.log('[PurchaseProductUseCase] Admin user created with ID:', adminUser.id);
    }

    // ============================================
    // PASO 2: Buscar o crear wallet del admin usando el ID real del usuario
    // ============================================

    let adminWallet = await this.walletRepository.findByUserId(adminUser.id);

    if (!adminWallet) {
      console.warn('[PurchaseProductUseCase] Admin wallet not found. Creating wallet for admin user ID:', adminUser.id);

      adminWallet = Wallet.create({ userId: adminUser.id });
      await this.walletRepository.save(adminWallet);
      console.log('[PurchaseProductUseCase] Admin wallet created successfully');
    }

    // ============================================
    // 3. OBTENER PLATFORM FEE DESDE PRICING CONFIG
    // ============================================

    // Get pricing configuration for platform fee (NOT affiliate commission)
    const pricingConfig = await (prisma as any).pricingConfig.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    // --- CALCULATIONS BASED ON THE NEW MODEL ---
    // 1. Calculate Distributor Markup (What is added to the base price for the market)
    let markupAmount: number = 0;
    let markupRate: number = 0;
    if (pricingConfig) {
      markupRate = parseFloat(pricingConfig.distributorMarkup.toString());
      if (pricingConfig.distributorMarkupType === 'percentage') {
        markupAmount = parseFloat(product.price.amount.toString()) * (markupRate / 100);
      } else {
        markupAmount = markupRate;
      }
    }

    // 2. Calculate Platform Fee (What is deducted from the provider's base price)
    let platformFeeAmount: number = 0;
    let platformFeeRate: number = 0;
    if (pricingConfig) {
      platformFeeRate = parseFloat(pricingConfig.platformFee.toString());
      if (pricingConfig.platformFeeType === 'percentage') {
        platformFeeAmount = parseFloat(product.price.amount.toString()) * (platformFeeRate / 100);
      } else {
        platformFeeAmount = platformFeeRate;
      }
    } else {
      // Fallback
      platformFeeRate = 10;
      platformFeeAmount = parseFloat(product.price.amount.toString()) * 0.10;
    }

    // 3. Final Amounts
    // The seller pays the "Market Price" (Base + Markup)
    const totalAmountToPay = parseFloat(product.price.amount.toString()) + markupAmount;
    const finalPricePaid = Money.create(totalAmountToPay, product.price.currency);

    // The admin takes BOTH the markup and the fee
    const totalAdminCommission = markupAmount + platformFeeAmount;

    // Calculate effective commission rate for the Purchase entity
    const dynamicCommissionRate = totalAmountToPay > 0 ? totalAdminCommission / totalAmountToPay : 0;

    console.log(`[PurchaseProductUseCase] Base: $${product.price.amount}, Markup: $${markupAmount.toFixed(2)}, Fee: $${platformFeeAmount.toFixed(2)}, Total Paid (Seller): $${totalAmountToPay.toFixed(2)}, Provider Gets: $${(parseFloat(product.price.amount.toString()) - platformFeeAmount).toFixed(2)}`);

    // ============================================
    // 4. CREAR PURCHASE
    // ============================================

    const purchase = Purchase.create({
      sellerId: data.sellerId,
      productId: data.productId,
      providerId: product.providerId,
      amount: finalPricePaid, // Marketplace Price (Base + Markup)
      commissionRate: dynamicCommissionRate,
      // New snapshots
      distributorMarkupAmount: Money.create(markupAmount),
      distributorMarkupType: pricingConfig?.distributorMarkupType || 'percentage',
      distributorMarkupRate: markupRate,
      platformFeeAmount: Money.create(platformFeeAmount),
      platformFeeType: pricingConfig?.platformFeeType || 'percentage',
      platformFeeRate: platformFeeRate,
      basePrice: product.price,
    });

    // ============================================
    // 5. EJECUTAR TRANSACCIONES DE DINERO
    // ============================================

    // Debit de Seller (paga el precio completo: base + fee)
    sellerWallet.debit(finalPricePaid);

    // Credit a Admin (comisión)
    adminWallet.credit(purchase.adminCommission);

    // Credit a Provider (ganancias = precio - comisión)
    providerWallet.credit(purchase.providerEarnings);

    // ============================================
    // 6. ACTUALIZAR ESTADO DEL PRODUCTO
    // ============================================

    // basée on inventory slot availability. For profile-based products, 
    // the product should remain active until all slots are sold.
    // The API route in /api/seller/purchases handles this logic.

    // Get seller details for transaction logs
    const seller = await this.userRepository.findById(data.sellerId);
    if (!seller) throw new Error(`Seller user ${data.sellerId} not found`);

    // ============================================
    // 7. PERSISTIR TODO EN TRANSACCIÓN DB
    // ============================================

    const resultTransaction = await prisma.$transaction(async (tx) => {
      // 1. Guardar Purchase (audit trail)
      const savedPurchase = await this.purchaseRepository.save(purchase);

      // 2. Guardar wallets actualizadas (Prisma standard update)
      const sellerWalletData = sellerWallet.toPersistence();
      const providerWalletData = providerWallet.toPersistence();
      const adminWalletData = adminWallet.toPersistence();

      await tx.wallet.update({
        where: { id: sellerWallet.id },
        data: { balance: sellerWalletData.balance, updatedAt: sellerWalletData.updatedAt }
      });

      await tx.wallet.update({
        where: { id: providerWallet.id },
        data: { balance: providerWalletData.balance, updatedAt: providerWalletData.updatedAt }
      });

      await tx.wallet.update({
        where: { id: adminWallet.id },
        data: { balance: adminWalletData.balance, updatedAt: adminWalletData.updatedAt }
      });

      // 3. Crear registros de Transacción (Logging)

      // Transaction para el Seller (Debit)
      await tx.transaction.create({
        data: {
          sourceWalletId: sellerWallet.id,
          amount: finalPricePaid.amount,
          type: 'debit',
          description: `Purchase: ${product.category.toUpperCase()}`,
          relatedEntityType: 'Purchase',
          relatedEntityId: savedPurchase.id,
          idempotencyKey: `purchase-${savedPurchase.id}-seller-debit`,
        }
      });

      // Transaction para el Provider (Credit)
      await tx.transaction.create({
        data: {
          destinationWalletId: providerWallet.id,
          amount: purchase.providerEarnings.amount,
          type: 'credit',
          description: `Sale: ${product.category.toUpperCase()} (Seller: ${seller.name})`,
          relatedEntityType: 'Purchase',
          relatedEntityId: savedPurchase.id,
          idempotencyKey: `purchase-${savedPurchase.id}-provider-credit`,
        }
      });

      // Transaction para el Admin (Commission Credit)
      await tx.transaction.create({
        data: {
          destinationWalletId: adminWallet.id,
          amount: purchase.adminCommission.amount,
          type: 'credit',
          description: `Platform Fee: ${product.category.toUpperCase()} (Purchase: ${savedPurchase.id})`,
          relatedEntityType: 'Purchase',
          relatedEntityId: savedPurchase.id,
          idempotencyKey: `purchase-${savedPurchase.id}-admin-commission`,
        }
      });

      return savedPurchase;
    });

    // ============================================
    // 8. RETORNAR RESULTADO
    // ============================================

    return {
      purchase: resultTransaction.toJSON(),
      product: {
        id: product.id,
        category: product.category,
        status: product.status.value,
        accountEmail: product.accountEmail,
        accountPassword: product.accountPassword,
      },
      walletBalance: sellerWallet.balance.toPlainString(),
    };
  }
}
