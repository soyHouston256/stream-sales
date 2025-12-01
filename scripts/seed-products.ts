import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIES = [
    'streaming',
    'license',
    'course',
    'ebook',
    'ai',
    'netflix',
    'spotify',
    'hbo',
    'disney',
    'prime',
    'youtube',
    'other',
] as const;

async function main() {
    console.log('🌱 Seeding mock products...');

    // 1. Find or create a provider
    let provider = await prisma.user.findFirst({
        where: { role: 'provider' },
    });

    if (!provider) {
        console.log('⚠️ No provider found. Creating mock provider...');
        const hashedPassword = await hash('password123', 10);
        provider = await prisma.user.create({
            data: {
                email: 'mock-provider@example.com',
                password: hashedPassword,
                name: 'Mock Provider',
                role: 'provider',
                wallet: {
                    create: {
                        balance: 0,
                        currency: 'USD',
                    },
                },
            },
        });
        console.log(`✅ Created provider: ${provider.email}`);
    } else {
        console.log(`ℹ️ Using existing provider: ${provider.email}`);
    }

    // 2. Create products for each category
    for (const category of CATEGORIES) {
        console.log(`📦 Seeding 10 products for category: ${category}...`);

        for (let i = 1; i <= 10; i++) {
            const productName = `Mock ${category.charAt(0).toUpperCase() + category.slice(1)} Product ${i}`;
            const price = (Math.random() * 50 + 5).toFixed(2); // Random price between 5 and 55

            // Create Product
            const product = await prisma.product.create({
                data: {
                    providerId: provider.id,
                    name: productName,
                    description: `This is a mock description for ${productName}. It includes features X, Y, and Z.`,
                    category: category,
                    imageUrl: `https://placehold.co/600x400?text=${category}+${i}`,
                    isActive: true,
                    variants: {
                        create: {
                            name: 'Standard Access',
                            price: parseFloat(price),
                            durationDays: 30,
                            isRenewable: true,
                        },
                    },
                },
            });

            // Create Inventory based on category
            if (['streaming', 'ai', 'netflix', 'spotify', 'hbo', 'disney', 'prime', 'youtube'].includes(category)) {
                // Create Inventory Account
                await prisma.inventoryAccount.create({
                    data: {
                        productId: product.id,
                        email: `account${i}@${category}.com`,
                        passwordHash: 'encrypted_password',
                        platformType: category,
                        totalSlots: 5,
                        availableSlots: 5,
                        slots: {
                            createMany: {
                                data: [
                                    { profileName: 'Profile 1', pinCode: '1111' },
                                    { profileName: 'Profile 2', pinCode: '2222' },
                                    { profileName: 'Profile 3', pinCode: '3333' },
                                    { profileName: 'Profile 4', pinCode: '4444' },
                                    { profileName: 'Profile 5', pinCode: '5555' },
                                ],
                            },
                        },
                    },
                });
            } else if (category === 'license') {
                // Create Inventory License
                await prisma.inventoryLicense.createMany({
                    data: [
                        { productId: product.id, licenseKey: `KEY-${category.toUpperCase()}-${i}-001`, activationType: 'serial' },
                        { productId: product.id, licenseKey: `KEY-${category.toUpperCase()}-${i}-002`, activationType: 'serial' },
                        { productId: product.id, licenseKey: `KEY-${category.toUpperCase()}-${i}-003`, activationType: 'serial' },
                    ],
                });
            } else if (['course', 'ebook', 'other'].includes(category)) {
                // Create Digital Content
                await prisma.digitalContent.create({
                    data: {
                        productId: product.id,
                        contentType: category === 'ebook' ? 'ebook_drive' : 'recorded_iframe',
                        resourceUrl: 'https://example.com/resource',
                        coverImageUrl: `https://placehold.co/400x600?text=Cover+${i}`,
                    },
                });
            }
        }
    }

    console.log('✅ Seeding completed successfully!');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
