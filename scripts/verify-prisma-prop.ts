import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    console.log('Prisma Client keys:', Object.keys(prisma));
    console.log('Has order:', 'order' in prisma);
    // @ts-ignore
    if (prisma.order) {
        console.log('Order delegate exists');
    } else {
        console.log('Order delegate MISSING');
    }
}

main().catch(console.error);
