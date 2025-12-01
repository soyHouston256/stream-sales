import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Testing Marketplace Query...');

    const where: any = {
        isActive: true,
    };

    // Simulate price filter
    // where.variants = { some: { price: { lte: 100 } } };

    const products = await prisma.product.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            provider: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            variants: {
                take: 1,
                orderBy: { price: 'asc' },
            },
        },
    });

    console.log(`✅ Found ${products.length} products.`);
    if (products.length > 0) {
        const p = products[0];
        console.log('Sample Product:', {
            name: p.name,
            provider: p.provider.email,
            price: p.variants[0]?.price.toString(),
        });
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Query Failed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
