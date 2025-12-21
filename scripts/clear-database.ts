import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Limpiando todos los datos de la base de datos...\n');

    try {
        // Delete all data in the correct order to respect foreign keys
        await prisma.$transaction([
            // Delete dispute-related data
            prisma.disputeMessage.deleteMany(),
            prisma.dispute.deleteMany(),

            // Delete audit logs
            prisma.auditLog.deleteMany(),

            // Delete order-related data
            prisma.orderItem.deleteMany(),
            prisma.order.deleteMany(),

            // Delete inventory
            prisma.inventorySlot.deleteMany(),
            prisma.inventoryAccount.deleteMany(),
            prisma.inventoryLicense.deleteMany(),
            prisma.digitalContent.deleteMany(),

            // Delete products and variants
            prisma.productVariant.deleteMany(),
            prisma.product.deleteMany(),

            // Delete wallet transactions
            prisma.transaction.deleteMany(),

            // Delete recharge and withdrawal-related data
            prisma.validatorFundEntry.deleteMany(),
            prisma.validatorAdminTransfer.deleteMany(),
            prisma.recharge.deleteMany(),
            prisma.withdrawal.deleteMany(),

            // Delete wallets
            prisma.wallet.deleteMany(),

            // Delete payment methods
            prisma.paymentMethodConfig.deleteMany(),
            prisma.adminPaymentMethod.deleteMany(),

            // Delete exchange rates
            prisma.exchangeRate.deleteMany(),

            // Delete referrals and affiliate data
            prisma.affiliation.deleteMany(),
            prisma.affiliateProfile.deleteMany(),

            // Delete provider and validator profiles
            prisma.providerProfile.deleteMany(),
            prisma.paymentValidatorProfile.deleteMany(),

            // Delete configuration
            prisma.commissionConfig.deleteMany(),
            prisma.referralApprovalConfig.deleteMany(),

            // Finally delete users
            prisma.user.deleteMany(),
        ]);

        console.log('✅ Todos los datos han sido eliminados exitosamente');
        console.log('📊 La estructura de las tablas permanece intacta\n');
    } catch (error) {
        console.error('❌ Error al limpiar la base de datos:', error);
        process.exit(1);
    }
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
