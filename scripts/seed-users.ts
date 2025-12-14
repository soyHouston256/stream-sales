import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const users = [
        {
            email: 'seller@streamsales.com',
            password: 'Password@123',
            role: 'seller',
            name: 'Seller User',
            countryCode: 'PE', // Peru
        },
        {
            email: 'provider@streamsales.com',
            password: 'Password@123',
            role: 'provider',
            name: 'Provider User',
        },
        {
            email: 'payment@streamsales.com',
            password: 'Password@123',
            role: 'payment_validator',
            name: 'Payment Validator',
            countryCode: 'PE', // Peru - must match seller country
        },
        {
            email: 'conciliator@streamsales.com',
            password: 'conciliator123',
            role: 'conciliator',
            name: 'Conciliator User',
        },
        {
            email: 'admin@streamsales.com',
            password: 'admiN@123',
            role: 'admin',
            name: 'Admin User',
        },
        {
            email: 'affiliate@streamsales.com',
            password: 'Password@123',
            role: 'affiliate',
            name: 'Affiliate User',
            countryCode: 'PE', // Peru
        },
    ];

    console.log('Seeding users...');

    for (const user of users) {
        const hashedPassword = await bcrypt.hash(user.password, 10);

        const upsertedUser = await prisma.user.upsert({
            where: { email: user.email },
            update: {
                password: hashedPassword,
                role: user.role,
                name: user.name,
                countryCode: (user as any).countryCode,
            },
            create: {
                email: user.email,
                password: hashedPassword,
                role: user.role,
                name: user.name,
                countryCode: (user as any).countryCode,
            },
        });

        // Create wallet for user if it doesn't exist
        await prisma.wallet.upsert({
            where: { userId: upsertedUser.id },
            update: {},
            create: {
                userId: upsertedUser.id,
                balance: 0,
                currency: 'USD',
            },
        });

        // Create affiliate profile if role is affiliate
        if (user.role === 'affiliate') {
            await prisma.affiliateProfile.upsert({
                where: { userId: upsertedUser.id },
                update: {},
                create: {
                    userId: upsertedUser.id,
                    referralCode: `REF-${upsertedUser.id.substring(0, 8).toUpperCase()}`,
                    status: 'active',
                },
            });
        }

        console.log(`User ${user.email} seeded with role ${user.role}`);
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
