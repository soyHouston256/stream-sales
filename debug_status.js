
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProviderStatus() {
    try {
        const email = 'provider3@streamsales.com';
        const user = await prisma.user.findUnique({
            where: { email },
            include: { providerProfile: true }
        });

        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User found:', user.id, user.name);
        if (!user.providerProfile) {
            console.log('No provider profile found for this user');
        } else {
            console.log('Provider Profile:', user.providerProfile);
            console.log('Status value:', `"${user.providerProfile.status}"`); // Quote to see invisible chars
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkProviderStatus();
