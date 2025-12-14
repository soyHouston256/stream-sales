
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'provider@streamsales.com';
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword },
        });
        console.log(`Password reset for user: ${user.email}`);
    } catch (error) {
        if (error.code === 'P2025') {
            console.log('User not found, creating...');
            // Create user if not exists (minimal fields)
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: 'Provider Test',
                    role: 'provider',
                    status: 'active', // Ensure active
                }
            });

            // Also ensure providerProfile exists
            await prisma.providerProfile.create({
                data: {
                    userId: user.id,
                    status: 'approved', // CRITICAL: Must be approved
                    companyName: 'Stream Sales Provider',
                    description: 'Test Provider',
                }
            })
            console.log(`User created: ${user.email}`);
        } else {
            console.error('Error resetting password:', error);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
