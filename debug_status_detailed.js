
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProviderStatus() {
    try {
        const email = 'provider3@streamsales.com';
        const user = await prisma.user.findUnique({
            where: { email },
            include: { providerProfile: true }
        });

        console.log('------------------------------------------------');
        if (!user) {
            console.log('❌ User NOT found for email:', email);
            return;
        }

        console.log('✅ User Found:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);

        if (!user.providerProfile) {
            console.log('❌ No ProviderProfile linked to this user!');
        } else {
            console.log('✅ Provider Profile Linked:');
            console.log(`   Profile ID: ${user.providerProfile.id}`);
            console.log(`   Status: "${user.providerProfile.status}"`);
            console.log(`   Approved At: ${user.providerProfile.approvedAt}`);
        }
        console.log('------------------------------------------------');

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkProviderStatus();
