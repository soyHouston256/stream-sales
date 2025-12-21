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
    console.log('🌱 Sembrando datos iniciales...\n');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
        data: {
            email: 'admin@streamsales.com',
            name: 'Administrador',
            username: 'admin',
            password: adminPassword,
            role: 'admin',
            countryCode: 'PE',
            phoneNumber: '999999999',
            wallet: {
                create: {
                    balance: 0,
                    currency: 'USD',
                    status: 'active',
                },
            },
        },
    });
    console.log('✅ Admin creado:', admin.email);

    // Create provider user
    const providerPassword = await bcrypt.hash('provider123', 10);
    const provider = await prisma.user.create({
        data: {
            email: 'provider@streamsales.com',
            name: 'Proveedor Demo',
            username: 'provider',
            password: providerPassword,
            role: 'provider',
            countryCode: 'PE',
            phoneNumber: '888888888',
            wallet: {
                create: {
                    balance: 0,
                    currency: 'USD',
                    status: 'active',
                },
            },
            providerProfile: {
                create: {
                    status: 'approved',
                },
            },
        },
    });
    console.log('✅ Provider creado:', provider.email);

    // Create seller user with wallet
    const sellerPassword = await bcrypt.hash('seller123', 10);
    const seller = await prisma.user.create({
        data: {
            email: 'seller@streamsales.com',
            name: 'Vendedor Demo',
            username: 'seller',
            password: sellerPassword,
            role: 'seller',
            countryCode: 'PE',
            phoneNumber: '777777777',
            wallet: {
                create: {
                    balance: 100.00, // Starting balance
                    currency: 'USD',
                    status: 'active',
                },
            },
        },
    });
    console.log('✅ Seller creado:', seller.email, '- Balance: $100.00');

    // Create affiliate user with wallet
    const affiliatePassword = await bcrypt.hash('affiliate123', 10);
    const affiliate = await prisma.user.create({
        data: {
            email: 'affiliate@streamsales.com',
            name: 'Afiliado Demo',
            username: 'affiliate',
            password: affiliatePassword,
            role: 'affiliate',
            countryCode: 'PE',
            phoneNumber: '666666666',
            wallet: {
                create: {
                    balance: 150.00, // Starting balance
                    currency: 'USD',
                    status: 'active',
                },
            },
            affiliateProfile: {
                create: {
                    referralCode: 'AFFILIATE2024',
                    status: 'approved',
                    applicationNote: 'Usuario de demostración',
                },
            },
        },
    });
    console.log('✅ Affiliate creado:', affiliate.email, '- Balance: $150.00');

    // Create commission config for sales
    const saleCommission = await prisma.commissionConfig.create({
        data: {
            type: 'sale',
            rate: 15.0,
            isActive: true,
        },
    });
    console.log('✅ Configuración de comisión de venta creada: 15%');

    // Create commission config for registration
    const registrationCommission = await prisma.commissionConfig.create({
        data: {
            type: 'registration',
            rate: 5.0, // This is actually a fixed amount, but stored as rate
            isActive: true,
        },
    });
    console.log('✅ Configuración de comisión de registro creada: $5.00');

    // Create referral approval config
    const referralConfig = await prisma.referralApprovalConfig.create({
        data: {
            approvalFee: 10.0,
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
            rate: 3.75,
            isActive: true,
        },
    });
    console.log('✅ Tipo de cambio creado para Perú (1 USD = 3.75 PEN)');

    console.log('\n✨ Reset completado exitosamente!\n');
    console.log('📋 Credenciales de acceso:\n');
    console.log('👨‍💼 Admin:');
    console.log('   Email: admin@streamsales.com');
    console.log('   Password: admin123\n');
    console.log('🏭 Provider:');
    console.log('   Email: provider@streamsales.com');
    console.log('   Password: provider123\n');
    console.log('🛒 Seller:');
    console.log('   Email: seller@streamsales.com');
    console.log('   Password: seller123');
    console.log('   Wallet: $100.00\n');
    console.log('🤝 Affiliate:');
    console.log('   Email: affiliate@streamsales.com');
    console.log('   Password: affiliate123');
    console.log('   Wallet: $150.00');
    console.log('   Referral Code: AFFILIATE2024\n');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
