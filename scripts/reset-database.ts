import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Limpiando base de datos...\n');

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

    console.log('✅ Base de datos limpiada\n');
    console.log('🌱 Sembrando configuraciones iniciales...\n');

    // Create commission config for sales
    const saleCommission = await prisma.commissionConfig.create({
        data: {
            type: 'sale',
            rate: 15.0,
            isActive: true,
        },
    });
    console.log('✅ Configuración de comisión de venta creada: 15%');

    // Create // Pricing configuration
    const pricingConfig = await prisma.pricingConfig.create({
        data: {
            distributorMarkup: 15.0,
            distributorMarkupType: 'percentage',
            platformFee: 10.0,
            platformFeeType: 'percentage',
            isActive: true,
        },
    });
    console.log('✅ Configuración de precios creada: Markup 15%, Fee 10%');

    // Create referral approval config
    const referralConfig = await prisma.referralApprovalConfig.create({
        data: {
            approvalFee: 1.0,
            isActive: true,
        },
    });
    console.log('✅ Configuración de aprobación de referidos creada: $10.00');

    // Create exchange rate for Peru
    const exchangeRate = await prisma.exchangeRate.create({
        data: {
            countryCode: 'PE',
            countryName: 'Perú',
            currencyCode: 'PEN',
            currencyName: 'Sol Peruano',
            rate: 3.60,
            isActive: true,
        },
    });
    console.log('✅ Tipo de cambio creado para Perú (1 USD = 3.60 PEN)');

    console.log('\n✨ Reset completado exitosamente!');
    console.log('📋 Base de datos limpia y lista para usar.\n');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
