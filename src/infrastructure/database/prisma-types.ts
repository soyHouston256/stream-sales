import { Prisma } from '@prisma/client';

/**
 * Prisma Types
 * 
 * Tipos tipados para resultados de queries de Prisma con includes específicos.
 * Estos tipos reemplazan el uso de `any` en los repositorios y rutas API.
 */

// ============================================
// DISPUTE TYPES
// ============================================

/**
 * Tipo para Dispute con todas las relaciones comunes
 */
export type DisputeWithRelations = Prisma.DisputeGetPayload<{
  include: {
    order: {
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: { id: true; name: true; category: true };
                };
              };
            };
          };
        };
      };
    };
    seller: { select: { id: true; name: true; email: true } };
    provider: { select: { id: true; name: true; email: true } };
    conciliator: { select: { id: true; name: true; email: true } };
  };
}>;

/**
 * Tipo para disputas con estadísticas de resolución
 */
export type DisputeForStats = Prisma.DisputeGetPayload<{
  select: { assignedAt: true; resolvedAt: true };
}>;

// ============================================
// DISPUTE MESSAGE TYPES
// ============================================

export type DisputeMessageWithSender = Prisma.DisputeMessageGetPayload<{
  include: {
    sender: { select: { id: true; name: true; email: true; role: true } };
  };
}>;

// ============================================
// PRODUCT TYPES
// ============================================

/**
 * Tipo para Product con variants
 */
export type ProductWithVariants = Prisma.ProductGetPayload<{
  include: { variants: true };
}>;

/**
 * Tipo para Product con todas las relaciones de inventario
 */
export type ProductWithInventory = Prisma.ProductGetPayload<{
  include: {
    variants: true;
    inventoryAccounts: {
      include: {
        slots: true;
      };
    };
    inventoryLicenses: true;
    digitalContents: true;
  };
}>;

/**
 * Tipo para Product en el marketplace
 */
export type MarketplaceProduct = Prisma.ProductGetPayload<{
  include: {
    variants: true;
    provider: {
      select: { id: true; name: true };
    };
  };
}>;

// ============================================
// ORDER TYPES
// ============================================

/**
 * Tipo para Order con items
 */
export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        variant: {
          include: { product: true };
        };
      };
    };
  };
}>;

/**
 * Tipo para OrderItem con variant y order
 */
export type OrderItemWithVariant = Prisma.OrderItemGetPayload<{
  include: {
    variant: true;
    order: true;
  };
}>;

/**
 * Tipo para OrderItem con todas las relaciones para credenciales
 */
export type OrderItemWithCredentials = Prisma.OrderItemGetPayload<{
  include: {
    variant: {
      include: {
        product: {
          include: {
            inventoryAccounts: {
              include: { slots: true };
            };
            inventoryLicenses: true;
            digitalContents: true;
          };
        };
      };
    };
    assignedSlot: {
      include: { account: true };
    };
    assignedLicense: true;
    assignedContent: true;
  };
}>;

// ============================================
// WALLET & TRANSACTION TYPES
// ============================================

/**
 * Tipo para Wallet con usuario
 */
export type WalletWithUser = Prisma.WalletGetPayload<{
  include: { user: true };
}>;

/**
 * Tipo para Transaction con wallets
 */
export type TransactionWithWallets = Prisma.TransactionGetPayload<{
  include: {
    sourceWallet: { include: { user: true } };
    destinationWallet: { include: { user: true } };
  };
}>;

/**
 * Tipo para Transaction básica
 */
export type TransactionBasic = Prisma.TransactionGetPayload<{
  include: {
    sourceWallet: { include: { user: { select: { name: true; email: true } } } };
    destinationWallet: { include: { user: { select: { name: true; email: true } } } };
  };
}>;

// ============================================
// RECHARGE TYPES
// ============================================

/**
 * Tipo para Recharge con wallet y usuario
 */
export type RechargeWithWallet = Prisma.RechargeGetPayload<{
  include: {
    wallet: {
      include: {
        user: { select: { id: true; name: true; email: true } };
      };
    };
  };
}>;

/**
 * Tipo para Recharge con metadata
 */
export type RechargeWithMetadata = Prisma.RechargeGetPayload<{
  select: {
    id: true;
    amount: true;
    status: true;
    paymentMethod: true;
    metadata: true;
    createdAt: true;
    completedAt: true;
  };
}>;

// ============================================
// WITHDRAWAL TYPES
// ============================================

/**
 * Tipo para Withdrawal con relaciones
 */
export type WithdrawalWithRelations = Prisma.WithdrawalGetPayload<{
  include: {
    wallet: {
      include: {
        user: { select: { id: true; name: true; email: true } };
      };
    };
    processedByUser: { select: { id: true; name: true; email: true } };
  };
}>;

// ============================================
// USER TYPES
// ============================================

/**
 * Tipo para User con perfiles
 */
export type UserWithProfiles = Prisma.UserGetPayload<{
  include: {
    wallet: true;
    affiliateProfile: true;
    providerProfile: true;
    paymentValidatorProfile: true;
  };
}>;

/**
 * Tipo para User básico (listados)
 */
export type UserBasic = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    role: true;
    createdAt: true;
  };
}>;

// ============================================
// AFFILIATE TYPES
// ============================================

/**
 * Tipo para AffiliateProfile con usuario
 */
export type AffiliateProfileWithUser = Prisma.AffiliateProfileGetPayload<{
  include: {
    user: { select: { id: true; name: true; email: true } };
  };
}>;

/**
 * Tipo para Affiliation con usuarios
 */
export type AffiliationWithUsers = Prisma.AffiliationGetPayload<{
  include: {
    affiliate: { select: { id: true; name: true; email: true } };
    referredUser: { select: { id: true; name: true; email: true; role: true } };
  };
}>;

// ============================================
// COMMISSION CONFIG TYPES
// ============================================

export type CommissionConfigBasic = Prisma.CommissionConfigGetPayload<{
  select: {
    id: true;
    type: true;
    rate: true;
    isActive: true;
    effectiveFrom: true;
    createdAt: true;
  };
}>;

// ============================================
// VALIDATOR TYPES
// ============================================

/**
 * Tipo para ValidatorAdminTransfer con relaciones
 */
export type ValidatorTransferWithRelations = Prisma.ValidatorAdminTransferGetPayload<{
  include: {
    validator: { select: { id: true; name: true; email: true } };
    processedByUser: { select: { id: true; name: true; email: true } };
    fundEntries: true;
  };
}>;

/**
 * Tipo para ValidatorFundEntry
 */
export type ValidatorFundEntryWithRecharge = Prisma.ValidatorFundEntryGetPayload<{
  include: {
    recharge: {
      include: {
        wallet: {
          include: { user: { select: { name: true; email: true } } };
        };
      };
    };
  };
}>;

// ============================================
// INVENTORY TYPES
// ============================================

/**
 * Tipo para InventoryAccount con slots
 */
export type InventoryAccountWithSlots = Prisma.InventoryAccountGetPayload<{
  include: { slots: true };
}>;

/**
 * Tipo para InventorySlot
 */
export type InventorySlotBasic = Prisma.InventorySlotGetPayload<{
  select: {
    id: true;
    profileName: true;
    pinCode: true;
    status: true;
  };
}>;
