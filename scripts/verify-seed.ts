import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Verifying seeded products...');

    const provider = await prisma.user.findFirst({
        where: { role: 'provider' },
    });

    if (!provider) {
        console.error('❌ No provider found!');
        return;
    }

    console.log(`👤 Provider: ${provider.email} (${provider.id})`);

    const products = await prisma.product.groupBy({
        by: ['category'],
        where: {
            providerId: provider.id,
        },
        _count: {
            id: true,
        },
    });

    console.log('📊 Product Counts by Category:');
    products.forEach((p) => {
        console.log(`   - ${p.category}: ${p._count.id} products`);
    });

    const totalProducts = products.reduce((acc, curr) => acc + curr._count.id, 0);
    console.log(`\n✅ Total Products: ${totalProducts}`);
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
